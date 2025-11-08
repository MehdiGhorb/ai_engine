# Implementation Notes

## Project Overview

This is an AI-powered "game engine" that converts a single image into an interactive first-person experience by generating 100 sequential frames using the Runware API.

## Key Features Implemented

### 1. Image Upload & Processing
- User uploads an initial image via the frontend
- Image is converted to base64 and sent to the backend
- Saved as frame 0 in the sequence

### 2. Sequential Image Generation
- **Total Frames**: 100 images
- **Time Representation**: Each frame = 50ms forward in time
- **Total Duration**: ~5 seconds (100 frames × 50ms)
- **API**: Runware AI image generation
- **Model**: runware:100@1
- **Parameters**:
  - Strength: 0.35 (low to maintain consistency)
  - Steps: 25
  - Resolution: 512×512px
  - Output: PNG format

### 3. Prompt Engineering
Each generation uses this prompt:
```
This is a first-person view from a video game. Show exactly what this scene 
would look like 50 milliseconds in the future as the camera moves forward at 
walking speed. Maintain the same camera angle facing forward, keep all objects 
and context consistent and realistic. Only show subtle forward movement, as if 
walking in a first-person shooter game like Call of Duty. Keep the scene 
photorealistic and maintain exact lighting, colors, and atmosphere.
```

**Negative Prompt** (to prevent hallucinations):
```
blurry, distorted, unrealistic, warped, inconsistent, teleporting, jumping, 
changing objects, different scene, hallucination
```

### 4. Keyboard Controls
- **W Key**: Move forward (increment frame index)
- **S Key**: Move backward (decrement frame index)
- Both keys prevent going out of bounds (0 to 99)

### 5. Storage System
- Images stored in: `public/generated/[sessionId]/[frameNumber].png`
- Session ID: Unix timestamp for uniqueness
- Temporary storage (can be cleaned up manually)

### 6. Frontend Features
- Modern gradient background (slate-900 to purple-900)
- Real-time progress indicator during generation
- Frame counter showing current position
- Visual progress bar for navigation
- Responsive grid layout
- Glass-morphism UI elements

## Technical Architecture

### Backend (`/app/api/generate/route.ts`)
- Next.js API route handler
- Handles file upload and multipart form data
- Sequential API calls to Runware (100 iterations)
- Image storage in filesystem
- Error handling and retry logic
- Progress tracking via frame counting

### Frontend (`/app/page.tsx`)
- React component with hooks (useState, useEffect, useRef)
- File upload with preview
- Real-time progress updates
- Keyboard event listeners
- Image display with frame switching
- Responsive UI with Tailwind CSS

## Performance Considerations

### Generation Time
- ~1-6 minutes total (depends on Runware API speed)
- 100 API calls at ~0.5-3 seconds each
- 100ms delay between calls to avoid rate limiting

### Rate Limiting
- Built-in 100ms delay between API calls
- Can be adjusted if needed
- Timeout set to 60 seconds per call

### Storage
- Each image: ~50-500KB (depending on complexity)
- Total per sequence: ~5-50MB
- Automatically namespaced by session ID

## API Integration Details

### Runware API Endpoint
```
POST https://api.runware.ai/v1
```

### Request Format
```json
[
  {
    "taskType": "imageInference",
    "taskUUID": "{sessionId}-{frameNumber}",
    "positivePrompt": "...",
    "negativePrompt": "...",
    "model": "runware:100@1",
    "numberResults": 1,
    "height": 512,
    "width": 512,
    "outputFormat": "PNG",
    "inputImage": "{base64Image}",
    "strength": 0.35,
    "steps": 25
  }
]
```

### Response Format
```json
[
  {
    "imageURL": "https://...",
    "taskUUID": "...",
    ...
  }
]
```

## Environment Variables

### `.env.local`
```
RUNWARE_API_KEY=your_runware_api_key_here
```

- Must be in `.env.local` (not `.env`)
- Next.js automatically loads this file
- Only accessible on the server side (secure)

