#!/bin/bash

# Shoesfast Frontend Deployment Script
# Usage: bash deploy.sh

echo "🚀 Starting Shoesfast Frontend Deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    exit 1
fi

# Copy production environment
echo "📝 Setting up production environment..."
cp .env.production .env.local

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build production (static export)
echo "🏗️  Generating static files..."
npm run generate

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Static generation complete!"
echo "📁 Static files ready in: out/"

# Note: No PM2 needed for static export
# Files in 'out/' folder ready to be served by Nginx/Apache

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Static files generated in out/ folder"
echo "  2. Configure Nginx to serve from out/ folder"
echo "  3. Setup SSL certificate"
echo "  4. Test frontend: https://app-v2.shoesfast.id"
echo "  5. Test login functionality"
echo ""
echo "📁 Static files location: $(pwd)/out/"
echo "🌐 Frontend URL: https://app-v2.shoesfast.id"
echo "🌐 Backend URL: https://systems.shoesfast.id"
echo "📖 For more info, see DEPLOYMENT.md"
