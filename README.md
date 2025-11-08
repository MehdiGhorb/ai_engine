# AI Game Engine

Transform your images into interactive first-person experiences using AI-generated image sequences.

## Overview

This application uses the Runware API to generate a sequence of 100 images, each representing 50ms forward movement in time. The result is an interactive "game-like" experience where you can move forward and backward through the generated sequence using keyboard controls.

## Features

- 🖼️ Upload an initial image
- 🤖 AI-powered sequential image generation (100 frames for ~10 seconds)
- 🎮 First-person game-like controls (W/S keys)
- ⚡ Built with Next.js 14 and TypeScript
- 🎨 Modern, minimal UI with Tailwind CSS

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- A **Runware API key** - [Get one here](https://runware.ai/)

## Setup Instructions

### 1. Install Node.js and npm

If you don't have Node.js installed:

**macOS (using Homebrew):**
```bash
brew install node
```

**Or download directly from:** https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Install Dependencies

Navigate to the project directory and install all required packages:

```bash
cd /Users/mehdi/Desktop/ai_engine
npm install
```

### 3. Configure API Key

Open the `.env.local` file and add your Runware API key:

```env
RUNWARE_API_KEY=your_actual_api_key_here
```

### 4. Run the Application

Start the development server:

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## How to Use

1. **Upload an Image**: Click "Select Image" and choose your starting image
2. **Generate Sequence**: Click "Generate Sequence" to create 100 AI-generated frames
3. **Wait**: The generation process takes several minutes (approximately 2-10 minutes depending on API speed)
4. **Navigate**: Once complete, use keyboard controls:
   - Press **W** to move forward through frames
   - Press **S** to move backward through frames

## Project Structure

```
ai_engine/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # API endpoint for image generation
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page component
├── public/
│   └── generated/                # Temporary storage for generated images
├── .env.local                    # Environment variables (API key)
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── next.config.js                # Next.js configuration
```

## How It Works

1. **Image Upload**: User uploads an initial image
2. **Sequential Generation**: The backend calls Runware API 100 times:
   - Each generation uses the previous image as input
   - Prompt instructs AI to show the scene 50ms forward in time
   - Emphasizes maintaining consistency and realistic forward movement
3. **Storage**: Images are saved temporarily in `public/generated/[sessionId]/`
4. **Playback**: Frontend displays images based on current frame index
5. **Controls**: Keyboard events increment/decrement the frame index

## API Integration

The app uses the Runware API with the following key parameters:

- **Model**: `runware:100@1`
- **Strength**: `0.35` (low strength maintains consistency)
- **Steps**: `25`
- **Resolution**: `512x512`
- **Prompt**: Emphasizes forward movement and consistency
- **Negative Prompt**: Prevents hallucinations and scene changes

## Performance Considerations

- **Generation Time**: ~100-600 seconds (depends on API response time)
- **API Calls**: 100 sequential calls (one per frame)
- **Rate Limiting**: Built-in 100ms delay between calls
- **Storage**: Images stored temporarily and can be cleared manually

## Troubleshooting

### "Cannot find module" errors
Run `npm install` to ensure all dependencies are installed.

### API Key not working
- Verify your Runware API key is correct in `.env.local`
- Ensure the file is named `.env.local` (not `.env`)
- Restart the development server after changing `.env.local`

### Generation fails or times out
- Check your internet connection
- Verify your Runware API account has sufficient credits
- Check the browser console and terminal for error messages

### Images not displaying
- Ensure the `public/generated` directory exists
- Check file permissions
- Verify the generation completed successfully

## Cleaning Up

To remove generated images and save disk space:

```bash
rm -rf public/generated/*
```

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Runware API**: AI image generation
- **Axios**: HTTP client
- **Sharp**: Image processing

## Future Enhancements

- [ ] Add video export functionality
- [ ] Support for custom prompts/directions
- [ ] Adjustable playback speed
- [ ] Save/load sequences
- [ ] Multi-directional movement (left/right)
- [ ] Higher resolution options
- [ ] Real-time streaming generation

## License

MIT

## Support

For issues with:
- **This application**: Check the GitHub repository
- **Runware API**: Visit [Runware Documentation](https://docs.runware.ai/)
- **Next.js**: Visit [Next.js Documentation](https://nextjs.org/docs)
