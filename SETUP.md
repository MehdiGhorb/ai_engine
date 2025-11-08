# Quick Setup Guide

## 🚀 Getting Started (3 Steps)

### Step 1: Install Node.js

If you don't have Node.js installed, download and install it from:
**https://nodejs.org/** (Download the LTS version)

Verify installation:
```bash
node --version
npm --version
```

### Step 2: Install Project Dependencies

Open Terminal in the project folder and run:
```bash
npm install
```

This will install all required packages (~2-5 minutes).

### Step 3: Add Your API Key

1. Open the `.env.local` file
2. Replace `your_runware_api_key_here` with your actual Runware API key
3. Save the file

### Step 4: Run the App

```bash
npm run dev
```

Open your browser and go to: **http://localhost:3000**

---

## 🎮 How to Use

1. Click **"Select Image"** and upload your starting image
2. Click **"Generate Sequence"** (this takes 5-10 minutes)
3. Once complete, use keyboard controls:
   - **W** = Move forward
   - **S** = Move backward

---

## ⚠️ Important Notes

- Generation creates 100 images (~10 second sequence)
- Each image shows 50ms forward in time
- Keep the browser tab open during generation
- Images are stored temporarily in `public/generated/`
- You need a valid Runware API key with sufficient credits

---

## 🆘 Troubleshooting

**"npm: command not found"**
→ Install Node.js from https://nodejs.org/

**Generation fails**
→ Check your API key in `.env.local`
→ Ensure you have API credits

**Port already in use**
→ Run: `npm run dev -- -p 3001` (uses port 3001 instead)

---

## 📧 Need Help?

- Check the full README.md for detailed documentation
- Verify your Runware API key is valid
- Check the browser console for errors (F12)
