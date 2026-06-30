const axios = require('axios');

const WIKI_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKI_API_URL = 'https://en.wikipedia.org/w/api.php';

/**
 * Fetch player personal data from Wikipedia.
 * Gets: image, description, height, weight, birth date, position, etc.
 */
async function getPlayerData(playerName) {
  try {
    // Step 1: Get page summary (has image + short description)
    const summary = await getPageSummary(playerName);
    if (!summary) return null;

    // Step 2: Get infobox data via parse API for structured fields
    const infobox = await getInfoboxData(summary.title || playerName);

    return {
      image: summary.thumbnail?.source || summary.originalimage?.source || '',
      description: summary.extract || '',
      birthDate: infobox.birthDate || '',
      height: infobox.height || '',
      weight: infobox.weight || '',
      position: infobox.position || '',
      foot: infobox.foot || '',
      teamName: infobox.currentTeam || '',
      nationality: infobox.nationality || '',
      wikiUrl: summary.content_urls?.desktop?.page || ''
    };
  } catch (err) {
    console.error('Wikipedia API error:', err.message);
    return null;
  }
}

/**
 * Get Wikipedia page summary for a player.
 */
async function getPageSummary(playerName) {
  try {
    // URL-encode the name (spaces → underscores for Wikipedia)
    const encodedName = encodeURIComponent(playerName.replace(/ /g, '_'));
    const res = await axios.get(`${WIKI_SUMMARY_URL}/${encodedName}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'FootballTransferHub/1.0' }
    });
    return res.data;
  } catch (err) {
    // Try search if direct lookup fails
    try {
      const searchResult = await searchWikipedia(playerName);
      if (searchResult) {
        const res = await axios.get(`${WIKI_SUMMARY_URL}/${encodeURIComponent(searchResult)}`, {
          timeout: 10000,
          headers: { 'User-Agent': 'FootballTransferHub/1.0' }
        });
        return res.data;
      }
    } catch (searchErr) {
      console.error('Wikipedia search fallback error:', searchErr.message);
    }
    return null;
  }
}

/**
 * Search Wikipedia for a player page.
 */
async function searchWikipedia(query) {
  try {
    const res = await axios.get(WIKI_API_URL, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: `${query} footballer`,
        format: 'json',
        srlimit: 3
      },
      timeout: 10000,
      headers: { 'User-Agent': 'FootballTransferHub/1.0' }
    });

    const results = res.data?.query?.search || [];
    if (results.length > 0) {
      return results[0].title;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Parse Wikipedia infobox for structured player data.
 */
async function getInfoboxData(pageTitle) {
  try {
    const res = await axios.get(WIKI_API_URL, {
      params: {
        action: 'parse',
        page: pageTitle,
        prop: 'wikitext',
        section: 0,
        format: 'json'
      },
      timeout: 10000,
      headers: { 'User-Agent': 'FootballTransferHub/1.0' }
    });

    const wikitext = res.data?.parse?.wikitext?.['*'] || '';
    return parseInfobox(wikitext);
  } catch (err) {
    return {};
  }
}

/**
 * Parse wikitext infobox to extract player fields.
 */
function parseInfobox(wikitext) {
  const data = {};

  // Birth date
  const birthMatch = wikitext.match(/birth_date\s*=.*?(\d{4})[|\-/](\d{1,2})[|\-/](\d{1,2})/);
  if (birthMatch) {
    data.birthDate = `${birthMatch[1]}-${birthMatch[2].padStart(2, '0')}-${birthMatch[3].padStart(2, '0')}`;
  }

  // Death date
  const deathMatch = wikitext.match(/death_date\s*=.*?(\d{4})[|\-/](\d{1,2})[|\-/](\d{1,2})/);
  if (deathMatch) {
    data.deathDate = `${deathMatch[1]}-${deathMatch[2].padStart(2, '0')}-${deathMatch[3].padStart(2, '0')}`;
    data.isDeceased = true;
  }

  // Height — match patterns like "1.87 m", "1.87m", "{{height|m=1.87}}"
  const heightMatch = wikitext.match(/height\s*=\s*(?:{{.*?[\|=])?(\d\.\d{2})\s*m/i)
    || wikitext.match(/height\s*=.*?(\d\.\d{2})/);
  if (heightMatch) {
    data.height = `${heightMatch[1]} m`;
  }

  // Weight
  const weightMatch = wikitext.match(/weight\s*=\s*(\d{2,3})\s*kg/i);
  if (weightMatch) {
    data.weight = `${weightMatch[1]} kg`;
  }

  // Position
  const posMatch = wikitext.match(/position\s*=\s*\[?\[?([^\]\|\}\n]+)/i);
  if (posMatch) {
    data.position = posMatch[1].replace(/\[|\]/g, '').trim();
  }

  // Preferred foot
  const footMatch = wikitext.match(/(?:preferred_)?foot\s*=\s*(\w+)/i);
  if (footMatch) {
    data.foot = footMatch[1].trim();
  }

  // Current team
  const teamMatch = wikitext.match(/currentclub\s*=\s*\[?\[?([^\]\|\}\n]+)/i)
    || wikitext.match(/current_club\s*=\s*\[?\[?([^\]\|\}\n]+)/i);
  if (teamMatch) {
    data.currentTeam = teamMatch[1].replace(/\[|\]/g, '').trim();
  }

  // Nationality — often in birth_place
  const natMatch = wikitext.match(/birth_place\s*=.*?\[\[([^\]\|]+)/i);
  if (natMatch) {
    data.nationality = natMatch[1].trim();
  }

  return data;
}

/**
 * Get player image from Wikipedia.
 */
async function getPlayerImage(playerName) {
  try {
    const data = await getPlayerData(playerName);
    return data?.image || '';
  } catch {
    return '';
  }
}

module.exports = {
  getPlayerData,
  getPlayerImage
};
