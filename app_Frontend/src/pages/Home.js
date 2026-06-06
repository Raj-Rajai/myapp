import { useState, useEffect } from 'react';
import api from '../api/axios';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80';

function Home() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await api.get('/api/news');
        setNews(res.data);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const handleImageError = (e) => {
    e.target.src = FALLBACK_IMAGE;
  };

  return (
    <div className="home-page">
      <section className="hero-section" id="hero">
        <div className="hero-content">
          <div className="hero-badge">⚽ LIVE UPDATES</div>
          <h1>Football Transfer Hub</h1>
          <p>Your ultimate destination for transfer news, player market values, and the latest football updates from around the world.</p>
        </div>
        <div className="hero-glow"></div>
      </section>

      <section className="news-section" id="news-feed">
        <div className="section-header">
          <h2>Latest Football News</h2>
          <span className="section-subtitle">Powered by live RSS feeds</span>
        </div>

        {loading ? (
          <div className="news-grid">
            {[...Array(6)].map((_, i) => (
              <div className="news-card skeleton" key={i}>
                <div className="skeleton-image"></div>
                <div className="skeleton-content">
                  <div className="skeleton-line wide"></div>
                  <div className="skeleton-line medium"></div>
                  <div className="skeleton-line narrow"></div>
                </div>
              </div>
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="news-grid">
            {news.map((article, index) => (
              <a
                href={article.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="news-card"
                key={article._id || index}
                id={`news-card-${index}`}
              >
                <div className="news-card-image">
                  <img
                    src={article.imageUrl || FALLBACK_IMAGE}
                    alt={article.title}
                    onError={handleImageError}
                    loading="lazy"
                  />
                  <span className="news-source-badge">{article.source}</span>
                </div>
                <div className="news-card-body">
                  <h3>{article.title}</h3>
                  <p>{article.description?.substring(0, 120)}{article.description?.length > 120 ? '...' : ''}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">📰</span>
            <h3>No news available</h3>
            <p>Check back later for the latest football updates.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;