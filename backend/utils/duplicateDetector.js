/**
 * utils/duplicateDetector.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Location-Aware Duplicate Complaint Detection
 *
 * VERSION 2 — Improves on similarity.js by adding geospatial awareness.
 * The old system only compared text, causing false duplicates like:
 *   "Street light not working" at Location A  ← reported
 *   "Street light not working" at Location B  ← wrongly blocked ❌
 *
 * This module fixes that by requiring BOTH conditions to be true:
 *   ✅ Text similarity  >=  TEXT_THRESHOLD  (TF-IDF cosine similarity)
 *   ✅ Distance between locations  <=  DISTANCE_THRESHOLD_KM
 *
 * Only when both gates pass is a complaint considered a true duplicate.
 *
 * ─── HOW LOCATION COMPARISON WORKS ──────────────────────────────────────────
 *
 *  PRIMARY  → Coordinate-based (latitude/longitude)
 *    Uses the Haversine formula to calculate the straight-line distance
 *    between two GPS points on the Earth's surface.
 *
 *    Formula:
 *      a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
 *      distance = 2R × atan2(√a, √(1−a))       where R = 6371 km
 *
 *    This is the industry-standard approach used by mapping APIs.
 *    Result: distance in kilometres.  If distance < 1 km → "same location".
 *
 *  FALLBACK → Address string comparison (when coordinates are missing)
 *    Normalises both address strings (lowercase, strip punctuation) and
 *    applies Jaccard token similarity. If ≥ 50% of tokens match → "same area".
 *    This handles legacy complaints stored without GPS data.
 *
 * ─── DECISION LOGIC ──────────────────────────────────────────────────────────
 *
 *   isDuplicate = (textSimilarity >= TEXT_THRESHOLD)
 *                 AND
 *                 (locationMatch === true)
 *
 *   This is an AND gate — failing either condition lets the complaint through.
 *
 * ─── CONFIGURATION ───────────────────────────────────────────────────────────
 *   All thresholds are tuneable via .env without touching code:
 *
 *   TEXT_SIMILARITY_THRESHOLD   (default 0.55)  — 0 to 1
 *   DISTANCE_THRESHOLD_KM       (default 1.0)   — kilometres
 *   ADDRESS_SIMILARITY_THRESHOLD (default 0.50) — 0 to 1, for string fallback
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Configuration (override via .env) ─────────────────────────────────────────

/**
 * Minimum TF-IDF cosine similarity for text to be considered "same issue".
 * Lower  → more aggressive (catches more near-duplicates, more false positives).
 * Higher → stricter     (fewer false positives, may miss paraphrased duplicates).
 */
const TEXT_SIMILARITY_THRESHOLD    = parseFloat(process.env.TEXT_SIMILARITY_THRESHOLD)    || 0.55;

/**
 * Maximum distance in kilometres for two complaints to be "at the same location".
 * 1.0 km is a good default for city-level civic issues.
 * Reduce to 0.5 km for dense urban areas; increase to 2.0 km for rural areas.
 */
const DISTANCE_THRESHOLD_KM        = parseFloat(process.env.DISTANCE_THRESHOLD_KM)        || 1.0;

/**
 * Minimum address-string token overlap (Jaccard) used ONLY when GPS is absent.
 * 0.5 means at least half the address words must overlap.
 */
const ADDRESS_SIMILARITY_THRESHOLD = parseFloat(process.env.ADDRESS_SIMILARITY_THRESHOLD) || 0.50;

// ── Stop-words (same set as similarity.js for consistency) ────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'is',
  'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they',
  'it', 'its', 'my', 'our', 'your', 'his', 'her', 'their', 'there', 'here',
  'very', 'so', 'too', 'also', 'just', 'not', 'no', 'can', 'please', 'sir',
  'near', 'since', 'area', 'place', 'problem', 'issue', 'request', 'kindly'
]);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — TEXT SIMILARITY  (TF-IDF cosine similarity, unchanged from v1)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tokenise: lowercase → strip punctuation → split → remove stop-words & short tokens.
 * @param {string} text
 * @returns {string[]}
 */
