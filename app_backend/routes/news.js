const express = require('express');
const Parser = require('rss-parser');
const { NewsCache } = require('../db/NewsCache');

const router = express.Router();
const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
  { url: 'https://www.football365.com/rss', source: 'Football365' },
  { url: 'https://www.fourfourtwo.com/rss', source: 'FourFourTwo' },
  { url: 'https://www.transfermarkt.com/rss/news', source: 'Transfermarkt' }
];

// Nitter mirrors for Twitter RSS — try multiple instances for reliability
const NITTER_FEEDS = [
  {
    source: 'Fabrizio Romano',
    username: 'FabrizioRomano',
    mirrors: [
      'https://nitter.net',
      'https://nitter.privacydev.net',
      'https://nitter.poast.org'
    ]
  },
  {
    source: 'Deadline Day Live',
    username: 'DeadlineDayLive',
    mirrors: [
      'https://nitter.net',
      'https://nitter.privacydev.net',
      'https://nitter.poast.org'
    ]
  }
];

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80';

// --- Utility: Decode HTML entities ---
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

// --- Utility: Strip HTML tags ---
function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// --- Utility: Extract image from HTML content ---
function extractImageFromContent(content) {
  if (!content) return '';
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

// =============================================
// --- TAG-BASED CLASSIFICATION ENGINE ---
// =============================================

const transferKeywords = [
  "transfer", "transfers", "signed", "signing", "signs",
  "loan", "loan move", "loan deal", "permanent deal",
  "transfer target", "transfer fee", "medical", "medical completed",
  "contract agreement", "contract extension", "release clause",
  "buy option", "sell option", "bid", "offer", "agreement reached",
  "here we go", "joins", "join", "departure", "leaves", "exit",
  "move to", "linked with", "interest in", "pursuing",
  "negotiating", "negotiations", "free transfer", "swap deal"
];

const fifaKeywords = [
  "fifa", "fifa world cup", "world cup", "club world cup",
  "fifa rankings", "fifa ranking", "fifa president",
  "gianni infantino", "fifa council", "fifa congress",
  "international break", "world cup qualifiers",
  "fifa regulations", "fifa ban", "fifa suspension"
];

const uefaKeywords = [
  "uefa", "champions league", "ucl", "europa league", "uel",
  "conference league", "uefa super cup", "nations league",
  "uefa coefficient", "uefa president", "ceferin",
  "champions league draw", "europa league draw",
  "round of 16", "quarter final", "semi final", "final"
];

const premierLeagueKeywords = [
  "premier league", "arsenal", "chelsea", "liverpool",
  "manchester united", "man utd", "manchester city", "man city",
  "tottenham", "spurs", "newcastle", "aston villa", "brighton",
  "west ham", "everton", "wolves", "nottingham forest",
  "crystal palace", "fulham", "brentford", "bournemouth",
  "burnley", "sunderland", "leeds united"
];

const laLigaKeywords = [
  "la liga", "real madrid", "barcelona", "fc barcelona",
  "atletico madrid", "atleti", "sevilla", "valencia",
  "villarreal", "real sociedad", "athletic club", "athletic bilbao",
  "real betis", "girona", "celta vigo", "osasuna", "mallorca"
];

const bundesligaKeywords = [
  "bundesliga", "bayern munich", "bayern", "borussia dortmund",
  "dortmund", "bayer leverkusen", "leverkusen", "rb leipzig",
  "eintracht frankfurt", "stuttgart", "wolfsburg",
  "borussia monchengladbach", "freiburg", "union berlin", "hoffenheim"
];

const ligue1Keywords = [
  "ligue 1", "psg", "paris saint germain", "marseille", "monaco",
  "lyon", "lille", "nice", "lens", "rennes", "nantes",
  "strasbourg", "montpellier"
];

const serieAKeywords = [
  "serie a", "juventus", "inter", "inter milan", "ac milan",
  "milan", "napoli", "roma", "lazio", "atalanta", "fiorentina",
  "bologna", "torino", "udinese", "sassuolo", "como"
];

const featuredPlayersKeywords = [
  "mbappe", "kylian mbappe", "haaland", "erling haaland",
  "lamine yamal", "yamal", "jude bellingham", "bellingham",
  "vinicius", "vinicius jr", "pedri", "rodri",
  "mohamed salah", "salah", "harry kane", "kane",
  "musiala", "jamal musiala", "florian wirtz", "wirtz",
  "dembele", "ousmane dembele", "cole palmer", "palmer"
];

// All tag groups for iteration
const TAG_GROUPS = [
  { tag: 'Transfer',        keywords: transferKeywords },
  { tag: 'FIFA',            keywords: fifaKeywords },
  { tag: 'UEFA',            keywords: uefaKeywords },
  { tag: 'Premier League',  keywords: premierLeagueKeywords },
  { tag: 'La Liga',         keywords: laLigaKeywords },
  { tag: 'Bundesliga',      keywords: bundesligaKeywords },
  { tag: 'Ligue 1',         keywords: ligue1Keywords },
  { tag: 'Serie A',         keywords: serieAKeywords },
  { tag: 'Featured Player', keywords: featuredPlayersKeywords }
];

/**
 * Generate tags for an article based on title + description keyword matching.
 * An article can have MULTIPLE tags.
 * "General Football" is ONLY added when NO other tags match.
 */
function generateTags(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  const tags = [];

  for (const group of TAG_GROUPS) {
    for (const keyword of group.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        tags.push(group.tag);
        break; // one keyword match is enough to add this tag
      }
    }
  }

  // General Football = fallback ONLY when no other tags exist
  if (
    !tags.includes('Transfer') &&
    !tags.includes('FIFA') &&
    !tags.includes('UEFA') &&
    !tags.includes('Premier League') &&
    !tags.includes('La Liga') &&
    !tags.includes('Bundesliga') &&
    !tags.includes('Ligue 1') &&
    !tags.includes('Serie A') &&
    !tags.includes('Featured Player')
  ) {
    tags.push('General Football');
  }

  return tags;
}

