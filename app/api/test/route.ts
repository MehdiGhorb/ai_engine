import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomUUID } from 'crypto';

const RUNWARE_API_URL = 'https://api.runware.ai/v1';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.RUNWARE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Runware API key not configured' },
        { status: 500 }
      );
    }

    // Test with a simple text-to-image request using Runware's correct format
    const response = await axios.post(
      RUNWARE_API_URL,
      [
        {
          taskType: 'imageInference',
          taskUUID: randomUUID(), // Generate proper UUIDv4
          positivePrompt: 'a beautiful sunset over mountains, photorealistic, detailed',
          model: 'runware:100@1', // Using runware's basic model
          numberResults: 1,
          height: 512,
          width: 512,
        }
      ],
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'API connection successful',
      response: response.data,
    });

  } catch (error: any) {
    console.error('API Test Error:', error.response?.data || error.message);
    
    return NextResponse.json(
      {
        error: 'API test failed',
        details: error.response?.data || error.message,
        status: error.response?.status,
      },
      { status: 500 }
    );
  }
}
