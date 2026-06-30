/**
 * EA FC-Inspired Overall Rating Calculator
 * 
 * Uses position-specific weighted attribute systems.
 * Each position has different weights totaling 100%.
 * Includes age potential, form modifiers, and multi-position ratings.
 */

// ══════════════════════════════════════════════════
// POSITION WEIGHT TABLES (total = 1.0 for each)
// ══════════════════════════════════════════════════

const POSITION_WEIGHTS = {
  // ── GOALKEEPERS ──
  GK: {
    // GK is special: uses defending as reflexes proxy, physical as handling proxy
    pace: 0.05, shooting: 0.00, passing: 0.10,
    dribbling: 0.05, defending: 0.35, physical: 0.45
    // Defending → positioning/reflexes; Physical → handling/diving/strength
  },

  // ── DEFENDERS ──
  CB: {
    pace: 0.10, shooting: 0.02, passing: 0.08,
    dribbling: 0.08, defending: 0.42, physical: 0.30
    // CB: Defending is king, then physical presence for aerial/strength
  },
  LB: {
    pace: 0.22, shooting: 0.04, passing: 0.14,
    dribbling: 0.12, defending: 0.30, physical: 0.18
    // LB: Needs pace to overlap + defending solidity
  },
  RB: {
    pace: 0.22, shooting: 0.04, passing: 0.14,
    dribbling: 0.12, defending: 0.30, physical: 0.18
    // RB: Mirror of LB
  },
  LWB: {
    pace: 0.24, shooting: 0.06, passing: 0.18,
    dribbling: 0.16, defending: 0.20, physical: 0.16
    // LWB: More attacking than LB, needs pace + passing for wing play
  },
  RWB: {
    pace: 0.24, shooting: 0.06, passing: 0.18,
    dribbling: 0.16, defending: 0.20, physical: 0.16
    // RWB: Mirror of LWB
  },

  // ── MIDFIELDERS ──
  CDM: {
    pace: 0.08, shooting: 0.04, passing: 0.20,
    dribbling: 0.14, defending: 0.32, physical: 0.22
    // CDM: Shield the backline, needs defending + physical + passing distribution
  },
  CM: {
    pace: 0.10, shooting: 0.12, passing: 0.26,
    dribbling: 0.20, defending: 0.16, physical: 0.16
    // CM: Box-to-box, balanced with passing emphasis
  },
  CAM: {
    pace: 0.12, shooting: 0.22, passing: 0.26,
    dribbling: 0.24, defending: 0.04, physical: 0.12
    // CAM: Creative hub, passing + dribbling + shooting in final third
  },
  LM: {
    pace: 0.20, shooting: 0.14, passing: 0.20,
    dribbling: 0.22, defending: 0.08, physical: 0.16
    // LM: Width provider, needs pace + dribbling + passing
  },
  RM: {
    pace: 0.20, shooting: 0.14, passing: 0.20,
    dribbling: 0.22, defending: 0.08, physical: 0.16
    // RM: Mirror of LM
  },

  // ── ATTACKERS ──
  LW: {
    pace: 0.24, shooting: 0.18, passing: 0.12,
    dribbling: 0.28, defending: 0.02, physical: 0.16
    // LW: Beat defenders with pace + dribbling, cut inside to shoot
  },
  RW: {
    pace: 0.24, shooting: 0.18, passing: 0.12,
    dribbling: 0.28, defending: 0.02, physical: 0.16
    // RW: Mirror of LW
  },
  CF: {
    pace: 0.14, shooting: 0.26, passing: 0.18,
    dribbling: 0.24, defending: 0.02, physical: 0.16
    // CF: Link play + finishing, needs shooting + dribbling + passing
  },
  ST: {
    pace: 0.18, shooting: 0.32, passing: 0.08,
    dribbling: 0.18, defending: 0.02, physical: 0.22
    // ST: Pure goal scorer, shooting is paramount, then physical for hold-up
  }
};

// ══════════════════════════════════════════════════
// AGE POTENTIAL MODIFIERS
// ══════════════════════════════════════════════════

function getAgePotentialModifier(age) {
  if (age <= 17) return { label: 'Wonderkid', potentialBoost: 15, decayFactor: 0 };
  if (age <= 20) return { label: 'High Potential', potentialBoost: 10, decayFactor: 0 };
  if (age <= 24) return { label: 'Developing', potentialBoost: 5, decayFactor: 0 };
  if (age <= 29) return { label: 'Peak', potentialBoost: 0, decayFactor: 0 };
  if (age <= 32) return { label: 'Experienced', potentialBoost: 0, decayFactor: -1 };
  if (age <= 35) return { label: 'Veteran', potentialBoost: 0, decayFactor: -2 };
  return { label: 'Legacy', potentialBoost: 0, decayFactor: -3 };
}

