const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function initGemini() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
}

/**
 * Generate a player profile using VERIFIED data from APIs.
 * Gemini is only used to analyse — it NEVER invents facts.
 *
 * @param {Object} playerData - All verified data collected from APIs
 * @param {string} playerData.name
 * @param {string} playerData.nationality
 * @param {string} playerData.birthDate
 * @param {string} playerData.position
 * @param {string} playerData.club
 * @param {Object} playerData.wikipediaData   - parsed wiki infobox
 * @param {Object} playerData.footballApiData - API-Football player+stats
 * @param {Array}  playerData.transfers       - raw transfer array
 * @param {Array}  playerData.trophies        - raw trophies array
 */
async function generateFullProfile(playerData) {
  const m = initGemini();
  if (!m) return buildFallback(playerData);

  try {
    const prompt = `You are a football analyst.

Your task is to complete a player's profile using the VERIFIED data provided below.

IMPORTANT RULES:
- NEVER invent clubs.
- NEVER invent trophies.
- NEVER invent transfers.
- NEVER invent career statistics.
- NEVER guess market values.
- If a factual field is unknown from the data below, return null.
- Use the supplied data whenever available.
- Use your football knowledge ONLY for: ratings (pace/shooting/passing/dribbling/defending/physical at PEAK performance like EA FC Icons), bestPosition, altPositions, scoutReport, and transferAnalysis.
- Ratings should reflect the player's PEAK ability (prime years), scored 1-99 like EA FC.

Verified Player:
Name: ${playerData.name}
Nationality: ${playerData.nationality || 'Unknown'}
Birth Date: ${playerData.birthDate || 'Unknown'}
Position: ${playerData.position || 'Unknown'}
Club: ${playerData.club || 'Unknown'}

Wikipedia Data:
${JSON.stringify(playerData.wikipediaData || null)}

Football API Data:
${JSON.stringify(playerData.footballApiData || null)}

Transfers:
${JSON.stringify(playerData.transfers || [])}

Trophies:
${JSON.stringify(playerData.trophies || [])}

Return ONLY valid JSON (no markdown, no backticks):
{
  "isRetired": false,
  "isDeceased": false,
  "deathYear": null,
  "ageAtDeath": null,
  "bestPosition": "ST",
  "altPositions": ["CF", "LW"],
  "currentClub": "from the data above or null",
  "league": "from the data above or null",
  "marketValue": null,
  "careerStats": {
    "appearances": null,
    "goals": null,
    "assists": null,
    "yellowCards": null,
    "redCards": null,
    "internationalCaps": null,
    "internationalGoals": null
  },
  "ratings": {
    "pace": 0,
    "shooting": 0,
    "passing": 0,
    "dribbling": 0,
    "defending": 0,
    "physical": 0
  },
  "achievements": [],
  "careerHistory": [],
  "scoutReport": {
    "playingStyle": "",
    "strengths": [],
    "weaknesses": [],
    "tacticalSystems": [],
    "leadership": "",
    "careerStage": ""
  },
  "transferAnalysis": {
    "suitabilityScore": 0,
    "recommendedClubs": [],
    "financialRisk": "",
    "tacticalFit": ""
  }
}`;

    // Retry with backoff for rate limits
    let result = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await m.generateContent(prompt);
        break;
      } catch (retryErr) {
        const is429 = retryErr.message?.includes('429') || retryErr.message?.includes('quota');
        if (is429 && attempt < 3) {
          const wait = attempt * 35;
          console.log(`    ⏳ Gemini rate limited, waiting ${wait}s (attempt ${attempt}/3)...`);
          await new Promise(r => setTimeout(r, wait * 1000));
        } else {
          throw retryErr;
        }
      }
    }

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const json = JSON.parse(cleaned);

    // Validate and clamp ratings to 1-99
    if (json.ratings) {
      for (const key of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']) {
        json.ratings[key] = clamp(json.ratings[key]);
      }
    }

    // Force null transfer for retired/deceased
    if (json.isRetired || json.isDeceased) {
      json.transferAnalysis = null;
      if (!json.marketValue) json.marketValue = 'Retired';
    }

    // Clamp suitability score
    if (json.transferAnalysis?.suitabilityScore) {
      json.transferAnalysis.suitabilityScore = clamp(json.transferAnalysis.suitabilityScore, 0, 100);
    }

    // Ensure arrays
    json.achievements  = Array.isArray(json.achievements)  ? json.achievements  : [];
    json.careerHistory = Array.isArray(json.careerHistory) ? json.careerHistory : [];
    json.altPositions  = Array.isArray(json.altPositions)  ? json.altPositions  : [];

    return json;

  } catch (err) {
    console.error('  ✗ Gemini error:', err.message?.split('\n')[0]);
    return buildFallback(playerData);
  }
}

function clamp(val, min = 1, max = 99) {
  return Math.max(min, Math.min(max, Number(val) || 50));
}

/**
 * Fallback when Gemini is unavailable.
 * Extracts what we can from the verified API data that was passed in,
 * and generates position-based ratings.
 */
