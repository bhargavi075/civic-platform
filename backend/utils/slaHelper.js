/**
 * utils/slaHelper.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes the SLA deadline for a complaint based on:
 *   1. Admin-defined per-category SLA rules (stored in DB) — highest priority
 *   2. Hardcoded fallback: High=24h, Medium=72h, Low=168h
 *
 * Usage:
 *   const { computeSlaDeadline } = require('../utils/slaHelper');
 *   complaint.slaDeadline = await computeSlaDeadline(complaint.category, complaint.priority);
 */

const SlaRule = require('../models/SlaRule');

/**
 * Default SLA hours per priority when no DB rule exists for the category.
 */
const DEFAULT_HOURS = {
  High:   24,
  Medium: 72,
  Low:    168,
};

/**
 * Looks up the SLA rule for a given category, falls back to defaults.
 * Returns the deadline Date for the given priority.
 *
 * @param {string} category  - complaint category (e.g. 'Roads', 'Water')
 * @param {string} priority  - 'High' | 'Medium' | 'Low'
 * @param {Date}   [from]    - base time (default: now)
 * @returns {Promise<Date>}
 */
async function computeSlaDeadline(category, priority, from = new Date()) {
  let hours = DEFAULT_HOURS[priority] ?? DEFAULT_HOURS.Low;

  try {
    const rule = await SlaRule.findOne({ category }).lean();
    if (rule) {
      if (priority === 'High')   hours = rule.highHours;
      else if (priority === 'Medium') hours = rule.mediumHours;
      else                            hours = rule.lowHours;
    }
  } catch (err) {
    // DB lookup failed — silently fall back to defaults
    console.warn('[SlaHelper] Could not load SLA rule, using defaults:', err.message);
  }

  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Synchronous version using a pre-fetched rules map.
 * Pass the result of loadAllRules() to avoid repeated DB hits in loops.
 *
 * @param {Object} rulesMap  - { [category]: SlaRule }
 * @param {string} category
 * @param {string} priority
 * @param {Date}   [from]
 * @returns {Date}
 */
function computeSlaDeadlineSync(rulesMap, category, priority, from = new Date()) {
  const rule  = rulesMap[category];
  let hours   = DEFAULT_HOURS[priority] ?? DEFAULT_HOURS.Low;

  if (rule) {
    if (priority === 'High')        hours = rule.highHours;
    else if (priority === 'Medium') hours = rule.mediumHours;
    else                            hours = rule.lowHours;
  }

  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Loads all SLA rules from DB into a keyed map { category → rule }.
 * @returns {Promise<Object>}
 */
async function loadAllRules() {
  try {
    const rules = await SlaRule.find().lean();
    return Object.fromEntries(rules.map(r => [r.category, r]));
  } catch {
    return {};
  }
}

module.exports = { computeSlaDeadline, computeSlaDeadlineSync, loadAllRules, DEFAULT_HOURS };
