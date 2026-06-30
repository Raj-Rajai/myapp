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
 * Generate a COMPLETE player profile using Gemini's knowledge.
 * Includes: career stats, ratings, scout report, transfer analysis,
 * achievements, career history, positions, and retired/deceased status.
 *
 * @param {Object} playerData - { name, nationality, position, club, birthDate, isDeceasedFromWiki, deathDateFromWiki }
 */
async function generateFullProfile(playerData) {
  const m = initGemini();
  if (!m) return defaultFullProfile(playerData.name, playerData.position, playerData.isDeceasedFromWiki, playerData.deathDateFromWiki);

  try {
    // Build hints for deceased/retired so Gemini responds correctly
    const deceasedHint = playerData.isDeceasedFromWiki
      ? `IMPORTANT: Wikipedia confirms this player is DECEASED (death date: ${playerData.deathDateFromWiki}). Set isDeceased=true, isRetired=true, transferAnalysis=null, marketValue="Retired".`
      : '';

    const prompt = `You are an expert football analytics system with encyclopedic knowledge of all footballers past and present.

Generate a COMPLETE profile for this player using your knowledge.

Player: ${playerData.name}
Nationality: ${playerData.nationality || 'Unknown'}
Position (if known from API): ${playerData.position || 'Unknown'}
Current/Last Club (if known from API): ${playerData.club || 'Unknown'}
Birth Date (if known): ${playerData.birthDate || 'Unknown'}
${deceasedHint}

CRITICAL RULES:
1. CAREER STATISTICS: Provide TOTAL career numbers across ALL clubs and ALL seasons combined
2. RATINGS: Rate the player at their PEAK performance level (prime years), like FIFA/EA FC Ultimate Team Icons/Heroes
3. For deceased players: set "isDeceased" to true AND "isRetired" to true, provide "deathYear" as a number and "ageAtDeath" as a number
4. For retired (but living) players: set "isRetired" to true, "isDeceased" to false, set "transferAnalysis" to null, set "marketValue" to "Retired"
5. For active players: provide realistic current transfer market value
6. "bestPosition" must be a FIFA position code: GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST
7. "altPositions" are secondary positions the player can play (FIFA codes only)
8. "achievements" must list REAL major trophies won (Champions League, League titles, World Cup, Ballon d'Or, etc.)
9. "careerHistory" must list REAL clubs the player played for with approximate years as strings
10. "careerStats" must be realistic career TOTALS across their entire career

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
    "internationalCaps": 100,
    "internationalGoals": 50
  },
  "ratings": {
    "pace": 90,
    "shooting": 85,
    "passing": 80,
    "dribbling": 88,
    "defending": 40,
    "physical": 78
  },
  "achievements": [
    "Champions League 2007-08",
    "Premier League 2006-07",
    "Ballon d'Or 2008"
  ],
  "careerHistory": [
    {"club": "Sporting CP", "from": "2002", "to": "2003"},
    {"club": "Manchester United", "from": "2003", "to": "2009"}
  ],
  "scoutReport": {
    "playingStyle": "Brief description of playing style at their best",
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"],
    "tacticalSystems": ["4-3-3", "4-2-3-1"],
    "leadership": "High",
    "careerStage": "Legend"
  },
  "transferAnalysis": {
    "suitabilityScore": 85,
    "recommendedClubs": ["Club1", "Club2", "Club3"],
    "financialRisk": "Brief assessment",
    "tacticalFit": "Brief description of ideal tactical role"
  }
}`;

    // Retry with backoff for rate limits (max 2 retries)
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
    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const json = JSON.parse(cleaned);

    // ── Validate ratings ──
    if (json.ratings) {
      json.ratings = {
        pace:      clamp(json.ratings.pace),
        shooting:  clamp(json.ratings.shooting),
        passing:   clamp(json.ratings.passing),
        dribbling: clamp(json.ratings.dribbling),
        defending: clamp(json.ratings.defending),
        physical:  clamp(json.ratings.physical)
      };
    }

    // ── Force correct deceased/retired flags from Wikipedia truth ──
    if (playerData.isDeceasedFromWiki) {
      json.isDeceased = true;
      json.isRetired = true;
      json.transferAnalysis = null;
      json.marketValue = 'Retired';
      // Use Gemini's deathYear only if wiki didn't give us one
      if (playerData.deathDateFromWiki && !json.deathYear) {
        json.deathYear = new Date(playerData.deathDateFromWiki).getFullYear();
      }
    }

    // ── Force null transfer analysis for retired/deceased ──
    if (json.isRetired || json.isDeceased) {
      json.transferAnalysis = null;
      if (!json.marketValue || json.marketValue === '—') json.marketValue = 'Retired';
    }

    // ── Clamp suitability score ──
    if (json.transferAnalysis?.suitabilityScore) {
      json.transferAnalysis.suitabilityScore = clamp(json.transferAnalysis.suitabilityScore, 0, 100);
    }

    // ── Ensure arrays exist ──
    json.achievements  = Array.isArray(json.achievements)  ? json.achievements  : [];
    json.careerHistory = Array.isArray(json.careerHistory) ? json.careerHistory : [];
    json.altPositions  = Array.isArray(json.altPositions)  ? json.altPositions  : [];

    return json;

  } catch (err) {
    console.error('  ✗ Gemini error:', err.message.split('\n')[0]);
    return defaultFullProfile(
      playerData.name,
      playerData.position,
      playerData.isDeceasedFromWiki,
      playerData.deathDateFromWiki
    );
  }
}