function buildFallback(playerData) {
  const pos = normalizePos(playerData.position || '');
  const isDeceased = playerData.wikipediaData?.isDeceased || false;
  const isRetired = isDeceased || false; // Can't determine retired without AI

  // Extract stats from footballApiData if available
  const apiStats = playerData.footballApiData?.statistics?.[0] || {};
  const games    = apiStats.games || {};
  const goalsObj = apiStats.goals || {};
  const cardsObj = apiStats.cards || {};

  // Build achievements from trophies
  const achievements = (playerData.trophies || [])
    .filter(t => t.place === 'Winner')
    .map(t => `${t.league} (${t.season})`);

  // Build career history from transfers
  const careerHistory = (playerData.transfers || [])
    .map(t => ({
      club: t.teams?.in?.name || t.teams?.out?.name || 'Unknown',
      from: t.date || '',
      to: t.teams?.in?.name || ''
    }))
    .reverse();

  // Position-based ratings
  const ratings = getPositionRatings(pos);

  const deathYear = isDeceased && playerData.wikipediaData?.deathDate
    ? new Date(playerData.wikipediaData.deathDate).getFullYear() : null;

  return {
    isRetired,
    isDeceased,
    deathYear,
    ageAtDeath: null,
    bestPosition: pos,
    altPositions: [],
    currentClub: playerData.footballApiData?.statistics?.[0]?.team?.name || playerData.wikipediaData?.currentTeam || null,
    league: playerData.footballApiData?.statistics?.[0]?.league?.name || null,
    marketValue: (isRetired || isDeceased) ? 'Retired' : null,
    careerStats: {
      appearances: games.appearences || null, // API-Football typo is real
      goals: goalsObj.total || null,
      assists: goalsObj.assists || null,
      yellowCards: cardsObj.yellow || null,
      redCards: cardsObj.red || null,
      internationalCaps: null,
      internationalGoals: null
    },
    ratings,
    achievements: [...new Set(achievements)].slice(0, 30),
    careerHistory,
    scoutReport: {
      playingStyle: getPositionStyle(pos),
      strengths: getPositionStrengths(pos),
      weaknesses: getPositionWeaknesses(pos),
      tacticalSystems: ['4-3-3', '4-2-3-1'],
      leadership: 'Medium',
      careerStage: isDeceased ? 'Legend' : 'Peak'
    },
    transferAnalysis: (isRetired || isDeceased) ? null : {
      suitabilityScore: 70,
      recommendedClubs: [],
      financialRisk: 'Unknown — AI unavailable',
      tacticalFit: `${pos} role`
    }
  };
}

// ── Position-based helpers ──

function normalizePos(p) {
  const s = (p || '').toUpperCase();
  if (s.includes('GOAL') || s === 'GK') return 'GK';
  if (s.includes('DEFEND') || s.includes('BACK') || s === 'CB') return 'CB';
  if (s.includes('ATTACK') || s.includes('STRIK') || s.includes('FORWARD') || s === 'ST') return 'ST';
  if (s.includes('WING') || s === 'LW' || s === 'RW') return 'LW';
  if (s.includes('CAM') || s.includes('ATTACKING MID')) return 'CAM';
  return 'CM';
}

function getPositionRatings(pos) {
  const table = {
    GK:  { pace: 45, shooting: 20, passing: 60, dribbling: 50, defending: 82, physical: 80 },
    CB:  { pace: 68, shooting: 42, passing: 62, dribbling: 56, defending: 84, physical: 84 },
    CM:  { pace: 72, shooting: 70, passing: 80, dribbling: 76, defending: 66, physical: 72 },
    CAM: { pace: 76, shooting: 78, passing: 84, dribbling: 84, defending: 38, physical: 64 },
    LW:  { pace: 88, shooting: 76, passing: 74, dribbling: 86, defending: 36, physical: 62 },
    ST:  { pace: 82, shooting: 86, passing: 66, dribbling: 78, defending: 34, physical: 78 },
  };
  const base = table[pos] || table.CM;
  // Add +/- 3 variance
  const out = {};
  for (const k of Object.keys(base)) {
    out[k] = clamp(base[k] + Math.floor(Math.random() * 7) - 3);
  }
  return out;
}

function getPositionStyle(pos) {
  const styles = {
    GK: 'Commanding shot-stopper with good distribution.',
    CB: 'Solid central defender strong in the air and in tackles.',
    CM: 'Box-to-box midfielder with good passing range and engine.',
    CAM: 'Creative attacking midfielder who pulls the strings.',
    LW: 'Direct winger who beats defenders with pace and skill.',
    ST: 'Clinical striker with sharp finishing and good movement.',
  };
  return styles[pos] || styles.CM;
}

function getPositionStrengths(pos) {
  const s = {
    GK: ['Reflexes', 'Positioning', 'Command of Area'],
    CB: ['Tackling', 'Heading', 'Strength'],
    CM: ['Passing', 'Stamina', 'Ball Recovery'],
    CAM: ['Vision', 'Dribbling', 'Through Balls'],
    LW: ['Pace', 'Dribbling', 'Crossing'],
    ST: ['Finishing', 'Positioning', 'Heading'],
  };
  return s[pos] || s.CM;
}

function getPositionWeaknesses(pos) {
  const w = {
    GK: ['Distribution', 'Sweeping'],
    CB: ['Pace', 'Passing'],
    CM: ['Aerial Duels', 'Pace'],
    CAM: ['Defending', 'Physicality'],
    LW: ['Strength', 'Defending'],
    ST: ['Passing', 'Pressing'],
  };
  return w[pos] || w.CM;
}

module.exports = { generateFullProfile };
