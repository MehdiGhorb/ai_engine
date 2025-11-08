import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const RUNWARE_API_URL = 'https://api.runware.ai/v1';
const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

const MOVEMENTS = {
  'walk-forward': `
Full body. Use the uploaded image as the exact character reference (keep clothing, hair and colors).
Camera: positioned behind the character at a fixed offset (no zoom, no rotation). The camera may track to keep the character centered but must keep the same distance and orientation throughout.
Action: character walks FORWARD away from the camera continuously in a smooth looping walk cycle. The character must NOT turn, pivot, rotate, or look toward the camera at any time.
Constraints: no additional background elements, no shadows or special effects, do not crop or alter the character's clothing.
`.trim(),

  'walk-backward': `
Full body. Use the uploaded image as the exact character reference (keep clothing, hair and colors).
Camera: positioned in front of the character at a fixed offset (no zoom, no rotation). The camera may track to keep the character centered but must keep the same distance and orientation throughout.
Action: character walks BACKWARD toward the camera continuously in a smooth looping backward walk cycle while still facing the camera. The character must NOT turn, pivot, or rotate away from the forward-facing orientation.
Constraints: no additional background elements, no shadows or special effects, do not crop or alter the character's clothing.
`.trim(),

  'walk-left': `
Full body. Use the uploaded image as the exact character reference (keep clothing, hair and colors).
Camera: placed at the character's LEFT side in a perfect side-profile (fixed offset, no tilt, no rotation, no zoom). The camera may track horizontally to keep the character centered but must maintain the same relative offset.
Action: character faces LEFT and walks continuously LEFTWARD (i.e., moves from the right side of the frame toward the left) in a smooth looping side walk cycle. The character must NOT turn, look at the camera, pivot, or reverse direction.
Constraints: no additional background elements, no shadows or special effects, do not crop or alter the character's clothing.
`.trim(),

  'walk-right': `
Full body. Use the uploaded image as the exact character reference (keep clothing, hair and colors).
Camera: placed at the character's RIGHT side in a perfect side-profile (fixed offset, no tilt, no rotation, no zoom). The camera may track horizontally to keep the character centered but must maintain the same relative offset.
Action: character faces RIGHT and walks continuously RIGHTWARD (i.e., moves from the left side of the frame toward the right) in a smooth looping side walk cycle. The character must NOT turn, look at the camera, pivot, or reverse direction.
Constraints: no additional background elements, no shadows or special effects, do not crop or alter the character's clothing.
`.trim(),

  'jump': `
Full body. Use the uploaded image as the exact character reference (keep clothing, hair and colors).
Camera: front view at a fixed offset (no zoom, no rotation). The camera must not move or track.
Action: character performs a simple vertical jump repeatedly in a smooth looping motion. The character should bend knees slightly before jumping and land softly, returning to the starting position each time. No horizontal movement or rotation.
Constraints: no additional background elements, no shadows or special effects, do not crop or alter the character's clothing.
`.trim(),

  'idle': `
Full body. Use the uploaded image as the exact character reference (keep clothing, hair and colors).
Camera: front view at a fixed offset (no zoom, no rotation). The camera must not move or track.
Action: character stands perfectly still in neutral pose; only minimal chest/shoulder breathing allowed. No foot movement, no head turns, no weight shifts.
Constraints: no additional background elements, no shadows or special effects, do not crop or alter the character's clothing.
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
      const duration = 8.0;
      
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
