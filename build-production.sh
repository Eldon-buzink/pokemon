#!/bin/bash

# Production Build Script
echo "🚀 Building Pokemon Card Tracker for Production"
echo "=============================================="

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Check build output
if [ -d "out" ]; then
    echo "✅ Build successful! Output in 'out' directory"
    echo "📊 Build size:"
    du -sh out/
else
    echo "❌ Build failed - no output directory found"
    exit 1
fi

echo "🎉 Production build complete!"
echo "📋 Next steps:"
echo "1. Deploy to your hosting platform (Vercel, Netlify, etc.)"
echo "2. Set environment variables in your hosting platform"
echo "3. Configure custom domain if needed"
echo "4. Set up monitoring and analytics"