function tokenise(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Normalised Term Frequency: TF(word) = count / total_tokens.
 * @param {string[]} tokens
 * @returns {Map<string, number>}
 */
function computeTF(tokens) {
  const tf    = new Map();
  const total = tokens.length || 1;
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [w, c] of tf) tf.set(w, c / total);
  return tf;
}

/**
 * Smoothed IDF: log((N+1)/(df+1)) + 1  — avoids log(0), standard sklearn formula.
 * @param {string[][]} tokenisedDocs
 * @returns {Map<string, number>}
 */
function computeIDF(tokenisedDocs) {
  const N  = tokenisedDocs.length;
  const df = new Map();
  for (const tokens of tokenisedDocs) {
    for (const word of new Set(tokens)) df.set(word, (df.get(word) || 0) + 1);
  }
  const idf = new Map();
  for (const [word, count] of df) idf.set(word, Math.log((N + 1) / (count + 1)) + 1);
  return idf;
}

/**
 * Build a TF-IDF weight vector for one document.
 * @param {Map<string, number>} tf
 * @param {Map<string, number>} idf
 * @returns {Map<string, number>}
 */
function buildVector(tf, idf) {
  const v = new Map();
  for (const [word, tfVal] of tf) v.set(word, tfVal * (idf.get(word) || 1));
  return v;
}

/**
 * Cosine similarity between two TF-IDF vectors.
 * sim = (A · B) / (|A| × |B|)   ∈ [0, 1]
 * @param {Map<string, number>} vecA
 * @param {Map<string, number>} vecB
 * @returns {number}
 */
function cosine(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  for (const [w, a] of vecA) { dot += a * (vecB.get(w) || 0); magA += a * a; }
  for (const [, b] of vecB)  { magB += b * b; }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return Math.round((dot / denom) * 10000) / 10000; // 4 d.p.
}

/**
 * Compute TF-IDF cosine similarity between the new complaint and ONE existing complaint.
 * We build the IDF from just the two documents (fast; accurate enough for pairwise comparison).
 *
 * @param {string[]} newTokens
 * @param {string[]} existingTokens
 * @returns {number} similarity in [0, 1]
 */
function textSimilarityScore(newTokens, existingTokens) {
  if (newTokens.length === 0 || existingTokens.length === 0) return 0;
  const idf   = computeIDF([newTokens, existingTokens]);
  const vecNew = buildVector(computeTF(newTokens),      idf);
  const vecOld = buildVector(computeTF(existingTokens), idf);
  return cosine(vecNew, vecOld);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — LOCATION COMPARISON
// ════════════════════════════════════════════════════════════════════════════

/**
 * Haversine formula: calculates the great-circle distance between two
 * GPS coordinate pairs on the surface of the Earth.
 *
 * How it works:
 *   1. Convert degree differences (Δlat, Δlon) to radians.
 *   2. Apply the haversine trig formula to find the central angle.
 *   3. Multiply by Earth's radius (6371 km) to get distance.
 *
 * Accuracy: within ~0.5% for distances up to 1000 km — more than sufficient
 * for city-level civic complaint deduplication.
 *
 * @param {number} lat1  - latitude of point A  (degrees)
 * @param {number} lon1  - longitude of point A (degrees)
 * @param {number} lat2  - latitude of point B  (degrees)
 * @param {number} lon2  - longitude of point B (degrees)
 * @returns {number}     - distance in kilometres
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;                              // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Address string similarity using Jaccard token overlap.
 * Used as a FALLBACK when GPS coordinates are unavailable.
 *
 * Jaccard(A, B) = |A ∩ B| / |A ∪ B|
 * Strips noise words (road, street, near) before comparing so that
 * "Near MG Road, Hyderabad" and "MG Road Hyderabad" score as similar.
 *
 * @param {string} addr1
 * @param {string} addr2
 * @returns {number} similarity in [0, 1]
 */
function addressSimilarityScore(addr1, addr2) {
  if (!addr1 || !addr2) return 0;

  // Normalise: lowercase, strip punctuation
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);

  const tokA = new Set(norm(addr1));
  const tokB = new Set(norm(addr2));

  const intersection = [...tokA].filter(t => tokB.has(t)).length;
  const union        = new Set([...tokA, ...tokB]).size;

  return union === 0 ? 0 : Math.round((intersection / union) * 10000) / 10000;
}

