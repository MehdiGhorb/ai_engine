# Troubleshooting Guide

## Current Issue

The Runware API is returning a 400 Bad Request error. This means the API request format or parameters are incorrect.

## What We Know

1. ✅ API key is configured correctly
2. ✅ Connection to Runware API is working
3. ❌ The request format or model parameters are incorrect

## Steps to Fix

### 1. Test the API Connection

First, let's test if the API works at all:

```bash
# Open your browser and go to:
http://localhost:3000/api/test
```

This will test a simple text-to-image generation. If this fails, we know there's an issue with the API key or Runware account.

### 2. Check Runware API Documentation

The error suggests one of these issues:

- **Model not available**: `civitai:4384@78308` might not be accessible with your API plan
- **Missing parameters**: Some required parameters might be missing
- **Wrong API endpoint**: The endpoint might have changed
- **Image-to-image not supported**: Runware might not support img2img in this way

### 3. Alternative Solutions

If Runware doesn't support image-to-image generation properly, we have options:

**Option A: Use Text-to-Image with Descriptive Prompts**
- Generate each frame based on a detailed description
- Less consistency but works with basic API

**Option B: Use a Different AI Service**
- Replicate API (supports img2img well)
- Stability AI
- OpenAI DALL-E 3

**Option C: Simplify the Approach**
- Generate fewer frames (e.g., 20 instead of 100)
- Use simpler models
- Use text-only prompts

## Quick Fix to Try

I've created a test endpoint. Please:

1. Make sure the dev server is running: `npm run dev`
2. Open your browser to: `http://localhost:3000/api/test`
3. Check the response - it will tell us if the API works at all

## Common Runware API Issues

### Issue: "Bad Request" (400)
**Causes:**
- Wrong model name
- Missing required parameters
- Image data too large
- Unsupported features

**Solutions:**
- Use a different model (try: `runware:100@1` or `civitai:4201@130072`)
- Reduce image size
- Check Runware docs for supported parameters

### Issue: "Unauthorized" (401)
**Causes:**
- Invalid API key
- API key not activated
- Insufficient credits

**Solutions:**
- Check API key in `.env.local`
- Verify account has credits
- Restart dev server after changing `.env.local`

### Issue: "Rate Limited" (429)
**Causes:**
- Too many requests
- API plan limits exceeded

**Solutions:**
- Add longer delays between requests
- Reduce number of frames
- Upgrade API plan

## Debugging Steps

1. **Check API Test Endpoint**
   ```
   Visit: http://localhost:3000/api/test
   ```

2. **Check Server Logs**
   Look in the terminal for error messages

3. **Check Browser Console**
   Press F12 and look for errors

4. **Verify API Key**
   - Log into Runware dashboard
   - Check if API key is active
   - Check if you have credits

## Next Steps

Based on the test endpoint result:

### If Test Succeeds:
The API works! We just need to fix the image-to-image parameters.

### If Test Fails:
There's an issue with the API key or Runware account:
1. Check your Runware account
2. Verify you have credits
3. Try regenerating the API key

## Contact Information

- **Runware Docs**: https://docs.runware.ai/
- **Runware Support**: Check their website for support options
- **API Status**: Check if Runware services are operational

## Temporary Workaround

For now, you can:
1. Use the uploaded image only (no generation)
2. Test with fewer frames (e.g., 5-10)
3. Try a different AI service

Let me know what the test endpoint returns, and I can help fix the specific issue!
