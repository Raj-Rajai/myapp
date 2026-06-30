const express = require('express');
const { Player } = require('../db/users');
const auth = require('../middleware/auth');
const { generatePlayerProfile } = require('../services/playerIntelligence');

const router = express.Router();

// GET /api/players — List all players, optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query = {
        $or: [
          { playerName: regex },
          { 'currentClub.clubName': regex },
          { nationality: regex }
        ]
      };
    }

    const players = await Player.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ message: 'Error fetching players.' });
  }
});

// GET /api/players/:id — Get single player
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }
    res.json(player);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Player not found.' });
    }
    console.error('Error fetching player:', error);
    res.status(500).json({ message: 'Error fetching player.' });
  }
});

// POST /api/players — Create player via AI Intelligence (protected)
router.post('/', auth, async (req, res) => {
  try {
    const { playerName, nationality, imageUrl } = req.body;

    if (!playerName || !nationality) {
      return res.status(400).json({ message: 'Player name and nationality are required.' });
    }

    // Check if player already exists
    const existing = await Player.findOne({
      playerName: new RegExp(`^${playerName.trim()}$`, 'i')
    });
    if (existing) {
      return res.status(409).json({
        message: 'This player already exists in the database.',
        playerId: existing._id
      });
    }

    // Generate full profile via Player Intelligence Service
    const profileData = await generatePlayerProfile(
      playerName.trim(),
      nationality.trim(),
      imageUrl || ''
    );

    // Create and save player
    const player = new Player({
      ...profileData,
      createdBy: req.user.id
    });

    const savedPlayer = await player.save();
    const populated = await savedPlayer.populate('createdBy', 'username');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ message: 'Error generating player profile. Please try again.' });
  }
});

// PUT /api/players/:id/regenerate — Re-generate player data via AI (protected)
router.put('/:id/regenerate', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }

    console.log(`\n🔄 Regenerating profile for: ${player.playerName}`);

    // Re-run the full AI pipeline
    const profileData = await generatePlayerProfile(
      player.playerName,
      player.nationality,
      player.imageUrl || ''
    );

    // Update the player with new data (keep createdBy and createdAt)
    Object.assign(player, profileData);
    player.updatedAt = new Date();

    const saved = await player.save();
    const populated = await saved.populate('createdBy', 'username');
    res.json(populated);
  } catch (error) {
    console.error('Error regenerating player:', error);
    res.status(500).json({ message: 'Error regenerating player profile. Please try again.' });
  }
});

module.exports = router;
