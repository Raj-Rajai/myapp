const mongoose = require('mongoose');

const newsCacheSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  articleUrl: { type: String, required: true },
  source: { type: String, default: 'Unknown' },
  tags: { type: [String], default: ['General Football'] },
  fetchedAt: { type: Date, default: Date.now }
});

const NewsCache = mongoose.model('NewsCache', newsCacheSchema);

module.exports = { NewsCache };
