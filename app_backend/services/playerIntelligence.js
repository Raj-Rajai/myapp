const footballApi = require('./footballApi');
const wikiApi = require('./wikiApi');
const geminiApi = require('./geminiApi');
const { calculateOVR, normalizePosition } = require('./ovrCalculator');

/**
 * Main orchestrator: generates a complete player profile.
 *
 * The AI (Gemini) is called only ONCE — at profile creation time.
 * All data is stored permanently in MongoDB.
 * The "Regenerate" button explicitly calls this again to refresh.
 *
 * Flow:
 * 1. Fetch from API-Football + Wikipedia in parallel
 * 2. Call Gemini — passing wiki deceased/death truth so AI knows
 * 3. Force-override retired/deceased flags with Wikipedia ground truth
 * 4. Calculate EA FC position-specific OVR
 * 5. Assemble and return the final player object for MongoDB
 */
async function generatePlayerProfile(playerName, nationality, userImageUrl) {
  console.log(`\n⚽ Building profile: ${playerName} (${nationality})`);

  // ──────────────────────────────────────────────────────────────
  // STEP 1: Parallel fetch from API-Football + Wikipedia
  // ──────────────────────────────────────────────────────────────
  const searchResults = await footballApi.searchPlayer(playerName);

  let apiPlayerData = null;
  let playerId = null;

  if (searchResults.length > 0) {
    const match = searchResults.find(r => {
      const nat = (r.player?.nationality || '').toLowerCase();
      return nat.includes(nationality.toLowerCase());
    }) || searchResults[0];
    apiPlayerData = match;
    playerId = match.player?.id;
    console.log(`  ✓ API-Football: ID ${playerId}`);
  } else {
    console.log(`  ✗ Not on API-Football`);
  }

  const [transfers, trophies, wikiData] = await Promise.all([
    playerId ? footballApi.getPlayerTransfers(playerId) : Promise.resolve([]),
    playerId ? footballApi.getPlayerTrophies(playerId)  : Promise.resolve([]),
    wikiApi.getPlayerData(playerName)
  ]);

  console.log(`  ✓ Transfers: ${transfers.length} | Trophies: ${trophies.length} | Wiki: ${wikiData ? 'Yes' : 'No'}`);

  // ──────────────────────────────────────────────────────────────
  // STEP 2: Extract raw data
  // ──────────────────────────────────────────────────────────────
  const player = apiPlayerData?.player || {};
  const stats  = apiPlayerData?.statistics?.[0] || {};
  const team   = stats.team   || {};
  const league = stats.league || {};

  const birthDate        = player.birth?.date || wikiData?.birthDate || '';
  const deathDate        = wikiData?.deathDate || '';
  // Wikipedia is the single source of truth for deceased status
  const isDeceasedFromWiki = wikiData?.isDeceased || false;

  let imageUrl = userImageUrl || player.photo || wikiData?.image || '';

  // ──────────────────────────────────────────────────────────────
  // STEP 3: Call Gemini — pass wiki deceased info so AI knows
  // ──────────────────────────────────────────────────────────────
  console.log('  ⚙ Calling Gemini...');

  const aiProfile = await geminiApi.generateFullProfile({
    name:               playerName,
    nationality:        player.nationality || wikiData?.nationality || nationality,
    position:           stats.games?.position || wikiData?.position || 'Unknown',
    club:               team.name || wikiData?.teamName || 'Unknown',
    birthDate,
    // Pass wiki truth to AI
    isDeceasedFromWiki,
    deathDateFromWiki: deathDate
  });

  // ──────────────────────────────────────────────────────────────
  // STEP 4: Force-override deceased/retired with Wikipedia truth
  // Wikipedia is authoritative; AI may still hallucinate on this
  // ──────────────────────────────────────────────────────────────
  const isDeceased = isDeceasedFromWiki || aiProfile.isDeceased || false;
  const isRetired  = isDeceased || aiProfile.isRetired || false;

  // Compute age: use age-at-death for deceased, else current age
  let age = 0;
  if (birthDate) {
    const endDate = (isDeceased && deathDate) ? new Date(deathDate) : new Date();
    const birth   = new Date(birthDate);
    age = endDate.getFullYear() - birth.getFullYear();
    const m = endDate.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birth.getDate())) age--;
  }
  if (isDeceased && aiProfile.ageAtDeath) age = aiProfile.ageAtDeath;

  const deathYear = isDeceased
    ? (deathDate ? new Date(deathDate).getFullYear() : aiProfile.deathYear || null)
    : null;

  console.log(`  ✓ Status: retired=${isRetired} | deceased=${isDeceased} | age=${age} | pos=${aiProfile.bestPosition}`);

  // ──────────────────────────────────────────────────────────────
  // STEP 5: EA FC position-specific OVR calculation
  // ──────────────────────────────────────────────────────────────
  const bestPos = normalizePosition(aiProfile.bestPosition || stats.games?.position || 'CM');
  // For retired/deceased, freeze age at prime (27) for OVR purposes
  const ovrAge  = (isRetired || isDeceased) ? 27 : Math.max(15, age);

  const ovrData = calculateOVR(
    { ratings: aiProfile.ratings },
    bestPos,
    aiProfile.altPositions || [],
    ovrAge,
    'average'
  );

  console.log(`  ✓ OVR: ${ovrData.overallRating} as ${ovrData.bestPosition}`);

  // ──────────────────────────────────────────────────────────────
  // STEP 6: Merge achievements & career history
  // Prefer API-Football (real verified data), fall back to AI
  // ──────────────────────────────────────────────────────────────
  const apiAchievements  = buildAchievements(trophies);
  const apiTransferHistory = buildTransferHistory(transfers);

  const achievements  = apiAchievements.length   > 0 ? apiAchievements   : (aiProfile.achievements || []);
  const previousClubs = apiTransferHistory.length > 0 ? apiTransferHistory
    : (aiProfile.careerHistory || []).map(c => ({
        clubName: c.club || '',
        from:     String(c.from || ''),
        to:       String(c.to  || '')
      }));

  // ──────────────────────────────────────────────────────────────
  // STEP 7: Assemble final player object (stored in MongoDB)
  // ──────────────────────────────────────────────────────────────
  return {
    playerName,
    nationality: player.nationality || wikiData?.nationality || nationality,

    isRetired,
    isDeceased,
    deathYear,

    personal: {
      age,
      height:        player.height || wikiData?.height || '',
      weight:        player.weight || wikiData?.weight || '',
      preferredFoot: wikiData?.foot || ''
    },

    currentClub: {
      clubName: isDeceased ? '' : (team.name || aiProfile.currentClub || wikiData?.teamName || ''),
      league:   isDeceased ? '' : (league.name || aiProfile.league || '')
    },

    market: {
      transferValue: (isRetired || isDeceased) ? 'Retired' : (aiProfile.marketValue || '—'),
      contractUntil: ''
    },

    statistics: {
      appearances:      aiProfile.careerStats?.appearances      || 0,
      goals:            aiProfile.careerStats?.goals            || 0,
      assists:          aiProfile.careerStats?.assists          || 0,
      yellowCards:      aiProfile.careerStats?.yellowCards      || 0,
      redCards:         aiProfile.careerStats?.redCards         || 0,
      minutesPlayed:    0,
      internationalCaps:   aiProfile.careerStats?.internationalCaps   || 0,
      internationalGoals:  aiProfile.careerStats?.internationalGoals  || 0
    },

    ratings: aiProfile.ratings,

    ovrData: {
      overallRating:  ovrData.overallRating,
      baseOVR:        ovrData.baseOVR,
      potentialOVR:   ovrData.potentialOVR,
      bestPosition:   ovrData.bestPosition,
      positionRatings: ovrData.positionRatings,
      ageModifier:    ovrData.ageModifier
    },

    achievements,
    previousClubs,

    aiScoutReport: {
      playingStyle:   aiProfile.scoutReport?.playingStyle   || '',
      strengths:      aiProfile.scoutReport?.strengths      || [],
      weaknesses:     aiProfile.scoutReport?.weaknesses     || [],
      tacticalSystems: aiProfile.scoutReport?.tacticalSystems || [],
      leadership:     aiProfile.scoutReport?.leadership     || '',
      careerStage:    aiProfile.scoutReport?.careerStage    || ''
    },

    // Null for retired/deceased — never show transfer section for them
    aiTransferAnalysis: (isRetired || isDeceased) ? null : (aiProfile.transferAnalysis || null),

    imageUrl
  };
}

// ── Helpers ──────────────────────────────────────────────────

function buildTransferHistory(transfers) {
  if (!transfers?.length) return [];
  return transfers
    .map(t => ({
      clubName: t.teams?.in?.name  || t.teams?.out?.name || 'Unknown',
      from:     t.date             || '',
      to:       t.teams?.in?.name  || ''
    }))
    .reverse();
}

function buildAchievements(trophies) {
  if (!trophies?.length) return [];
  const won = trophies
    .filter(t => t.place === 'Winner')
    .map(t => `${t.league} (${t.season})`);
  return [...new Set(won)].slice(0, 30);
}

module.exports = { generatePlayerProfile };
