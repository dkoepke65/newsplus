#!/bin/bash

echo "🚀 Newsplus Deployment Script"
echo ""
echo "This will deploy Newsplus to Render.com"
echo ""

# Check if git is configured
if [ -z "$(git config --global user.email)" ]; then
    echo "⚠️  Git user email not set. Please configure git first:"
    echo "   git config --global user.email \"your@email.com\""
    echo "   git config --global user.name \"Your Name\""
    exit 1
fi

# Create GitHub repo
echo "📦 Preparing deployment package..."

# Remove node_modules from git (we added them earlier but shouldn't push them)
git rm -r --cached backend/node_modules frontend/node_modules 2>/dev/null || true

# Add all source files
git add .

# Commit
git commit -m "Initial Newsplus deployment"

echo ""
echo "✅ Code committed locally!"
echo ""
echo "📋 Next steps to complete deployment:"
echo ""
echo "1. Create a GitHub repository:"
echo "   - Go to https://github.com/new"
echo "   - Name it 'newsplus'"
echo "   - Make it public"
echo "   - Click 'Create repository'"
echo ""
echo "2. Run these commands:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/newsplus.git"
echo "   git push -u origin main"
echo ""
echo "3. Deploy on Render:"
echo "   - Go to https://dashboard.render.com"
echo "   - Click 'New +' → 'Web Service'"
echo "   - Connect your GitHub repo"
echo "   - The render.yaml file will auto-configure everything"
echo "   - Click 'Create Web Service'"
echo ""
echo "4. Get your URL!"
echo ""
echo "The app will be live at: https://newsplus-XXXX.onrender.com"