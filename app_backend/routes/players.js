const express = require('express');
const { Player } = require('../db/users');
const auth = require('../middleware/auth');

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
          { club: regex }
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
    // Handle invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Player not found.' });
    }
    console.error('Error fetching player:', error);
    res.status(500).json({ message: 'Error fetching player.' });
  }
});

// POST /api/players — Create player (protected)
router.post('/', auth, async (req, res) => {
  try {
    const { playerName, age, position, club, transferValue, imageUrl } = req.body;

    if (!playerName || !age || !position || !club || !transferValue) {
      return res.status(400).json({ message: 'All fields except image URL are required.' });
    }

    const player = new Player({
      playerName,
      age: Number(age),
      position,
      club,
      transferValue,
      imageUrl: imageUrl || '',
      createdBy: req.user.id
    });

    const savedPlayer = await player.save();
    const populated = await savedPlayer.populate('createdBy', 'username');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ message: 'Error creating player.' });
  }
});

module.exports = router;
