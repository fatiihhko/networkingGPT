#!/bin/bash

echo "🚀 NetworkingGPT Production Deployment Script"
echo "=============================================="

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Check if dist directory exists
if [ -d "dist" ]; then
    echo "📁 Build output found in dist/"
    echo "📊 Build size:"
    du -sh dist/
else
    echo "❌ Build output not found!"
    exit 1
fi

echo ""
echo "🎯 Deployment Options:"
echo "1. Deploy to Vercel (recommended for networkgpt.tech)"
echo "2. Deploy to Netlify"
echo "3. Manual deployment (copy dist/ contents)"
echo ""
read -p "Choose deployment option (1-3): " choice

case $choice in
    1)
        echo "🚀 Deploying to Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod
        else
            echo "❌ Vercel CLI not found. Please install with: npm i -g vercel"
            echo "📝 Or deploy manually at: https://vercel.com"
        fi
        ;;
    2)
        echo "🚀 Deploying to Netlify..."
        if command -v netlify &> /dev/null; then
            netlify deploy --prod --dir=dist
        else
            echo "❌ Netlify CLI not found. Please install with: npm i -g netlify-cli"
            echo "📝 Or deploy manually at: https://netlify.com"
        fi
        ;;
    3)
        echo "📋 Manual deployment instructions:"
        echo "1. Copy contents of dist/ to your web server"
        echo "2. Ensure your server serves index.html for all routes"
        echo "3. Configure environment variables if needed"
        echo ""
        echo "📁 Files to deploy:"
        ls -la dist/
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process completed!"
echo "🔗 Your app should be available at your deployment URL"
echo "📧 Davet linkleri artık /invite-link/ formatında çalışacak"
