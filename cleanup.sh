#!/bin/bash

# Script to clean up generated images

echo "🧹 Cleaning up generated images..."

GENERATED_DIR="public/generated"

if [ -d "$GENERATED_DIR" ]; then
    rm -rf "$GENERATED_DIR"/*
    echo "✅ Cleaned up generated images directory"
    echo "📊 Disk space freed"
else
    echo "⚠️  Generated directory not found"
fi

echo "✨ Cleanup complete!"
