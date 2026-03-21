import { useState, useEffect } from 'react';
import './App.css';

interface NewsPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  thumbnail: string | null;
  score: number;
  numComments: number;
  author: string;
  subreddit: string;
  created: number;
  isVideo: boolean;
  domain: string;
}

function App() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const API_URL = ''; // Use relative URLs - works both locally and deployed

  // Fix protocol-relative URLs and ensure https
  const fixImageUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/news`);
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();
      setPosts(data.posts);
      setLastUpdated(new Date(data.lastUpdated).toLocaleString());
    } catch (err) {
      setError('Failed to load news. Please try again.');
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const openArticle = async (post: NewsPost) => {
    setSelectedPost(post);
    setSummary(null);
    setArticleLoading(true);
    setShowFullText(false);
    
    // Fetch AI summary from backend
    try {
      const response = await fetch(`${API_URL}/api/summarize?url=${encodeURIComponent(post.url)}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Failed to summarize article:', err);
      setSummary(null);
    } finally {
      setArticleLoading(false);
    }
  };

  const closeArticle = () => {
    setSelectedPost(null);
    setSummary(null);
    setArticleLoading(false);
    setShowFullText(false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">📰 Newsplus</h1>
          <button className="refresh-btn" onClick={fetchNews} disabled={loading}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
        {lastUpdated && <p className="last-updated">Last updated: {lastUpdated}</p>}
      </header>

      <main className="main">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={fetchNews}>Try Again</button>
          </div>
        )}

        {loading && posts.length === 0 ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading news...</p>
          </div>
        ) : (
          <div className="news-grid">
            {posts.map((post) => (
              <article 
                key={post.id} 
                className="news-card"
                onClick={() => openArticle(post)}
              >
                {post.thumbnail && post.thumbnail.startsWith('http') && (
                  <div className="card-image">
                    <img 
                      src={fixImageUrl(post.thumbnail) || ''} 
                      alt="" 
                      loading="lazy"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="card-content">
                  <span className="subreddit-badge">r/{post.subreddit}</span>
                  <h2 className="card-title">{post.title}</h2>
                  <div className="card-meta">
                    <span className="domain">{post.domain}</span>
                    <span className="separator">•</span>
                    <span className="time">{formatTimeAgo(post.created)}</span>
                  </div>
                  <div className="card-stats">
                    <span>⬆️ {post.score.toLocaleString()}</span>
                    <span>💬 {post.numComments.toLocaleString()}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {selectedPost && (
        <div className="article-modal" onClick={closeArticle}>
          <div className="article-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeArticle}>✕</button>
            <div className="article-header">
              <span className="subreddit-badge">r/{selectedPost.subreddit}</span>
              <h2>{selectedPost.title}</h2>
              <div className="article-meta">
                <span>Posted by u/{selectedPost.author}</span>
                <span>•</span>
                <span>{formatTimeAgo(selectedPost.created)}</span>
                <span>•</span>
                <span>{selectedPost.domain}</span>
              </div>
            </div>
            {selectedPost.thumbnail && (
              <div className="article-preview-image">
                <img 
                  src={fixImageUrl(selectedPost.thumbnail) || ''} 
                  alt="Article preview"
                />
              </div>
            )}
            <div className="article-body">
              {articleLoading ? (
                <div className="article-loading">
                  <div className="spinner"></div>
                  <p>🤖 AI is reading and summarizing...</p>
                </div>
              ) : summary ? (
                <div className="article-summary">
                  {/* TL;DR Section */}
                  <div className="summary-section tldr">
                    <h3>⚡ TL;DR</h3>
                    <p className="tldr-text">{summary.tldr}</p>
                  </div>
                  
                  {/* Key Points */}
                  {summary.keyPoints && summary.keyPoints.length > 0 && (
                    <div className="summary-section">
                      <h3>🏷️ Key Topics</h3>
                      <div className="key-points">
                        {summary.keyPoints.map((point: string, i: number) => (
                          <span key={i} className="key-point-tag">{point}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Bullet Points */}
                  {summary.bullets && summary.bullets.length > 0 && (
                    <div className="summary-section">
                      <h3>📝 Key Takeaways</h3>
                      <ul className="bullet-list">
                        {summary.bullets.map((bullet: string, i: number) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Full Text Toggle */}
                  {summary.fullText && (
                    <div className="summary-section">
                      <button 
                        className="toggle-full-text"
                        onClick={() => setShowFullText(!showFullText)}
                      >
                        {showFullText ? 'Hide Full Text ↑' : 'Read Full Article ↓'}
                      </button>
                      {showFullText && (
                        <div className="full-text">
                          {summary.fullText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="article-embed-placeholder">
                  <p>Unable to generate summary.</p>
                  <p>Click below to read the full article on {selectedPost.domain}</p>
                </div>
              )}
            </div>
            <div className="article-actions">
              <a 
                href={selectedPost.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Open Original Article ↗
              </a>
              <a 
                href={selectedPost.permalink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                View on Reddit ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;