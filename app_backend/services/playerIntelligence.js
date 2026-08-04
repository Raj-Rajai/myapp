const footballApi = require('./footballApi');
const wikiApi = require('./wikiApi');
const geminiApi = require('./geminiApi');
const { calculateOVR, normalizePosition } = require('./ovrCalculator');

/**
 * Main orchestrator: generates a complete player profile.
 *
 * Architecture:
 * 1. Collect ALL verified data from APIs (Football API + Wikipedia)
 * 2. Pass EVERYTHING to Gemini in a single request — AI analyses, never invents
 * 3. Force-override deceased/retired with Wikipedia ground truth
 * 4. Calculate EA FC OVR from ratings
 * 5. Assemble final player → stored permanently in MongoDB
 *
 * AI is called only ONCE per player. Data lives in MongoDB forever.
 * "Regenerate" button is the only way to re-trigger AI.
 */
async function generatePlayerProfile(playerName, nationality, userImageUrl) {
  console.log(`\n⚽ Building profile: ${playerName} (${nationality})`);

  // ════════════════════════════════════════════════════════════════
  // STEP 1: Collect all verified data from APIs in parallel
  // ════════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════════
  // STEP 2: Extract raw verified fields
  // ════════════════════════════════════════════════════════════════
  const player = apiPlayerData?.player || {};
  const stats  = apiPlayerData?.statistics?.[0] || {};
  const team   = stats.team   || {};
  const league = stats.league || {};

  const birthDate          = player.birth?.date || wikiData?.birthDate || '';
  const deathDate          = wikiData?.deathDate || '';
  const isDeceasedFromWiki = wikiData?.isDeceased || false;

  let imageUrl = userImageUrl || player.photo || wikiData?.image || '';

  // ════════════════════════════════════════════════════════════════
  // STEP 3: Single Gemini call — pass ALL verified data
  // Gemini analyses; it does NOT invent facts
  // ════════════════════════════════════════════════════════════════
  console.log('  ⚙ Calling Gemini (single request)...');

  // Compact the API data to reduce token usage (only send what matters)
  const compactApiData = apiPlayerData ? {
    player: {
      name: player.name,
      nationality: player.nationality,
      age: player.age,
      height: player.height,
      weight: player.weight,
      photo: player.photo,
      birth: player.birth
    },
    statistics: [{
      team:   { name: team.name },
      league: { name: league.name, country: league.country },
      games:  stats.games,
      goals:  stats.goals,
      passes: stats.passes,
      tackles: stats.tackles,
      cards:  stats.cards
    }]
  } : null;

  const compactWiki = wikiData ? {
    birthDate: wikiData.birthDate,
    deathDate: wikiData.deathDate || undefined,
    isDeceased: wikiData.isDeceased || undefined,
    height: wikiData.height,
    weight: wikiData.weight,
    position: wikiData.position,
    foot: wikiData.foot,
    currentTeam: wikiData.teamName,
    nationality: wikiData.nationality
  } : null;

  // Compact trophies — only send winners, deduplicated
  const compactTrophies = trophies
    .filter(t => t.place === 'Winner')
    .map(t => ({ league: t.league, season: t.season }));

  // Compact transfers
  const compactTransfers = transfers.map(t => ({
    date: t.date,
    from: t.teams?.out?.name,
    to: t.teams?.in?.name,
    type: t.type
  }));

  const aiProfile = await geminiApi.generateFullProfile({
    name:           playerName,
    nationality:    player.nationality || wikiData?.nationality || nationality,
    birthDate,
    position:       stats.games?.position || wikiData?.position || 'Unknown',
    club:           team.name || wikiData?.teamName || 'Unknown',
    wikipediaData:  compactWiki,
    footballApiData: compactApiData,
    transfers:      compactTransfers,
    trophies:       compactTrophies
  });

  console.log(`  ✓ AI response received`);

  // ════════════════════════════════════════════════════════════════
  // STEP 4: Force-override deceased/retired with Wikipedia truth
  // Wikipedia is authoritative — AI might still hallucinate
  // ════════════════════════════════════════════════════════════════
  const isDeceased = isDeceasedFromWiki || aiProfile.isDeceased || false;
  const isRetired  = isDeceased || aiProfile.isRetired || false;

  // Age: calculate to death date for deceased, else to today
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

  console.log(`  ✓ Status: retired=${isRetired} | deceased=${isDeceased} | age=${age}`);

  // ════════════════════════════════════════════════════════════════
  // STEP 5: EA FC position-specific OVR
  // ════════════════════════════════════════════════════════════════
  const bestPos = normalizePosition(aiProfile.bestPosition || stats.games?.position || 'CM');
  const ovrAge  = (isRetired || isDeceased) ? 27 : Math.max(15, age);

  const ovrData = calculateOVR(
    { ratings: aiProfile.ratings },
    bestPos,
    aiProfile.altPositions || [],
    ovrAge,
    'average'
  );

  console.log(`  ✓ OVR: ${ovrData.overallRating} (${ovrData.bestPosition})`);

  // ════════════════════════════════════════════════════════════════
  // STEP 6: Merge achievements & career history
  // API-Football data > AI data (AI should pass through API data anyway)
  // ════════════════════════════════════════════════════════════════
  const apiAchievements = buildAchievements(trophies);
  const apiCareerHistory = buildCareerHistory(transfers);

  const achievements = apiAchievements.length > 0
    ? apiAchievements
    : (aiProfile.achievements || []);

  const previousClubs = apiCareerHistory.length > 0
    ? apiCareerHistory
    : (aiProfile.careerHistory || []).map(c => ({
        clubName: c.club || '',
        from: String(c.from || ''),
        to: String(c.to || '')
      }));

  // ════════════════════════════════════════════════════════════════
  // STEP 7: Assemble final player object → saved to MongoDB
  // ════════════════════════════════════════════════════════════════
  const finalPlayer = {
    playerName,
    nationality: player.nationality || wikiData?.nationality || nationality,

    isRetired,
    isDeceased,
    deathYear,

    personal: {
      age,
      height: player.height || wikiData?.height || '',
      weight: player.weight || wikiData?.weight || '',
      preferredFoot: wikiData?.foot || ''
    },

    currentClub: {
      clubName: (isRetired || isDeceased)
        ? (aiProfile.currentClub || '')
        : (team.name || aiProfile.currentClub || wikiData?.teamName || ''),
      league: (isRetired || isDeceased)
        ? ''
        : (league.name || aiProfile.league || '')
    },

    market: {
      transferValue: (isRetired || isDeceased) ? 'Retired' : (aiProfile.marketValue || '—'),
      contractUntil: ''
    },

    statistics: {
      appearances:       aiProfile.careerStats?.appearances    ?? stats.games?.appearences ?? 0,
      goals:             aiProfile.careerStats?.goals          ?? stats.goals?.total       ?? 0,
      assists:           aiProfile.careerStats?.assists        ?? stats.goals?.assists     ?? 0,
      yellowCards:       aiProfile.careerStats?.yellowCards     ?? stats.cards?.yellow      ?? 0,
      redCards:          aiProfile.careerStats?.redCards        ?? stats.cards?.red         ?? 0,
      minutesPlayed:     stats.games?.minutes || 0,
      internationalCaps:  aiProfile.careerStats?.internationalCaps  ?? 0,
      internationalGoals: aiProfile.careerStats?.internationalGoals ?? 0
    },

    ratings: aiProfile.ratings,

    ovrData: {
      overallRating:   ovrData.overallRating,
      baseOVR:         ovrData.baseOVR,
      potentialOVR:    ovrData.potentialOVR,
      bestPosition:    ovrData.bestPosition,
      positionRatings: ovrData.positionRatings,
      ageModifier:     ovrData.ageModifier
    },

    achievements,
    previousClubs,

    aiScoutReport: {
      playingStyle:    aiProfile.scoutReport?.playingStyle    || '',
      strengths:       aiProfile.scoutReport?.strengths       || [],
      weaknesses:      aiProfile.scoutReport?.weaknesses      || [],
      tacticalSystems: aiProfile.scoutReport?.tacticalSystems || [],
      leadership:      aiProfile.scoutReport?.leadership      || '',
      careerStage:     aiProfile.scoutReport?.careerStage     || ''
    },

    aiTransferAnalysis: (isRetired || isDeceased) ? null : (aiProfile.transferAnalysis || null),

    imageUrl
  };

  console.log(`  ✅ Done: ${playerName} — OVR ${ovrData.overallRating} (${ovrData.bestPosition})\n`);
  return finalPlayer;
}

// ── Helpers ─────────────────────────────────────────────────────

function buildCareerHistory(transfers) {
  if (!transfers?.length) return [];
  return transfers
    .map(t => ({
      clubName: t.teams?.in?.name || t.teams?.out?.name || '',
      from: t.date || '',
      to: t.teams?.in?.name || ''
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