// ══════════════════════════════════════════════════
// FORM MODIFIERS
// ══════════════════════════════════════════════════

function getFormModifier(form) {
  const formMap = {
    'world_class': 3,
    'excellent': 2,
    'good': 1,
    'average': 0,
    'below_average': -1,
    'poor': -2,
    'terrible': -3
  };
  return formMap[form] || 0;
}

// ══════════════════════════════════════════════════
// POSITION-SPECIFIC OVR CALCULATORS
// ══════════════════════════════════════════════════

function calculatePositionOVR(ratings, position) {
  const weights = POSITION_WEIGHTS[position];
  if (!weights) return 50;

  const ovr =
    (ratings.pace || 50) * weights.pace +
    (ratings.shooting || 50) * weights.shooting +
    (ratings.passing || 50) * weights.passing +
    (ratings.dribbling || 50) * weights.dribbling +
    (ratings.defending || 50) * weights.defending +
    (ratings.physical || 50) * weights.physical;

  return Math.round(ovr);
}

// Individual position functions
function calculateGK(player) { return calculatePositionOVR(player.ratings, 'GK'); }
function calculateCB(player) { return calculatePositionOVR(player.ratings, 'CB'); }
function calculateLB(player) { return calculatePositionOVR(player.ratings, 'LB'); }
function calculateRB(player) { return calculatePositionOVR(player.ratings, 'RB'); }
function calculateLWB(player) { return calculatePositionOVR(player.ratings, 'LWB'); }
function calculateRWB(player) { return calculatePositionOVR(player.ratings, 'RWB'); }
function calculateCDM(player) { return calculatePositionOVR(player.ratings, 'CDM'); }
function calculateCM(player) { return calculatePositionOVR(player.ratings, 'CM'); }
function calculateCAM(player) { return calculatePositionOVR(player.ratings, 'CAM'); }
function calculateLM(player) { return calculatePositionOVR(player.ratings, 'LM'); }
function calculateRM(player) { return calculatePositionOVR(player.ratings, 'RM'); }
function calculateLW(player) { return calculatePositionOVR(player.ratings, 'LW'); }
function calculateRW(player) { return calculatePositionOVR(player.ratings, 'RW'); }
function calculateCF(player) { return calculatePositionOVR(player.ratings, 'CF'); }
function calculateST(player) { return calculatePositionOVR(player.ratings, 'ST'); }

// ══════════════════════════════════════════════════
// MASTER OVR CALCULATOR
// ══════════════════════════════════════════════════

/**
 * Calculate complete OVR data for a player.
 *
 * @param {Object} player - Player object with ratings, position, age
 * @param {string} bestPosition - The player's best/primary position (e.g. 'ST', 'LW', 'CB')
 * @param {string[]} altPositions - Alternative positions (e.g. ['RW', 'CF'])
 * @param {number} age - Player's age
 * @param {string} form - Form level ('excellent', 'good', 'average', 'poor')
 * @returns {Object} Complete OVR breakdown
 */
function calculateOVR(player, bestPosition, altPositions = [], age = 25, form = 'average') {
  const ratings = player.ratings || {};
  const pos = normalizePosition(bestPosition);

  // Base OVR at best position
  const baseOVR = calculatePositionOVR(ratings, pos);

  // Age modifier
  const ageData = getAgePotentialModifier(age);

  // Form modifier
  const formMod = getFormModifier(form);

  // Potential OVR
  const potentialOVR = Math.min(99, baseOVR + ageData.potentialBoost);

  // Form-adjusted OVR
  const formOVR = Math.max(1, Math.min(99, baseOVR + formMod + ageData.decayFactor));

  // Calculate ratings for all relevant positions
  const positionRatings = {};
  const allPositions = [pos, ...altPositions.map(normalizePosition)];

  // Always calculate for the primary position
  positionRatings[pos] = baseOVR;

  // Calculate alt positions
  for (const altPos of altPositions.map(normalizePosition)) {
    if (altPos !== pos && POSITION_WEIGHTS[altPos]) {
      positionRatings[altPos] = calculatePositionOVR(ratings, altPos);
    }
  }

  // Find best position (highest OVR)
  let computedBest = pos;
  let highestOVR = baseOVR;

  // Also check nearby positions
  const nearbyPositions = getNearbyPositions(pos);
  for (const nearby of nearbyPositions) {
    const nearbyOVR = calculatePositionOVR(ratings, nearby);
    positionRatings[nearby] = nearbyOVR;
    if (nearbyOVR > highestOVR) {
      highestOVR = nearbyOVR;
      computedBest = nearby;
    }
  }

  return {
    baseOVR,
    formOVR,
    potentialOVR,
    positionOVR: baseOVR,
    overallRating: formOVR,
    bestPosition: computedBest,
    positionRatings,
    ageModifier: ageData,
    formModifier: formMod
  };
}