// --- Image extraction with multiple fallback strategies ---
function extractImageUrl(item) {
  // 1. Standard enclosure (Sky Sports, Football365, FourFourTwo)
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  // 2. media:thumbnail (BBC Sport)
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url;
  }
  if (item.mediaThumbnail?.url) {
    return item.mediaThumbnail.url;
  }
  // 3. media:content array (The Guardian) — pick highest resolution (last)
  if (item.mediaContent) {
    const contentArray = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
    const chosen = contentArray[contentArray.length - 1];
    const url = chosen?.$?.url || chosen?.url || '';
    if (url) return url;
  }
  // 4. Extract <img> from HTML content (Nitter / Fabrizio Romano / Deadline Day Live)
  const fromContent = extractImageFromContent(item.content);
  if (fromContent) return fromContent;

  // 5. No image found — use default football image
  return DEFAULT_IMAGE;
}

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
        const articles = parsed.items.slice(0, 15).map(item => {
          const rawTitle = decodeHtmlEntities(item.title || 'Untitled');
          const rawDesc = stripHtml(decodeHtmlEntities(
            item.contentSnippet || item.content || item.summary || ''
          ));

          const imageUrl = extractImageUrl(item);
          const description = rawDesc.substring(0, 300);
          const tags = generateTags(rawTitle, description);

          return {
            title: rawTitle,
            description,
            imageUrl,
            articleUrl: item.link || '',
            source: feed.source,
            tags,
            fetchedAt: new Date()
          };
        });
        return articles;
      } catch (err) {
        console.error(`Error fetching RSS from ${feed.source}:`, err.message);
        return [];
      }
    });

    // Fetch Nitter feeds in parallel — each tries mirrors sequentially
    const nitterPromises = NITTER_FEEDS.map(async (feed) => {
      for (const mirror of feed.mirrors) {
        const feedUrl = `${mirror}/${feed.username}/rss`;
        try {
          const parsed = await parser.parseURL(feedUrl);
          const articles = parsed.items.slice(0, 15).map(item => {
            const rawTitle = decodeHtmlEntities(item.title || 'Untitled');
            const rawDesc = stripHtml(decodeHtmlEntities(
              item.contentSnippet || item.content || item.summary || ''
            ));

            // Tweets can be very long — truncate to first sentence or 120 chars
            const firstSentence = rawTitle.split(/[.\n]/)[0];
            const title = firstSentence.length > 120
              ? firstSentence.substring(0, 117) + '...'
              : firstSentence;

            const imageUrl = extractImageUrl(item);
            const description = rawDesc.substring(0, 300);
            const tags = generateTags(title, description);

            return {
              title,
              description,
              imageUrl,
              articleUrl: item.link || '',
              source: feed.source,
              tags,
              fetchedAt: new Date()
            };
          });
          console.log(`Fetched ${articles.length} articles from ${feed.source} via ${mirror}`);
          return articles; // Success — stop trying other mirrors
        } catch (err) {
          console.error(`Mirror ${mirror} failed for ${feed.source}: ${err.message}`);
          // Continue to next mirror
        }
      }
      console.warn(`All mirrors failed for ${feed.source}`);
      return []; // All mirrors failed
    });

    const results = await Promise.all([...feedPromises, ...nitterPromises]);
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
    try {
      const fallback = await NewsCache.find({}).sort({ fetchedAt: -1 });
      res.json(fallback);
    } catch (e) {
      res.status(500).json({ message: 'Error fetching news.' });
    }
  }
});

module.exports = router;
