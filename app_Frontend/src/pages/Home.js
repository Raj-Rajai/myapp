import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80';

// Homepage row order — matches the spec exactly
const TAG_ROWS = [
  { tag: 'Featured Player',   emoji: '🌟', label: 'Featured Players' },
  { tag: 'General Football',  emoji: '⚽', label: 'General Football News' },
  { tag: 'Transfer',          emoji: '🔄', label: 'Transfer News' },
  { tag: 'FIFA',              emoji: '🌍', label: 'FIFA' },
  { tag: 'UEFA',              emoji: '🏆', label: 'UEFA' },
  { tag: 'Premier League',    flagUrl: 'https://img.icons8.com/color/48/england.png', label: 'Premier League' },
  { tag: 'La Liga',           flagUrl: 'https://img.icons8.com/color/48/spain.png', label: 'La Liga' },
  { tag: 'Bundesliga',        flagUrl: 'https://img.icons8.com/color/48/germany.png', label: 'Bundesliga' },
  { tag: 'Ligue 1',           flagUrl: 'https://img.icons8.com/color/48/france.png', label: 'Ligue 1' },
  { tag: 'Serie A',           flagUrl: 'https://img.icons8.com/color/48/italy.png', label: 'Serie A' }
];

// --- Breaking News Ticker ---
function NewsTicker({ articles }) {
  const tickerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  if (!articles || articles.length === 0) return null;

  const tickerItems = articles.slice(0, 12);

  return (
    <div
      className="news-ticker"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="ticker-label">🔥 BREAKING</div>
      <div className="ticker-track-wrapper">
        <div className={`ticker-track ${isPaused ? 'paused' : ''}`} ref={tickerRef}>
          {[...tickerItems, ...tickerItems].map((article, i) => (
            <a
              key={i}
              href={article.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ticker-item"
            >
              <span className="ticker-source">{article.source}</span>
              <span className="ticker-title">{article.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Featured Story ---
function FeaturedStory({ article }) {
  if (!article) return null;

  const handleImageError = (e) => {
    if (e.target.src !== FALLBACK_IMAGE) {
      e.target.src = FALLBACK_IMAGE;
    }
  };

  return (
    <a
      href={article.articleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="featured-story"
      id="featured-story"
    >
      <div className="featured-image">
        <img
          src={article.imageUrl || FALLBACK_IMAGE}
          alt={article.title}
          onError={handleImageError}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="featured-overlay" />
      </div>
      <div className="featured-content">
        <span className="featured-badge">⭐ Featured Story</span>
        <h2>{article.title}</h2>
        <p>{article.description?.substring(0, 200)}{article.description?.length > 200 ? '...' : ''}</p>
        <span className="featured-source">{article.source}</span>
      </div>
    </a>
  );
}

// --- Tag Row (Netflix-style horizontal carousel) ---
function TagRow({ row, articles }) {
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const isResettingRef = useRef(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const handleImageError = (e) => {
    if (e.target.src !== FALLBACK_IMAGE) {
      e.target.src = FALLBACK_IMAGE;
    }
  };

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  // Auto-scroll: one card width every 7 seconds
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const CARD_WIDTH = 298;
    const SCROLL_INTERVAL = 7000;

    const startAutoScroll = () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      autoScrollRef.current = setInterval(() => {
        if (!el || isResettingRef.current) return;

        const maxScroll = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= maxScroll - 5) {
          isResettingRef.current = true;
          el.scrollTo({ left: 0, behavior: 'smooth' });
          setTimeout(() => {
            isResettingRef.current = false;
          }, 1500);
        } else {
          el.scrollBy({ left: CARD_WIDTH, behavior: 'smooth' });
        }
      }, SCROLL_INTERVAL);
    };

    const stopAutoScroll = () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };

    if (!isHovered && !userInteracted) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }

    return () => stopAutoScroll();
  }, [isHovered, userInteracted]);

  // Resume auto-scroll after user inactivity
  useEffect(() => {
    if (userInteracted) {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        setUserInteracted(false);
      }, 8000);
    }
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [userInteracted]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    setUserInteracted(true);
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScroll = () => {
    updateArrows();
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows]);

  if (!articles || articles.length === 0) return null;

  return (
    <div
      className="category-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="category-header">
        <h2>
          {row.flagUrl ? (
            <img src={row.flagUrl} alt={row.label} className="category-flag" />
          ) : (
            <span className="category-emoji">{row.emoji}</span>
          )}
          {row.label}
        </h2>
        <span className="category-count">{articles.length} articles</span>
      </div>

      <div className="carousel-container">
        {showLeftArrow && (
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            ‹
          </button>
        )}

        <div
          className="carousel-track"
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={() => setUserInteracted(true)}
        >
          {articles.map((article, index) => (
            <a
              href={article.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="carousel-card"
              key={article._id || `${row.tag}-${index}`}
              id={`${row.tag.replace(/\s+/g, '-').toLowerCase()}-card-${index}`}
            >
              <div className="carousel-card-image">
                <img
                  src={article.imageUrl || FALLBACK_IMAGE}
                  alt={article.title}
                  onError={handleImageError}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <span className="carousel-source-badge">{article.source}</span>
              </div>
              <div className="carousel-card-body">
                <h3>{article.title}</h3>
                <p>{article.description?.substring(0, 100)}{article.description?.length > 100 ? '...' : ''}</p>
              </div>
            </a>
          ))}
        </div>

        {showRightArrow && (
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

// --- Main Home Page ---
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

  // Group articles by TAG — an article appears in EVERY row whose tag it contains
  const tagGroups = {};
  TAG_ROWS.forEach(row => { tagGroups[row.tag] = []; });

  news.forEach(article => {
    const articleTags = article.tags || [];
    let matched = false;

    TAG_ROWS.forEach(row => {
      if (articleTags.includes(row.tag)) {
        tagGroups[row.tag].push(article);
        matched = true;
      }
    });

    // Fallback: if article has no recognized tags, put in General Football
    if (!matched) {
      tagGroups['General Football'].push(article);
    }
  });

  // Pick featured story: first article with an image
  const featured = news.find(a => a.imageUrl && a.imageUrl.length > 0) || news[0];

  return (
    <div className="home-page">
      {/* Loading State */}
      {loading ? (
        <section className="news-section">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Fetching the latest football news...</p>
          </div>
        </section>
      ) : news.length > 0 ? (
        <section className="news-section" id="news-feed">
          {/* 🔥 Breaking News Ticker */}
          <NewsTicker articles={news} />

          {/* ⭐ Featured Story */}
          <FeaturedStory article={featured} />

          {/* Tag-based Rows — same article appears in multiple rows */}
          {TAG_ROWS.map(row => (
            <TagRow
              key={row.tag}
              row={row}
              articles={tagGroups[row.tag]}
            />
          ))}
        </section>
      ) : (
        <section className="news-section">
          <div className="empty-state">
            <span className="empty-icon">📰</span>
            <h3>No news available</h3>
            <p>Check back later for the latest football updates.</p>
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;