## File Structure

```
ai_engine/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts       # Backend API endpoint
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main UI component
├── public/
│   └── generated/             # Generated images storage
│       └── .gitkeep           # Ensures directory exists in git
├── .env.local                 # Environment variables (not in git)
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript config
├── tailwind.config.js         # Tailwind CSS config
├── postcss.config.js          # PostCSS config
├── next.config.js             # Next.js config
├── .eslintrc.json             # ESLint config
├── README.md                  # Full documentation
├── SETUP.md                   # Quick setup guide
├── cleanup.sh                 # Cleanup script
└── check-setup.sh             # Setup verification script
```

## Known Limitations

1. **Generation Time**: Takes several minutes (unavoidable with 100 sequential API calls)
2. **Consistency**: AI may introduce slight variations despite prompts
3. **Resolution**: Limited to 512×512 for performance
4. **Storage**: Images not automatically deleted (manual cleanup required)
5. **No Streaming**: User must wait for all 100 frames to complete

## Future Improvements

### Short Term
- [ ] Real-time progress streaming (Server-Sent Events)
- [ ] Pause/resume generation
- [ ] Adjustable frame count and duration
- [ ] Higher resolution options

### Medium Term
- [ ] Export as MP4 video file
- [ ] Custom prompt input
- [ ] Left/right movement options
- [ ] Adjustable playback speed
- [ ] Frame caching and compression

### Long Term
- [ ] Multi-user support with database
- [ ] Cloud storage integration
- [ ] Real-time collaborative viewing
- [ ] VR/AR support
- [ ] GPU-accelerated video encoding

## Debugging Tips

### Check API Calls
- Open browser DevTools → Network tab
- Look for POST to `/api/generate`
- Check request payload and response

### Check Server Logs
- Terminal running `npm run dev`
- Shows generation progress: "Generated frame X/100"
- Shows errors if API calls fail

### Check Generated Images
- Navigate to `public/generated/[sessionId]/`
- Verify images are being created
- Check file sizes and content

### Common Errors
1. **"API key not configured"**: Check `.env.local` file
2. **"Failed to generate"**: Check API credits and internet connection
3. **Images not displaying**: Check browser console for CORS or 404 errors
4. **Keyboard not working**: Ensure sequence is fully generated

## Security Considerations

- API key stored in `.env.local` (server-side only)
- Never exposed to client browser
- File uploads validated for image types
- No user authentication (add if deploying publicly)
- Generated images accessible via public URL (consider adding session validation)

## Deployment Notes

### Not included in current implementation:
- Production build optimization
- CDN for image serving
- Database for persistent storage
- User authentication
- Rate limiting per user

### For production deployment, consider:
1. Move image storage to S3/CloudFlare R2
2. Add user authentication
3. Implement proper rate limiting
4. Add image cleanup cron jobs
5. Optimize images (compression, WebP format)
6. Add proper error tracking (Sentry)
7. Implement usage analytics

## Testing Checklist

- [ ] Upload various image types (JPG, PNG, WebP)
- [ ] Test with different image sizes
- [ ] Verify all 100 frames generate
- [ ] Test W/S keyboard controls
- [ ] Check progress indicator updates
- [ ] Verify images display correctly
- [ ] Test error handling (wrong API key)
- [ ] Check generated folder structure
- [ ] Verify cleanup script works
- [ ] Test on different browsers

## Performance Benchmarks

### Expected Performance:
- **Upload**: Instant (<1s)
- **Single Frame Generation**: 0.5-3s
- **Total Generation**: 50-300s (1-5 minutes)
- **Frame Switching**: <100ms
- **Memory Usage**: ~200-500MB during generation
- **Disk Space**: ~5-50MB per sequence

## Credits & Acknowledgments

- **Runware AI**: Image generation API
- **Next.js**: React framework
- **Tailwind CSS**: Styling framework
- **Vercel**: Next.js development team
