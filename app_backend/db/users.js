const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Player Schema
const playerSchema = new mongoose.Schema({
  playerName: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  position: { type: String, required: true, trim: true },
  club: { type: String, required: true, trim: true },
  transferValue: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Player = mongoose.model('Player', playerSchema);

module.exports = { User, Player };