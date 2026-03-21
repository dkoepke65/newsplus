# 📰 Newsplus

AI-powered news reader with smart article summaries.

## Features

- Aggregates top news from Reddit (r/worldnews, r/news)
- AI-powered article summaries with TL;DR, key points, and takeaways
- Clean, modern UI with preview images
- Mobile-responsive design

## Deployment

### Deploy to Render.com (Free)

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Render account** at https://render.com

3. **New Web Service** → Connect your GitHub repo

4. **Configure:**
   - Name: `newsplus`
   - Environment: `Node`
   - Build Command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
   - Start Command: `node backend/server.js`
   - Plan: Free

5. **Deploy!** Render will give you a URL like `https://newsplus.onrender.com`

### Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Build frontend
cd ../frontend && npm run build

# Start backend (serves frontend too)
cd ../backend && npm start
```

The app will be available at http://localhost:3002

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **APIs:** Reddit (news), Jina AI (article extraction)
- **Hosting:** Render.com (free tier)