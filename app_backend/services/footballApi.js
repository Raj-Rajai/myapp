const axios = require('axios');

const API_KEY = process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const headers = {
  'x-apisports-key': API_KEY
};

// Ordered league IDs to try (most popular first)
// Free plan REQUIRES a league param for player search
const LEAGUE_SEARCH_ORDER = [
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  135,  // Serie A (Italy)
  78,   // Bundesliga (Germany)
  61,   // Ligue 1 (France)
  307,  // Saudi Pro League
  94,   // Primeira Liga (Portugal)
  88,   // Eredivisie (Netherlands)
  203,  // Super Lig (Turkey)
  253,  // MLS (USA)
  2,    // Champions League
];

/**
 * Search player by name. Tries major leagues in order.
 * Stops as soon as player is found to conserve API quota.
 */
async function searchPlayer(name) {
  for (const season of [2024, 2023]) {
    for (const league of LEAGUE_SEARCH_ORDER) {
      try {
        const res = await axios.get(`${BASE_URL}/players`, {
          headers,
          params: { search: name, league, season },
          timeout: 15000
        });

        if (res.data?.response?.length > 0) {
          console.log(`    Found in league ${league}, season ${season}`);
          return res.data.response;
        }
      } catch (err) {
        if (err.response?.status === 429) {
          console.error('    API-Football: Rate limit hit, stopping search');
          return [];
        }
        continue;
      }
    }
  }

  return [];
}

/**
 * Get player stats for a specific season.
 */
async function getPlayerStats(playerId, season = 2024) {
  try {
    const res = await axios.get(`${BASE_URL}/players`, {
      headers,
      params: { id: playerId, season },
      timeout: 15000
    });
    return res.data?.response?.[0] || null;
  } catch (err) {
    console.error('API-Football stats error:', err.message);
    return null;
  }
}

/**
 * Get player transfer history.
 */
async function getPlayerTransfers(playerId) {
  try {
    const res = await axios.get(`${BASE_URL}/transfers`, {
      headers,
      params: { player: playerId },
      timeout: 15000
    });
    return res.data?.response?.[0]?.transfers || [];
  } catch (err) {
    console.error('API-Football transfers error:', err.message);
    return [];
  }
}

/**
 * Get player trophies.
 */
async function getPlayerTrophies(playerId) {
  try {
    const res = await axios.get(`${BASE_URL}/trophies`, {
      headers,
      params: { player: playerId },
      timeout: 15000
    });
    return res.data?.response || [];
  } catch (err) {
    console.error('API-Football trophies error:', err.message);
    return [];
  }
}

module.exports = {
  searchPlayer,
  getPlayerStats,
  getPlayerTransfers,
  getPlayerTrophies
};
