#!/bin/bash

echo "🔍 Checking AI Game Engine Setup..."
echo ""

# Check if Node.js is installed
if command -v node &> /dev/null
then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is installed: $NODE_VERSION"
else
    echo "❌ Node.js is NOT installed"
    echo "   Please install from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if command -v npm &> /dev/null
then
    NPM_VERSION=$(npm --version)
    echo "✅ npm is installed: $NPM_VERSION"
else
    echo "❌ npm is NOT installed"
    exit 1
fi

echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies are installed"
else
    echo "⚠️  Dependencies are NOT installed"
    echo "   Run: npm install"
    exit 1
fi

echo ""

# Check if .env.local exists and has API key
if [ -f ".env.local" ]; then
    if grep -q "your_runware_api_key_here" .env.local; then
        echo "⚠️  API key not configured in .env.local"
        echo "   Please add your Runware API key"
    else
        echo "✅ API key is configured"
    fi
else
    echo "❌ .env.local file not found"
    exit 1
fi

echo ""
echo "🎉 Setup verification complete!"
echo ""
echo "To start the application, run:"
echo "   npm run dev"
echo ""
echo "Then open: http://localhost:3000"