// ══════════════════════════════════════════════════
// HELPER: Get nearby/related positions
// ══════════════════════════════════════════════════

function getNearbyPositions(pos) {
  const map = {
    GK: [],
    CB: ['CDM'],
    LB: ['LWB', 'LM'],
    RB: ['RWB', 'RM'],
    LWB: ['LB', 'LM'],
    RWB: ['RB', 'RM'],
    CDM: ['CM', 'CB'],
    CM: ['CDM', 'CAM'],
    CAM: ['CM', 'CF'],
    LM: ['LW', 'LB'],
    RM: ['RW', 'RB'],
    LW: ['LM', 'ST', 'CF'],
    RW: ['RM', 'ST', 'CF'],
    CF: ['CAM', 'ST'],
    ST: ['CF', 'LW', 'RW']
  };
  return map[pos] || [];
}

// ══════════════════════════════════════════════════
// HELPER: Normalize position strings
// ══════════════════════════════════════════════════

function normalizePosition(pos) {
  if (!pos) return 'CM';
  const cleaned = pos.toUpperCase().trim();

  // Direct match
  if (POSITION_WEIGHTS[cleaned]) return cleaned;

  // Common aliases
  const aliases = {
    'GOALKEEPER': 'GK', 'KEEPER': 'GK',
    'CENTRE-BACK': 'CB', 'CENTER BACK': 'CB', 'CENTRE BACK': 'CB',
    'LEFT-BACK': 'LB', 'LEFT BACK': 'LB',
    'RIGHT-BACK': 'RB', 'RIGHT BACK': 'RB',
    'LEFT WING-BACK': 'LWB', 'LEFT WINGBACK': 'LWB',
    'RIGHT WING-BACK': 'RWB', 'RIGHT WINGBACK': 'RWB',
    'DEFENSIVE MIDFIELDER': 'CDM', 'DEFENSIVE MID': 'CDM', 'HOLDING MIDFIELDER': 'CDM',
    'CENTRAL MIDFIELDER': 'CM', 'CENTRAL MID': 'CM', 'MIDFIELDER': 'CM',
    'ATTACKING MIDFIELDER': 'CAM', 'ATTACKING MID': 'CAM', 'PLAYMAKER': 'CAM',
    'LEFT MIDFIELDER': 'LM', 'LEFT MID': 'LM',
    'RIGHT MIDFIELDER': 'RM', 'RIGHT MID': 'RM',
    'LEFT WINGER': 'LW', 'LEFT WING': 'LW',
    'RIGHT WINGER': 'RW', 'RIGHT WING': 'RW',
    'CENTRE FORWARD': 'CF', 'CENTER FORWARD': 'CF', 'SECOND STRIKER': 'CF',
    'STRIKER': 'ST', 'FORWARD': 'ST',
    'ATTACKER': 'ST', 'ATTACK': 'ST', 'DEFENDER': 'CB', 'MIDFIELD': 'CM'
  };

  if (aliases[cleaned]) return aliases[cleaned];

  // Fuzzy match
  if (cleaned.includes('GOAL')) return 'GK';
  if (cleaned.includes('WING') && cleaned.includes('LEFT')) return 'LW';
  if (cleaned.includes('WING') && cleaned.includes('RIGHT')) return 'RW';
  if (cleaned.includes('WING')) return 'LW';
  if (cleaned.includes('STRIK') || cleaned.includes('FORWARD')) return 'ST';
  if (cleaned.includes('DEFEND')) return 'CB';
  if (cleaned.includes('MIDFIELD')) return 'CM';

  return 'CM'; // Default fallback
}

module.exports = {
  calculateOVR,
  calculatePositionOVR,
  normalizePosition,
  calculateGK, calculateCB, calculateLB, calculateRB,
  calculateLWB, calculateRWB,
  calculateCDM, calculateCM, calculateCAM,
  calculateLM, calculateRM,
  calculateLW, calculateRW, calculateCF, calculateST,
  POSITION_WEIGHTS
};