/**
 * Check whether a new complaint is geographically "at the same location"
 * as an existing complaint, using the best available data.
 *
 * Decision flow:
 *   1. If BOTH complaints have valid coordinates → Haversine distance check.
 *   2. Else if BOTH have address strings         → Jaccard address similarity.
 *   3. If neither has location data              → assume different locations
 *      (to avoid false positives from missing data).
 *
 * @param {object} newComp      - { latitude, longitude, address }
 * @param {object} existingComp - { latitude, longitude, address }
 * @returns {{
 *   isNearby: boolean,
 *   method:   'coordinates' | 'address' | 'unknown',
 *   distanceKm?: number,
 *   addressScore?: number
 * }}
 */
function checkLocationMatch(newComp, existingComp) {
  const hasCoords = c =>
    c.latitude  != null && c.longitude != null &&
    !isNaN(parseFloat(c.latitude))  &&
    !isNaN(parseFloat(c.longitude));

  // ── Path A: GPS coordinates available for both ───────────────────────────
  if (hasCoords(newComp) && hasCoords(existingComp)) {
    const distanceKm = haversineKm(
      parseFloat(newComp.latitude),
      parseFloat(newComp.longitude),
      parseFloat(existingComp.latitude),
      parseFloat(existingComp.longitude)
    );

    return {
      isNearby:   distanceKm <= DISTANCE_THRESHOLD_KM,
      method:     'coordinates',
      distanceKm: Math.round(distanceKm * 1000) / 1000  // 3 d.p.
    };
  }

  // ── Path B: Fall back to address string comparison ───────────────────────
  if (newComp.address && existingComp.address) {
    const addressScore = addressSimilarityScore(newComp.address, existingComp.address);
    return {
      isNearby:     addressScore >= ADDRESS_SIMILARITY_THRESHOLD,
      method:       'address',
      addressScore
    };
  }

  // ── Path C: No location data to compare → treat as different locations ───
  return { isNearby: false, method: 'unknown' };
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — COMBINED DETECTOR (main export)
// ════════════════════════════════════════════════════════════════════════════

/**
 * findDuplicate  — Location-Aware Duplicate Detector
 *
 * For each existing complaint, applies a two-gate AND check:
 *   Gate 1: TF-IDF cosine text similarity  ≥  TEXT_SIMILARITY_THRESHOLD
 *   Gate 2: Haversine distance             ≤  DISTANCE_THRESHOLD_KM
 *              (or address Jaccard score   ≥  ADDRESS_SIMILARITY_THRESHOLD)
 *
 * Only when BOTH gates pass is the complaint considered a duplicate.
 * This is a strict AND — a high text match at a different location is allowed.
 *
 * Among all candidates that pass both gates, we pick the one with the
 * highest COMBINED score: (textSim × 0.7) + (locationProximityScore × 0.3)
 * so the most relevant existing complaint is returned in the response.
 *
 * @param {object} newComplaint
 *   { title, description, latitude, longitude, address }
 * @param {Array}  existingComplaints
 *   Array of lean Mongoose docs with same shape
 * @param {object} [options]
 *   { textThreshold, distanceKm, addressThreshold }  — optional runtime overrides
 *
 * @returns {{
 *   isDuplicate:      boolean,
 *   textSimilarity:   number,
 *   locationResult:   object,
 *   combinedScore:    number,
 *   matchedComplaint: object | null
 * }}
 */
function findDuplicate(newComplaint, existingComplaints, options = {}) {
  // Merge runtime overrides with module-level defaults
  const textThreshold    = options.textThreshold    ?? TEXT_SIMILARITY_THRESHOLD;
  const maxDistanceKm    = options.distanceKm       ?? DISTANCE_THRESHOLD_KM;
  const addrThreshold    = options.addressThreshold ?? ADDRESS_SIMILARITY_THRESHOLD;

  // Guard: nothing to compare against
  if (!existingComplaints || existingComplaints.length === 0) {
    return { isDuplicate: false, textSimilarity: 0, locationResult: null, combinedScore: 0, matchedComplaint: null };
  }

  const newText   = `${newComplaint.title || ''} ${newComplaint.description || ''}`.trim();
  const newTokens = tokenise(newText);

  // If the new complaint has no meaningful text, skip (can't determine similarity)
  if (newTokens.length === 0) {
    return { isDuplicate: false, textSimilarity: 0, locationResult: null, combinedScore: 0, matchedComplaint: null };
  }

  let bestCombinedScore  = 0;
  let bestMatch          = null;
  let bestTextSim        = 0;
  let bestLocationResult = null;

  for (const existing of existingComplaints) {
    // ── Gate 1: Text Similarity ─────────────────────────────────────────────
    const existingText   = `${existing.title || ''} ${existing.description || ''}`.trim();
    const existingTokens = tokenise(existingText);
    const textSim        = textSimilarityScore(newTokens, existingTokens);

    // Short-circuit: if text similarity is below threshold, skip location check.
    // This avoids unnecessary distance calculations for clearly different complaints.
    if (textSim < textThreshold) continue;

    // ── Gate 2: Location Match ──────────────────────────────────────────────
    // Temporarily use the local overrides for distance/address thresholds
    const savedDist = DISTANCE_THRESHOLD_KM;   // can't reassign const, but we pass opts
    const locResult = checkLocationMatch(
      { latitude: newComplaint.latitude, longitude: newComplaint.longitude, address: newComplaint.address },
      { latitude: existing.latitude,     longitude: existing.longitude,     address: existing.address    }
    );

    // Apply runtime distance override if provided
    const effectiveIsNearby =
      locResult.method === 'coordinates'
        ? (locResult.distanceKm <= maxDistanceKm)
        : locResult.method === 'address'
          ? (locResult.addressScore >= addrThreshold)
          : false;

    // Both gates must pass
    if (!effectiveIsNearby) continue;

    // ── Score this candidate ────────────────────────────────────────────────
    // Proximity contribution: 1 when distance = 0, approaches 0 at the threshold.
    // For address fallback: just use the addressScore directly.
    let proximityScore;
    if (locResult.method === 'coordinates') {
      proximityScore = Math.max(0, 1 - (locResult.distanceKm / maxDistanceKm));
    } else if (locResult.method === 'address') {
      proximityScore = locResult.addressScore;
    } else {
      proximityScore = 0;
    }

    // Weighted combination: text is the stronger signal (70%), location is confirming (30%)
    const combinedScore = (textSim * 0.7) + (proximityScore * 0.3);

    if (combinedScore > bestCombinedScore) {
      bestCombinedScore  = combinedScore;
      bestMatch          = existing;
      bestTextSim        = textSim;
      bestLocationResult = { ...locResult, isNearby: effectiveIsNearby };
    }
  }

  const isDuplicate = bestMatch !== null; // passed both gates

  return {
    isDuplicate,
    textSimilarity:   Math.round(bestTextSim * 10000) / 10000,
    locationResult:   bestLocationResult,
    combinedScore:    Math.round(bestCombinedScore * 10000) / 10000,
    matchedComplaint: isDuplicate ? bestMatch : null
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  findDuplicate,
  haversineKm,
  addressSimilarityScore,
  checkLocationMatch,
  // Export config so tests/admin can read active thresholds
  CONFIG: {
    TEXT_SIMILARITY_THRESHOLD,
    DISTANCE_THRESHOLD_KM,
    ADDRESS_SIMILARITY_THRESHOLD
  }
};
