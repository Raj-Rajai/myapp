const mongoose = require('mongoose');

// User Schema — UNCHANGED
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Expanded Player Schema
const playerSchema = new mongoose.Schema({
  playerName: { type: String, required: true, trim: true },
  nationality: { type: String, default: '', trim: true },
  isRetired: { type: Boolean, default: false },
  isDeceased: { type: Boolean, default: false },
  deathYear: { type: Number, default: null },

  personal: {
    age: { type: Number, default: 0 },
    height: { type: String, default: '' },
    weight: { type: String, default: '' },
    preferredFoot: { type: String, default: '' }
  },

  currentClub: {
    clubName: { type: String, default: '' },
    league: { type: String, default: '' }
  },

  market: {
    transferValue: { type: String, default: '' },
    contractUntil: { type: String, default: '' }
  },

  statistics: {
    appearances: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
    minutesPlayed: { type: Number, default: 0 },
    internationalCaps: { type: Number, default: 0 },
    internationalGoals: { type: Number, default: 0 }
  },

  ratings: {
    pace: { type: Number, default: 50 },
    shooting: { type: Number, default: 50 },
    passing: { type: Number, default: 50 },
    dribbling: { type: Number, default: 50 },
    defending: { type: Number, default: 50 },
    physical: { type: Number, default: 50 }
  },

  ovrData: {
    overallRating: { type: Number, default: 50 },
    baseOVR: { type: Number, default: 50 },
    potentialOVR: { type: Number, default: 50 },
    bestPosition: { type: String, default: 'CM' },
    positionRatings: { type: mongoose.Schema.Types.Mixed, default: {} },
    ageModifier: { type: mongoose.Schema.Types.Mixed, default: {} }
  },

  achievements: { type: [String], default: [] },

  previousClubs: [{
    clubName: { type: String },
    from: { type: String },
    to: { type: String }
  }],

  aiScoutReport: {
    playingStyle: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    tacticalSystems: { type: [String], default: [] },
    leadership: { type: String, default: '' },
    careerStage: { type: String, default: '' },
    transferRisk: { type: String, default: '' }
  },

  aiTransferAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },

  imageUrl: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Player = mongoose.model('Player', playerSchema);

module.exports = { User, Player };