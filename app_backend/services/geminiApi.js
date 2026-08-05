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
 * Generate a COMPLETE player profile.
 *
 * Strategy:
 *   - Feed Gemini ALL verified data from APIs so it has context
 *   - Let Gemini use its football knowledge for career totals, ratings, analysis
 *   - Gemini must NOT invent trophies or transfers (those come from APIs)
 *   - Career stats must be TOTAL career numbers, not single-season
 */
async function generateFullProfile(playerData) {
  const m = initGemini();
  if (!m) return buildFallback(playerData);

  try {
    const prompt = `You are an elite football data analyst with encyclopedic knowledge of every footballer — active, retired, or deceased — up to 2026.

Below is VERIFIED data collected from APIs. Use it as context. Your job is to COMPLETE the profile.

═══ VERIFIED DATA ═══

Player: ${playerData.name}
Nationality: ${playerData.nationality || 'Unknown'}
Birth Date: ${playerData.birthDate || 'Unknown'}
Position (from API): ${playerData.position || 'Unknown'}
Club (from API): ${playerData.club || 'Unknown'}

Wikipedia: ${JSON.stringify(playerData.wikipediaData || null)}
Football API (current season): ${JSON.stringify(playerData.footballApiData || null)}
Transfers: ${JSON.stringify(playerData.transfers || [])}
Trophies Won: ${JSON.stringify(playerData.trophies || [])}

═══ YOUR TASK ═══

Fill in the JSON below. Follow these rules EXACTLY:

CAREER STATS — Use your knowledge to provide TOTAL career numbers across the player's ENTIRE career (all clubs combined, up to 2026). These must be realistic career totals, NOT single-season numbers. If the player has 300+ career goals, say 300+, not 25.

RATINGS — Rate the player at their PEAK ability (prime years), scored 1-99, like EA FC Ultimate Team Icons. A world-class striker gets 90+ shooting. A world-class defender gets 90+ defending.

MARKET VALUE — For active players, provide a realistic current market value as a string like "€150M". For retired/deceased players, set to "Retired".

DECEASED/RETIRED — If Wikipedia data shows a death_date, the player is deceased. If the player stopped playing professionally, they are retired.

ACHIEVEMENTS — Use the Trophies data above. List major trophies as strings like "Premier League 2022-23". If no trophies data, use your knowledge of real trophies won.

CAREER HISTORY — Use the Transfers data above. List clubs as objects. If no transfer data, use your knowledge of the player's real clubs.

BEST POSITION — Must be a FIFA position code: GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST

SCOUT REPORT & TRANSFER ANALYSIS — Use your tactical football knowledge.

NEVER INVENT fake clubs, fake trophies, or fake transfers. Everything must be REAL.

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "isRetired": false,
  "isDeceased": false,
  "deathYear": null,
  "ageAtDeath": null,
  "bestPosition": "ST",
  "altPositions": ["CF", "LW"],
  "currentClub": "Club Name",
  "league": "League Name",
  "marketValue": "€100M",
  "careerStats": {
    "appearances": 500,
    "goals": 300,
    "assists": 100,
    "yellowCards": 50,
    "redCards": 3,
    "internationalCaps": 80,
    "internationalGoals": 40
  },
  "ratings": {
    "pace": 90,
    "shooting": 92,
    "passing": 78,
    "dribbling": 85,
    "defending": 35,
    "physical": 80
  },
  "achievements": ["Premier League 2022-23", "Champions League 2022-23"],
  "careerHistory": [
    {"club": "Borussia Dortmund", "from": "2020", "to": "2022"},
    {"club": "Manchester City", "from": "2022", "to": "Present"}
  ],
  "scoutReport": {
    "playingStyle": "Description of playing style",
    "strengths": ["Finishing", "Positioning", "Power"],
    "weaknesses": ["Pressing", "Passing range"],
    "tacticalSystems": ["4-3-3", "4-2-3-1"],
    "leadership": "High/Medium/Low",
    "careerStage": "Peak/Rising/Late Career/Legend/Retired"
  },
  "transferAnalysis": {
    "suitabilityScore": 85,
    "recommendedClubs": ["Club1", "Club2"],
    "financialRisk": "Assessment",
    "tacticalFit": "Best tactical role"
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
          console.log(`    ⏳ Rate limited, waiting ${wait}s (attempt ${attempt}/3)...`);
          await new Promise(r => setTimeout(r, wait * 1000));
        } else {
          throw retryErr;
        }
      }
    }

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const json = JSON.parse(cleaned);

    // ── Post-process ──

    // Clamp ratings 1-99
    if (json.ratings) {
      for (const key of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']) {
        json.ratings[key] = clamp(json.ratings[key]);
      }
    }

    // Force deceased from wiki truth
    if (playerData.wikipediaData?.isDeceased) {
      json.isDeceased = true;
      json.isRetired = true;
      json.transferAnalysis = null;
      json.marketValue = 'Retired';
      if (!json.deathYear && playerData.wikipediaData?.deathDate) {
        json.deathYear = new Date(playerData.wikipediaData.deathDate).getFullYear();
      }
    }

    // Force null transfer for retired/deceased
    if (json.isRetired || json.isDeceased) {
      json.transferAnalysis = null;
      if (!json.marketValue || json.marketValue === '—') json.marketValue = 'Retired';
    }

    // Clamp suitability score
    if (json.transferAnalysis?.suitabilityScore) {
      json.transferAnalysis.suitabilityScore = clamp(json.transferAnalysis.suitabilityScore, 0, 100);
    }

    // Ensure arrays
    json.achievements  = Array.isArray(json.achievements)  ? json.achievements  : [];
    json.careerHistory = Array.isArray(json.careerHistory) ? json.careerHistory : [];
    json.altPositions  = Array.isArray(json.altPositions)  ? json.altPositions  : [];

    // Ensure career stats are numbers not null
    if (json.careerStats) {
      for (const key of Object.keys(json.careerStats)) {
        json.careerStats[key] = Number(json.careerStats[key]) || 0;
      }
    }

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
 * Extracts what we can from the verified API data.
 */
function buildFallback(playerData) {
  const pos = normalizePos(playerData.position || '');
  const isDeceased = playerData.wikipediaData?.isDeceased || false;
  const isRetired = isDeceased || false;

  const apiStats = playerData.footballApiData?.statistics?.[0] || {};
  const games    = apiStats.games || {};
  const goalsObj = apiStats.goals || {};
  const cardsObj = apiStats.cards || {};

  const achievements = (playerData.trophies || [])
    .filter(t => t.place === 'Winner')
    .map(t => `${t.league} (${t.season})`);

  const careerHistory = (playerData.transfers || [])
    .map(t => ({
      club: t.teams?.in?.name || t.teams?.out?.name || '',
      from: t.date || '',
      to: t.teams?.in?.name || ''
    }))
    .reverse();

  const ratings = getPositionRatings(pos);
  const deathYear = isDeceased && playerData.wikipediaData?.deathDate
    ? new Date(playerData.wikipediaData.deathDate).getFullYear() : null;

  return {
    isRetired, isDeceased, deathYear, ageAtDeath: null,
    bestPosition: pos, altPositions: [],
    currentClub: apiStats.team?.name || playerData.wikipediaData?.currentTeam || null,
    league: apiStats.league?.name || null,
    marketValue: (isRetired || isDeceased) ? 'Retired' : null,
    careerStats: {
      appearances: games.appearences || 0,
      goals: goalsObj.total || 0,
      assists: goalsObj.assists || 0,
      yellowCards: cardsObj.yellow || 0,
      redCards: cardsObj.red || 0,
      internationalCaps: 0,
      internationalGoals: 0
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
      financialRisk: 'AI unavailable — estimate manually',
      tacticalFit: `${pos} role`
    }
  };
}

// ── Position helpers ──

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
  const out = {};
  for (const k of Object.keys(base)) {
    out[k] = clamp(base[k] + Math.floor(Math.random() * 7) - 3);
  }
  return out;
}

function getPositionStyle(pos) {
  return { GK: 'Commanding shot-stopper.', CB: 'Dominant defender.', CM: 'Box-to-box midfielder.', CAM: 'Creative playmaker.', LW: 'Explosive winger.', ST: 'Clinical striker.' }[pos] || 'Versatile player.';
}
function getPositionStrengths(pos) {
  return { GK: ['Reflexes', 'Positioning'], CB: ['Tackling', 'Heading'], CM: ['Passing', 'Stamina'], CAM: ['Vision', 'Dribbling'], LW: ['Pace', 'Dribbling'], ST: ['Finishing', 'Positioning'] }[pos] || ['Versatility'];
}
function getPositionWeaknesses(pos) {
  return { GK: ['Distribution'], CB: ['Pace'], CM: ['Pace'], CAM: ['Defending'], LW: ['Strength'], ST: ['Pressing'] }[pos] || ['Consistency'];
}

module.exports = { generateFullProfile };
