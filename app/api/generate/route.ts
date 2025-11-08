import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const RUNWARE_API_URL = 'https://api.runware.ai/v1';
const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

const MOVEMENTS = {
  'walk-forward': `
One character. Full body visible.
Character walks straight forward continuously.
Camera is behind the character and follows them.
Camera distance from character is fixed and does not change at any time.
Background: solid black, make sure you don't generate any backgrounds by yourself.
  `.trim(),

  'walk-backward': `
One character. Full body visible.
Character walks straight forward continuously.
Camera is in front of the character, facing them.
Camera moves to maintain the same fixed distance for the entire video.
Background: solid black, make sure you don't generate any backgrounds by yourself.
  `.trim(),

  'walk-left': `
One character. Full body visible.
Character walks straight forward continuously. Do not rotate the character.
Camera stays on the character’s left side, following them.
Camera distance remains exactly constant from start to end.
Background: solid black, make sure you don't generate any backgrounds by yourself.
  `.trim(),

  'walk-right': `
One character. Full body visible.
Character walks straight forward continuously. Do not rotate the character.
Camera stays on the character’s right side, following them.
Camera distance remains exactly constant from start to end.
Background: solid black, make sure you don't generate any backgrounds by yourself.
  `.trim(),

  'idle': `
One character. Full body visible.
Character stands still with minimal breathing.
Camera faces character and stays at one fixed distance the entire time.
Background: solid black, make sure you don't generate any backgrounds by yourself.
  `.trim(),
};



// Generate multiple movement videos from uploaded image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    const runwareApiKey = process.env.RUNWARE_API_KEY;
    const removebgApiKey = process.env.REMOVEBG_API_KEY;
    
    if (!runwareApiKey || !removebgApiKey) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    console.log('Step 1: Removing background from image...');

    // Step 1: Remove background using remove.bg API
    const imageBytes = await file.arrayBuffer();
    const imageBuffer = Buffer.from(imageBytes);
    
    const removebgFormData = new FormData();
    removebgFormData.append('image_file', new Blob([imageBuffer]), file.name);
    removebgFormData.append('size', 'auto');
    
    const removebgResponse = await axios.post(REMOVEBG_API_URL, removebgFormData, {
      headers: {
        'X-Api-Key': removebgApiKey,
      },
      responseType: 'arraybuffer',
    });

    console.log('✅ Background removed successfully!');
    console.log('Step 2: Resizing image to 1120x832...');

    // Step 2: Resize the image to 1280x720 (OpenAI model)
    const noBgBuffer = Buffer.from(removebgResponse.data);
    const resizedBuffer = await sharp(noBgBuffer)
      .resize(1120, 832, {
        fit: 'contain', // Maintain aspect ratio, add padding if needed
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent padding
      })
      .png()
      .toBuffer();
    
    const mimeType = 'image/png';
    const base64Image = `data:${mimeType};base64,${resizedBuffer.toString('base64')}`;

    console.log('✅ Image resized successfully!');
    console.log('Step 3: Generating 5 looping movement videos...');

    // Step 3: Generate 5 simple looping videos in parallel
    const videoTasks = Object.entries(MOVEMENTS).map(([direction, prompt]) => {
      const taskUUID = randomUUID();
      
      // All videos are 3 seconds for seamless looping
      const duration = 4.0;
      
      return axios.post(
        RUNWARE_API_URL,
        [
          {
            taskType: 'videoInference',
            taskUUID: taskUUID,
            model: 'bytedance:1@1',
            positivePrompt: prompt,
            width: 1120,
            height: 832,
            frameImages: [
              {
                inputImage: base64Image, // Use background-removed image
                frame: 'first',
              }
            ],
            duration: duration,
            fps: 24,
            deliveryMethod: 'async',
          }
        ],
        {
          headers: {
            'Authorization': `Bearer ${runwareApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      ).then(response => ({
        direction,
        taskUUID,
        success: true,
      })).catch(error => {
        console.error(`Error generating ${direction}:`, JSON.stringify(error.response?.data || error.message, null, 2));
        return {
          direction,
          taskUUID,
          success: false,
          error: error.response?.data || error.message,
        };
      });
    });

    // Wait for all submissions
    const results = await Promise.all(videoTasks);
    
    console.log('All video generation tasks submitted:', results);

    // Return all taskUUIDs
    return NextResponse.json({
      success: true,
      videos: results,
      message: 'All movement videos generation started.',
    });

  } catch (error: any) {
    console.error('Error in generate API:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to generate movement videos' },
      { status: 500 }
    );
  }
}

// Poll for video generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskUUID = searchParams.get('taskUUID');

    if (!taskUUID) {
      return NextResponse.json(
        { error: 'taskUUID required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RUNWARE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Runware API key not configured' },
        { status: 500 }
      );
    }

    // Poll Runware API for task status
    const response = await axios.post(
      RUNWARE_API_URL,
      [
        {
          taskType: 'getResponse',
          taskUUID: taskUUID,
        }
      ],
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('Status check response:', response.data);

    const result = response.data?.data?.[0];
    
    if (!result) {
      return NextResponse.json({
        status: 'processing',
        message: 'Video is still being generated...',
      });
    }

    if (result.status === 'processing') {
      return NextResponse.json({
        status: 'processing',
        message: 'Video is still being generated...',
      });
    }

    if (result.videoURL) {
      return NextResponse.json({
        status: 'success',
        videoURL: result.videoURL,
        message: 'Video generated successfully!',
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Video generation failed',
    });

  } catch (error: any) {
    console.error('Error checking status:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to check video status' },
      { status: 500 }
    );
  }
}
