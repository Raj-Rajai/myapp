require('dotenv').config();
require('./db/config');

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const newsRoutes = require('./routes/news');

const app = express();

// CORS - allow both production and development
const allowedOrigins = [
  'https://football-news-hub-rj.netlify.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Football News Hub API is running ⚽' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/news', newsRoutes);

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} ⚽`);
  // Clear stale news cache on startup so re-categorization takes effect
  try {
    const { NewsCache } = require('./db/NewsCache');
    await NewsCache.deleteMany({});
    console.log('News cache cleared — fresh categorized fetch on next request.');
  } catch (e) {
    console.error('Cache clear on startup failed:', e.message);
  }
});