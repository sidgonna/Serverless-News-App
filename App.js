import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const TAGS = [
  'World', 'U.S.', 'Politics', 'Business', 'Tech', 'Culture', 'Sports', 'Opinion'
];

function getTodayString() {
  const date = new Date();
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

const App = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState('World');
  const [theme, setTheme] = useState(() => {
    // Initialize from localStorage or default to 'light'
    return localStorage.getItem('newsAggregatorTheme') || 'light';
  });
  const apiUrl = 'https://d99meq3r25.execute-api.us-east-1.amazonaws.com/prod/articles';

  const fetchArticles = (tag) => {
    setLoading(true);
    
    // Scroll to top when fetching new articles
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Simulate network delay for better UI feedback (remove in production if real API is slow)
    setTimeout(() => {
      axios.get(apiUrl)
        .then(response => {
          setArticles(response.data || []);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching articles:', error);
          setError('Failed to load articles. Please try again later.');
          setLoading(false);
        });
    }, 600); // Short delay for visual feedback
  };

  useEffect(() => {
    fetchArticles(activeTag);
    // eslint-disable-next-line
  }, []);

  // Update theme in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('newsAggregatorTheme', theme);
    // Apply theme to body element directly to affect full page
    document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  // Fake filtering: sets active tag and refetches articles
  const handleTagClick = (tag, e) => {
    e.preventDefault();
    if (tag === activeTag && !loading) return; // Don't refetch if same tag
    setActiveTag(tag);
    fetchArticles(tag);
  };

  const themeClass = theme === 'dark' ? 'dark-mode' : 'light-mode';

  return (
    <div className={`container ${themeClass}`}>
      <header className="nyt-masthead">
        <div className="nyt-date-line">{getTodayString()}</div>
        <h1 className="nyt-title">The News Time</h1>
        <div className="nyt-title-rule"></div>
        <nav className="nyt-tags">
          {TAGS.map((tag) => (
            <a
              href="#"
              key={tag}
              className={`nyt-tag-link ${activeTag === tag ? 'active' : ''}`}
              onClick={(e) => handleTagClick(tag, e)}
              tabIndex={0}
            >
              {tag}
            </a>
          ))}
        </nav>
        <div className="nyt-title-rule"></div>
        <button onClick={toggleTheme} className="theme-toggle-button">
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'} Mode
        </button>
      </header>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <p>Loading {activeTag} news...</p>
          </div>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="articles">
          {articles.length > 0 ? (
            articles.map((article, index) => {
              let formattedDate = null;
              if (article.PubDate) {
                try {
                  const date = new Date(article.PubDate);
                  if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                  }
                } catch (e) {}
              }
              const gradientIndex = (index % 6) + 1;
              const placeholderClassName = `article-image-placeholder placeholder-gradient-${gradientIndex}`;
              
              // Add animation delay based on index for staggered fade-in
              const animationDelay = `${index * 0.1}s`;
              
              return (
                <div 
                  key={article.articleId} 
                  className="article-card" 
                  style={{animationDelay}}
                >
                  <div className={placeholderClassName}></div>
                  <div className="article-content">
                    <h2 className="nyt-article-title">{article.Title || 'Untitled Article'}</h2>
                    {article.Description && (
                      <p className="article-description">{article.Description}</p>
                    )}
                    <div className="article-meta nyt-article-meta">
                      <span>{article.Source || 'Unknown'}</span>
                      {formattedDate && (
                        <span>{formattedDate}</span>
                      )}
                    </div>
                    <a href={article.articleId} target="_blank" rel="noopener noreferrer" className="cta-button nyt-cta-button">
                      Read More &rarr;
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-articles">No articles found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
