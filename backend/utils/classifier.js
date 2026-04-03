/**
 * utils/classifier.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatic Issue Classification — Keyword + Priority NLP
 *
 * HOW IT WORKS:
 *   Two-pass classification:
 *     Pass 1 — PRIORITY CHECK (keywordConfig.PRIORITY_RULES)
 *       Evaluates strong/specific keyword triggers in order.
 *       First match wins immediately, bypassing the scoring pass.
 *       Example: "garbage overflowing near road" hits Municipal trigger
 *       BEFORE the Roads scorer can score higher on "road".
 *
 *     Pass 2 — BAG-OF-WORDS SCORING (keywordConfig.KEYWORD_MAP)
 *       Only reached if no priority rule fired.
 *       Each department is scored by counting keyword matches.
 *       Department with highest score wins.
 *
 * SINGLE SOURCE OF TRUTH:
 *   All keywords live in keywordConfig.js — this file contains NO keyword lists.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { KEYWORD_MAP, PRIORITY_RULES } = require('./keywordConfig');

// ── Tokeniser ──────────────────────────────────────────────────────────────────
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// ── Priority check (Pass 1) ────────────────────────────────────────────────────
/**
 * Checks whether any high-priority trigger words are present in the text.
 * Evaluated top-to-bottom; first match wins.
 *
 * @param {string} rawText - lowercased full complaint text
 * @returns {{ department, category } | null}
 */
function checkPriorityRules(rawText) {
  for (const rule of PRIORITY_RULES) {
    const hit = rule.triggers.some(trigger => rawText.includes(trigger.toLowerCase()));
    if (hit) {
      return { department: rule.department, category: rule.category };
    }
  }
  return null;
}

// ── Scorer (Pass 2) ────────────────────────────────────────────────────────────
/**
 * Scores a single department's keyword list against the tokenised text.
 * Phrase keywords (multi-word) are matched against raw text and score higher.
 *
 * @param {string[]} tokens   - tokenised words
 * @param {string}   rawText  - original lowercased text
 * @param {string[]} keywords - keyword list for a department
 * @returns {number}
 */
function scoreDepartment(tokens, rawText, keywords) {
  let score = 0;
  const tokenSet = new Set(tokens);

  for (const keyword of keywords) {
    if (keyword.includes(' ')) {
      if (rawText.includes(keyword.toLowerCase())) score += 2; // phrase = stronger signal
    } else {
      if (tokenSet.has(keyword.toLowerCase())) score += 1;
    }
  }

  return score;
}

// ── Main Classifier ────────────────────────────────────────────────────────────
/**
 * Classifies a complaint text into a department.
 *
 * @param {string} text - complaint title + description combined
 * @returns {{ department: string, category: string, confidence: string, scores: Object }}
 *
 * Test cases:
 *   "garbage overflowing near road"   → Municipal Department  (priority rule fires)
 *   "pothole on road"                 → Roads Department      (scoring pass)
 *   "water leakage near house"        → Water Department      (priority rule fires)
 *   "street light not working"        → Electricity Department
 */
function classify(text) {
  if (!text || typeof text !== 'string') {
    return { department: 'General', category: 'Other', confidence: 'none', scores: {} };
  }

  const rawText = text.toLowerCase();
  const tokens  = tokenise(rawText);

  // ── Pass 1: Priority keyword check ─────────────────────────────────────────
  const priorityMatch = checkPriorityRules(rawText);
  if (priorityMatch) {
    // Still compute all scores for the admin dashboard / debugging
    const scores = {};
    for (const [dept, config] of Object.entries(KEYWORD_MAP)) {
      scores[dept] = scoreDepartment(tokens, rawText, config.keywords);
    }
    return {
      department: priorityMatch.department,
      category:   priorityMatch.category,
      confidence: 'high',
      scores,
      matchedBy:  'priority' // helpful for debugging
    };
  }

  // ── Pass 2: Bag-of-words scoring ───────────────────────────────────────────
  const scores = {};
  let bestDept     = null;
  let bestCategory = 'Other';
  let bestScore    = 0;

  for (const [dept, config] of Object.entries(KEYWORD_MAP)) {
    const score = scoreDepartment(tokens, rawText, config.keywords);
    scores[dept] = score;

    if (score > bestScore) {
      bestScore    = score;
      bestDept     = dept;
      bestCategory = config.category;
    }
  }

  if (bestScore === 0) {
    return { department: 'General', category: 'Other', confidence: 'none', scores };
  }

  let confidence;
  if      (bestScore >= 5) confidence = 'high';
  else if (bestScore >= 2) confidence = 'medium';
  else                     confidence = 'low';

  return {
    department: bestDept,
    category:   bestCategory,
    confidence,
    scores,
    matchedBy:  'scoring'
  };
}

module.exports = { classify, KEYWORD_MAP, PRIORITY_RULES };
