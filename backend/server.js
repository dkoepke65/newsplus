import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// Cache for Reddit posts (to avoid rate limiting)
let cache = {
  worldnews: { data: null, timestamp: 0 },
  news: { data: null, timestamp: 0 }
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch posts from a subreddit
async function fetchSubreddit(subreddit) {
  const now = Date.now();
  
  // Return cached data if fresh
  if (cache[subreddit].data && (now - cache[subreddit].timestamp) < CACHE_DURATION) {
    console.log(`Returning cached data for r/${subreddit}`);
    return cache[subreddit].data;
  }
  
  try {
    // Reddit's public JSON API (no auth required for read-only)
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=25`, {
      headers: {
        'User-Agent': 'Newsplus/1.0 (Web App)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform and filter posts
    const posts = data.data.children
      .filter(post => !post.data.stickied) // Remove sticky posts
      .map(post => {
        // Get the best available image
        let imageUrl = null;
        
        // Try preview images first (higher quality)
        if (post.data.preview?.images?.[0]?.source?.url) {
          imageUrl = post.data.preview.images[0].source.url.replace(/&amp;/g, '&');
        } else if (post.data.thumbnail && post.data.thumbnail.startsWith('http')) {
          // Fallback to thumbnail if it's a valid URL
          imageUrl = post.data.thumbnail;
        }
        
        return {
          id: post.data.id,
          title: post.data.title,
          url: post.data.url,
          permalink: `https://reddit.com${post.data.permalink}`,
          thumbnail: imageUrl,
          score: post.data.score,
          numComments: post.data.num_comments,
          author: post.data.author,
          subreddit: post.data.subreddit,
          created: post.data.created_utc,
          isVideo: post.data.is_video,
          domain: post.data.domain
        };
      });
    
    // Cache the results
    cache[subreddit] = { data: posts, timestamp: now };
    
    return posts;
  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error);
    // Return cached data even if stale, or empty array
    return cache[subreddit].data || [];
  }
}

// API Routes
app.get('/api/news', async (req, res) => {
  try {
    const [worldnews, news] = await Promise.all([
      fetchSubreddit('worldnews'),
      fetchSubreddit('news')
    ]);
    
    // Combine and sort by score
    const allPosts = [...worldnews, ...news].sort((a, b) => b.score - a.score);
    
    res.json({
      posts: allPosts,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.get('/api/news/:subreddit', async (req, res) => {
  try {
    const { subreddit } = req.params;
    const posts = await fetchSubreddit(subreddit);
    
    res.json({
      posts,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching r/${req.params.subreddit}:`, error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Extract and summarize article
app.get('/api/summarize', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  
  try {
    // Step 1: Extract article text using jina.ai
    const cleanUrl = url.replace(/^https?:\/\//, '');
    const extractResponse = await fetch(`https://r.jina.ai/http://${cleanUrl}`, {
      headers: { 'User-Agent': 'Newsplus/1.0' }
    });
    
    if (!extractResponse.ok) {
      throw new Error('Failed to extract article');
    }
    
    const articleText = await extractResponse.text();
    
    // Step 2: Generate AI summary using simple extractive approach
    // Split into sentences and paragraphs
    const sentences = articleText
      .replace(/([.!?])\s+/g, "$1|")
      .split("|")
      .filter(s => s.trim().length > 20 && s.trim().length < 300);
    
    // Simple scoring: longer sentences with more content words score higher
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.trim().split(/\s+/);
      const contentWords = words.filter(w => w.length > 4).length;
      const score = contentWords / words.length;
      return { sentence: sentence.trim(), score, length: words.length };
    });
    
    // Sort by score and pick top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    // Generate summary
    const topSentences = scoredSentences
      .slice(0, 5)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
      .map(s => s.sentence);
    
    // Create bullet points from key sentences
    const bullets = topSentences.slice(0, 3).map(s => {
      // Clean up and make it bullet-friendly
      return s.replace(/^\s*[\-\*]\s*/, '').trim();
    });
    
    // Generate TL;DR (first good sentence or combined)
    const tldr = topSentences[0] || 'No summary available';
    
    // Key points (important keywords/phrases)
    const allText = articleText.toLowerCase();
    const keyPoints = [];
    
    // Extract potential key entities (capitalized phrases)
    const entities = articleText.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    const entityCounts = {};
    entities.forEach(e => {
      if (e.length > 3 && !['The', 'This', 'That', 'With', 'From'].includes(e)) {
        entityCounts[e] = (entityCounts[e] || 0) + 1;
      }
    });
    
    const topEntities = Object.entries(entityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    
    res.json({
      tldr: tldr.length > 150 ? tldr.substring(0, 150) + '...' : tldr,
      bullets: bullets.filter(b => b.length > 10),
      keyPoints: topEntities,
      fullText: articleText.substring(0, 2000) // Include preview of full text
    });
    
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ error: 'Failed to summarize article' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for any other route (must be after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Newsplus API running on port ${PORT}`);
});

export default app;