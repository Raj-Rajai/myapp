const express = require('express');
const Parser = require('rss-parser');
const { NewsCache } = require('../db/NewsCache');

const router = express.Router();
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Football Transfer Hub/1.0'
  },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent', { keepArray: true }]
    ]
  }
});

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
  { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN FC' },
  { url: 'https://www.skysports.com/rss/11095', source: 'Sky Sports' },
  { url: 'https://www.theguardian.com/football/rss', source: 'The Guardian' },
  { url: 'https://www.goal.com/en/feeds/news', source: 'Goal.com' },
  { url: 'https://www.football365.com/rss', source: 'Football365' },
  { url: 'https://www.sportingnews.com/us/soccer/news/rss', source: 'Sporting News' },
  { url: 'https://www.fourfourtwo.com/rss', source: 'FourFourTwo' },
  { url: 'https://www.transfermarkt.com/rss/news', source: 'Transfermarkt' },
  { url: 'https://www.fifa.com/rss-feeds/news', source: 'FIFA' },
  { url: 'https://www.uefa.com/rssfeed/news/', source: 'UEFA' },
  { url: 'https://www.premierleague.com/rss/news', source: 'Premier League' },
  { url: 'https://www.laliga.com/en-GB/rss', source: 'La Liga' },
  { url: 'https://www.bundesliga.com/en/bundesliga/rss', source: 'Bundesliga' },
  { url: 'https://www.seriea.com/rss/news', source: 'Serie A' },
  { url: 'https://www.ligue1.com/rss/news', source: 'Ligue 1' },
  { url: 'https://nitter.net/FabrizioRomano/rss', source: 'Fabrizio Romano' },
  { url: 'https://nitter.net/DeadlineDayLive/rss', source: 'Deadline Day Live' }
];

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// GET /api/news
router.get('/', async (req, res) => {
  try {
    // Check cache
    const cachedNews = await NewsCache.find({}).sort({ fetchedAt: -1 }).limit(1);

    if (cachedNews.length > 0) {
      const cacheAge = Date.now() - new Date(cachedNews[0].fetchedAt).getTime();
      if (cacheAge < CACHE_DURATION_MS) {
        const allCached = await NewsCache.find({}).sort({ fetchedAt: -1 });
        return res.json(allCached);
      }
    }

    // Fetch fresh news from RSS feeds
    const allArticles = [];

    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        const articles = parsed.items.slice(0, 8).map(item => {
          let imageUrl = '';
          if (item.enclosure?.url) {
            imageUrl = item.enclosure.url;
          } else if (item.mediaThumbnail?.$.url) {
            imageUrl = item.mediaThumbnail.$.url;
          } else if (item.mediaThumbnail?.url) {
            imageUrl = item.mediaThumbnail.url;
          } else if (item.mediaContent) {
            const contentArray = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
            // Prefer the last one in the array (usually highest resolution)
            const chosen = contentArray[contentArray.length - 1];
            imageUrl = chosen?.$.url || chosen?.url || '';
          }

          return {
            title: item.title || 'Untitled',
            description: item.contentSnippet || item.content || item.summary || '',
            imageUrl,
            articleUrl: item.link || '',
            source: feed.source,
            fetchedAt: new Date()
          };
        });
        return articles;
      } catch (err) {
        console.error(`Error fetching RSS from ${feed.source}:`, err.message);
        return [];
      }
    });

    const results = await Promise.all(feedPromises);
    results.forEach(articles => allArticles.push(...articles));

    if (allArticles.length > 0) {
      // Clear old cache and store new
      await NewsCache.deleteMany({});
      await NewsCache.insertMany(allArticles);
    }

    // If RSS fetch failed completely, return whatever is in cache
    if (allArticles.length === 0) {
      const fallback = await NewsCache.find({}).sort({ fetchedAt: -1 });
      return res.json(fallback);
    }

    res.json(allArticles);
  } catch (error) {
    console.error('Error fetching news:', error);
    // Return cached data on error
    try {
      const fallback = await NewsCache.find({}).sort({ fetchedAt: -1 });
      res.json(fallback);
    } catch (e) {
      res.status(500).json({ message: 'Error fetching news.' });
    }
  }
});

module.exports = router;