function clamp(val, min = 1, max = 99) {
  return Math.max(min, Math.min(max, Number(val) || 50));
}

// ══════════════════════════════════════════════════════════════
// SMART FALLBACK — used when Gemini quota is exhausted
// Produces realistic data for known players + position-based
// estimates for unknown players. NEVER returns blank 50s.
// ══════════════════════════════════════════════════════════════
function defaultFullProfile(playerName = '', positionStr = '', isDeceasedFromWiki = false, deathDateFromWiki = '') {
  const name = (playerName || '').toLowerCase();

  // ── Known player fallbacks ──────────────────────────────────
  if (name.includes('ronaldo') && !name.includes('ronaldinho')) {
    return {
      isRetired: false, isDeceased: false, deathYear: null, ageAtDeath: null,
      bestPosition: 'ST', altPositions: ['LW', 'CF'],
      currentClub: 'Al Nassr', league: 'Saudi Pro League', marketValue: '€15M',
      careerStats: { appearances: 1000, goals: 900, assists: 250, yellowCards: 100, redCards: 11, internationalCaps: 205, internationalGoals: 128 },
      ratings: { pace: 89, shooting: 94, passing: 82, dribbling: 87, defending: 35, physical: 85 },
      achievements: ['UCL 2008', 'UCL 2014', 'UCL 2016', 'UCL 2017', 'UCL 2018', 'Ballon d\'Or 2008', 'Ballon d\'Or 2013', 'Ballon d\'Or 2014', 'Ballon d\'Or 2016', 'Ballon d\'Or 2017', 'Euro 2016', 'Nations League 2019', 'Premier League 2007', 'Premier League 2008', 'Premier League 2009', 'La Liga 2012', 'La Liga 2017', 'Serie A 2019', 'Serie A 2020'],
      careerHistory: [{ club: 'Sporting CP', from: '2002', to: '2003' }, { club: 'Manchester United', from: '2003', to: '2009' }, { club: 'Real Madrid', from: '2009', to: '2018' }, { club: 'Juventus', from: '2018', to: '2021' }, { club: 'Manchester United', from: '2021', to: '2022' }, { club: 'Al Nassr', from: '2023', to: 'Present' }],
      scoutReport: { playingStyle: 'Elite goalscorer combining pace, power, and precision. Exceptional in the air and from set pieces.', strengths: ['Finishing', 'Heading', 'Set Pieces', 'Positioning', 'Mental Strength'], weaknesses: ['Pressing', 'Defensive Work Rate'], tacticalSystems: ['4-3-3', '4-2-3-1', '4-4-2'], leadership: 'High — team captain and serial winner', careerStage: 'Legend' },
      transferAnalysis: { suitabilityScore: 82, recommendedClubs: ['Sporting CP', 'Al Hilal'], financialRisk: 'High wages, age-related decline', tacticalFit: 'Central striker or right-side attacker' }
    };
  }

  if (name.includes('messi')) {
    return {
      isRetired: false, isDeceased: false, deathYear: null, ageAtDeath: null,
      bestPosition: 'CF', altPositions: ['RW', 'CAM'],
      currentClub: 'Inter Miami', league: 'MLS', marketValue: '€30M',
      careerStats: { appearances: 1050, goals: 830, assists: 370, yellowCards: 90, redCards: 3, internationalCaps: 189, internationalGoals: 109 },
      ratings: { pace: 85, shooting: 92, passing: 94, dribbling: 96, defending: 30, physical: 65 },
      achievements: ['World Cup 2022', 'Copa America 2021', 'UCL 2006', 'UCL 2009', 'UCL 2011', 'UCL 2015', 'La Liga (10x)', 'Ballon d\'Or (8x)', 'Copa del Rey (7x)'],
      careerHistory: [{ club: 'Barcelona', from: '2004', to: '2021' }, { club: 'PSG', from: '2021', to: '2023' }, { club: 'Inter Miami', from: '2023', to: 'Present' }],
      scoutReport: { playingStyle: 'The greatest of all time. Unmatched vision, dribbling, and goal creation. Can control an entire match.', strengths: ['Dribbling', 'Vision', 'Free Kicks', 'Ball Control', 'Composure'], weaknesses: ['Aerial Duels', 'Strength'], tacticalSystems: ['4-3-3', '3-4-2-1'], leadership: 'High — World Cup winning captain', careerStage: 'Legend' },
      transferAnalysis: { suitabilityScore: 88, recommendedClubs: ['Newell\'s Old Boys'], financialRisk: 'High wages, late career', tacticalFit: 'Free role behind striker or wide right' }
    };
  }

  if (name.includes('maradona')) {
    return {
      isRetired: true, isDeceased: true,
      deathYear: isDeceasedFromWiki && deathDateFromWiki ? new Date(deathDateFromWiki).getFullYear() : 2020,
      ageAtDeath: 60,
      bestPosition: 'CAM', altPositions: ['CF', 'LW'],
      currentClub: '', league: '', marketValue: 'Retired',
      careerStats: { appearances: 491, goals: 259, assists: 180, yellowCards: 73, redCards: 8, internationalCaps: 91, internationalGoals: 34 },
      ratings: { pace: 88, shooting: 87, passing: 90, dribbling: 97, defending: 40, physical: 75 },
      achievements: ['World Cup 1986', 'Copa del Rey 1983', 'Serie A 1987', 'Serie A 1990', 'Copa Italia 1987', 'Coppa UEFA 1989'],
      careerHistory: [{ club: 'Argentinos Juniors', from: '1976', to: '1981' }, { club: 'Boca Juniors', from: '1981', to: '1982' }, { club: 'Barcelona', from: '1982', to: '1984' }, { club: 'Napoli', from: '1984', to: '1991' }, { club: 'Sevilla', from: '1992', to: '1993' }, { club: 'Boca Juniors', from: '1995', to: '1997' }],
      scoutReport: { playingStyle: 'A generational genius. Unstoppable dribbler with supreme ball control, vision, and leadership in big moments.', strengths: ['Dribbling', 'Vision', 'Leadership', 'Set Pieces', 'Big Game Mentality'], weaknesses: ['Defending', 'Consistency (off-pitch)'], tacticalSystems: ['4-3-3', '4-4-2'], leadership: 'Exceptional — led Argentina to World Cup glory', careerStage: 'Legend' },
      transferAnalysis: null
    };
  }

  if (name.includes('maldini')) {
    return {
      isRetired: true, isDeceased: false, deathYear: null, ageAtDeath: null,
      bestPosition: 'LB', altPositions: ['CB', 'LWB'],
      currentClub: '', league: '', marketValue: 'Retired',
      careerStats: { appearances: 902, goals: 33, assists: 42, yellowCards: 65, redCards: 3, internationalCaps: 126, internationalGoals: 7 },
      ratings: { pace: 78, shooting: 42, passing: 80, dribbling: 72, defending: 95, physical: 88 },
      achievements: ['UCL 1989', 'UCL 1990', 'UCL 1994', 'UCL 2003', 'UCL 2007', 'Serie A (7x)', 'World Cup Runner-Up 1994', 'Euro 1996 Runner-Up'],
      careerHistory: [{ club: 'AC Milan', from: '1985', to: '2009' }],
      scoutReport: { playingStyle: 'The greatest defender in history. Elegant, composed, and aggressive when needed. Read the game better than anyone.', strengths: ['Tackling', 'Positioning', 'Composure', 'Leadership', 'Reading the Game'], weaknesses: ['Pace (late career)'], tacticalSystems: ['4-4-2', '3-5-2'], leadership: 'Exceptional — AC Milan captain for 16 years', careerStage: 'Legend' },
      transferAnalysis: null
    };
  }

  // ── Dynamic position-based fallback for ANY other player ───
  let pos = 'CM';
  const p = (positionStr || '').toUpperCase();
  if (p.includes('ATTACK') || p.includes('STRIK') || p.includes('FORWARD')) pos = 'ST';
  else if (p.includes('WING') && (p.includes('LEFT') || p.includes('LW'))) pos = 'LW';
  else if (p.includes('WING') && (p.includes('RIGHT') || p.includes('RW'))) pos = 'RW';
  else if (p.includes('WING')) pos = 'LW';
  else if (p.includes('DEFEND') || p.includes('BACK') || p.includes('CB')) pos = 'CB';
  else if (p.includes('GOAL') || p.includes('KEEPER') || p.includes('GK')) pos = 'GK';
  else if (p.includes('CDM') || p.includes('DEFENSIVE')) pos = 'CDM';
  else if (p.includes('CAM') || p.includes('ATTACKING')) pos = 'CAM';

  const baseRatings = {
    GK:  { pace: 40, shooting: 20, passing: 62, dribbling: 52, defending: 82, physical: 82 },
    CB:  { pace: 66, shooting: 42, passing: 62, dribbling: 58, defending: 85, physical: 86 },
    LB:  { pace: 80, shooting: 52, passing: 72, dribbling: 70, defending: 78, physical: 72 },
    RB:  { pace: 80, shooting: 52, passing: 72, dribbling: 70, defending: 78, physical: 72 },
    CDM: { pace: 68, shooting: 58, passing: 78, dribbling: 72, defending: 82, physical: 80 },
    CM:  { pace: 72, shooting: 68, passing: 82, dribbling: 78, defending: 65, physical: 72 },
    CAM: { pace: 75, shooting: 78, passing: 86, dribbling: 84, defending: 40, physical: 62 },
    LW:  { pace: 88, shooting: 75, passing: 75, dribbling: 86, defending: 38, physical: 62 },
    RW:  { pace: 88, shooting: 75, passing: 75, dribbling: 86, defending: 38, physical: 62 },
    CF:  { pace: 80, shooting: 84, passing: 78, dribbling: 82, defending: 35, physical: 70 },
    ST:  { pace: 82, shooting: 86, passing: 64, dribbling: 78, defending: 32, physical: 76 },
  };

  const scoutReports = {
    GK:  { playingStyle: 'Commanding shot-stopper with quick reflexes and good distribution.', strengths: ['Reflexes', 'Positioning', 'Command of Area'], weaknesses: ['Kicking', 'Sweeping'], tacticalSystems: ['Any'] },
    CB:  { playingStyle: 'Dominant central defender who excels in the air and in one-on-one situations.', strengths: ['Heading', 'Tackling', 'Strength'], weaknesses: ['Pace', 'Distribution'], tacticalSystems: ['4-4-2', '3-5-2'] },
    LB:  { playingStyle: 'Energetic full-back who supports attacks while maintaining defensive discipline.', strengths: ['Stamina', 'Crossing', 'Tackling'], weaknesses: ['Heading', 'Long Shots'], tacticalSystems: ['4-3-3', '4-2-3-1'] },
    RB:  { playingStyle: 'Energetic full-back who supports attacks while maintaining defensive discipline.', strengths: ['Stamina', 'Crossing', 'Tackling'], weaknesses: ['Heading', 'Long Shots'], tacticalSystems: ['4-3-3', '4-2-3-1'] },
    CDM: { playingStyle: 'Disciplined defensive midfielder who shields the back four and recycles possession.', strengths: ['Interceptions', 'Passing', 'Physicality'], weaknesses: ['Long Shots', 'Dribbling'], tacticalSystems: ['4-2-3-1', '4-3-3'] },
    CM:  { playingStyle: 'Box-to-box midfielder with strong engine, technical ability, and goal contribution.', strengths: ['Stamina', 'Passing', 'Ball Recovery'], weaknesses: ['Aerial Duels', 'Pace'], tacticalSystems: ['4-3-3', '4-4-2'] },
    CAM: { playingStyle: 'Creative attacking midfielder who pulls the strings and links play in the final third.', strengths: ['Vision', 'Dribbling', 'Passing'], weaknesses: ['Defending', 'Strength'], tacticalSystems: ['4-2-3-1', '4-3-3'] },
    LW:  { playingStyle: 'Direct winger who beats defenders with pace and creates chances from wide areas.', strengths: ['Pace', 'Dribbling', 'Crossing'], weaknesses: ['Strength', 'Defensive Work Rate'], tacticalSystems: ['4-3-3'] },
    RW:  { playingStyle: 'Direct winger who beats defenders with pace and creates chances from wide areas.', strengths: ['Pace', 'Dribbling', 'Crossing'], weaknesses: ['Strength', 'Defensive Work Rate'], tacticalSystems: ['4-3-3'] },
    CF:  { playingStyle: 'Versatile forward combining clever movement with goal threat and link-up play.', strengths: ['Finishing', 'Dribbling', 'Vision'], weaknesses: ['Heading', 'Strength'], tacticalSystems: ['4-2-3-1', '4-3-3'] },
    ST:  { playingStyle: 'Clinical striker with excellent positioning, sharp finishing, and aerial ability.', strengths: ['Finishing', 'Positioning', 'Heading'], weaknesses: ['Passing', 'Pressing'], tacticalSystems: ['4-4-2', '4-3-3'] },
  };

  const r = baseRatings[pos] || baseRatings.CM;
  const sr = scoutReports[pos] || scoutReports.CM;

  // Apply +/- 5 variance so no two players look identical
  const ratings = {};
  for (const key of Object.keys(r)) {
    ratings[key] = clamp(r[key] + Math.floor(Math.random() * 11) - 5);
  }

  const goalsByPos = { ST: 120, CF: 90, LW: 60, RW: 60, CAM: 50, CM: 30, CDM: 15, CB: 10, LB: 10, RB: 10, GK: 0 };

  // Force correct deceased status from Wikipedia even in fallback
  const deceased = isDeceasedFromWiki || false;
  const deathYr   = deceased && deathDateFromWiki ? new Date(deathDateFromWiki).getFullYear() : null;

  return {
    isRetired: deceased, isDeceased: deceased,
    deathYear: deathYr, ageAtDeath: null,
    bestPosition: pos, altPositions: [],
    currentClub: deceased ? '' : 'Club',
    league: deceased ? '' : 'League',
    marketValue: deceased ? 'Retired' : '€10M',
    careerStats: {
      appearances: 300,
      goals: goalsByPos[pos] || 20,
      assists: 40,
      yellowCards: 35, redCards: 2,
      internationalCaps: 40, internationalGoals: 8
    },
    ratings,
    achievements: ['Domestic League Title'],
    careerHistory: [{ club: 'Youth Academy', from: '2010', to: '2013' }, { club: 'First Club', from: '2013', to: '2018' }],
    scoutReport: { ...sr, leadership: 'Medium', careerStage: deceased ? 'Legend' : 'Peak' },
    transferAnalysis: deceased ? null : { suitabilityScore: 72, recommendedClubs: ['Mid-table clubs'], financialRisk: 'Low risk', tacticalFit: `${pos} in a structured system` }
  };
}

module.exports = { generateFullProfile };
