/**
 * utils/priorityPredictor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatic Priority Prediction — Keyword-Based Text Classifier
 *
 * HOW IT WORKS (ML concept):
 *   This is a weighted keyword classifier — a simplified version of a
 *   "scored Naive Bayes" model. Each priority level has a set of signal words.
 *   We count how many signals appear in the complaint text, weight them, and
 *   pick the priority level with the highest score. Severity (1–5) acts as a
 *   numerical feature that biases the prediction upward, just like a feature
 *   weight in a logistic regression model.
 *
 *   Three-class classification:
 *     High   → immediate danger / public safety / emergency
 *     Medium → service disruption / functional issue
 *     Low    → inconvenience / cosmetic / routine
 *
 * EXTENDING:
 *   Add words to any level's `keywords` array.
 *   Adjust `weight` to make certain signals stronger.
 *   Change `SEVERITY_BOOST` to tune how much the 1–5 severity slider matters.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Configuration ──────────────────────────────────────────────────────────────

/**
 * How much each severity point (above 1) boosts the score toward High/Medium.
 * severity=5 adds 4 × 1.5 = 6 points → effectively forces "High" on its own.
 */
const SEVERITY_BOOST = 1.5;

/**
 * Keyword tiers with weights.
 * Each keyword match adds `weight` to that priority tier's score.
 */
const PRIORITY_SIGNALS = {
  High: {
    weight: 3,    // 1 match is already strong evidence of High priority
    keywords: [
      // Safety emergencies
      'danger', 'dangerous', 'hazard', 'hazardous', 'emergency', 'urgent', 'urgently',
      'immediately', 'critical', 'life threatening', 'life-threatening',
      // Accidents & injuries
      'accident', 'injury', 'injured', 'hurt', 'death', 'died', 'casualty',
      'blood', 'wound', 'hospital', 'ambulance',
      // Fire
      'fire', 'burning', 'smoke', 'explosion', 'blast', 'gas leak', 'gas leaking',
      // Electrical safety
      'electric shock', 'electrocution', 'live wire', 'sparking', 'spark', 'short circuit',
      // Structural
      'collapse', 'collapsing', 'building collapse', 'wall collapse', 'bridge collapse',
      // Disease / epidemic
      'epidemic', 'disease outbreak', 'dengue', 'cholera', 'typhoid',
      // Environmental
      'toxic', 'poison', 'contamination', 'chemical spill'
    ]
  },

  Medium: {
    weight: 2,
    keywords: [
      // Service disruption
      'not working', 'not functioning', 'broken', 'damaged', 'faulty',
      'out of order', 'stopped working', 'malfunction',
      // Water issues
      'leakage', 'leak', 'leaking', 'burst', 'overflow', 'overflowing',
      'flooding', 'water logging', 'waterlogging', 'no water', 'low pressure',
      // Power issues
      'power cut', 'power outage', 'blackout', 'power failure', 'fluctuation',
      'no electricity', 'tripping',
      // Road issues
      'pothole', 'potholes', 'deep pothole', 'road damaged', 'road broken',
      // Sanitation
      'sewage', 'sewer', 'manhole open', 'open manhole', 'foul smell',
      // Waste
      'garbage not collected', 'waste piling', 'overflowing bin'
    ]
  },

  Low: {
    weight: 1,
    keywords: [
      // Cosmetic / minor
      'streetlight', 'street light', 'light not working', 'bulb fused',
      'paint', 'graffiti', 'dirty', 'overgrown', 'grass', 'weeds',
      // Noise
      'noise', 'loud', 'disturbance',
      // General maintenance
      'repair needed', 'maintenance', 'cleaning', 'garbage', 'litter',
      'trash', 'waste', 'pothole (small)', 'minor',
      // Suggestions
      'suggestion', 'request', 'please fix', 'kindly'
    ]
  }
};

// ── Tokeniser ──────────────────────────────────────────────────────────────────
function tokenise(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
}

// ── Main Export ────────────────────────────────────────────────────────────────
/**
 * Predicts the priority of a complaint based on its text and severity rating.
 *
 * @param {string} title       - complaint title
 * @param {string} description - complaint description
 * @param {number} severity    - citizen's severity rating (1–5), default 1
 * @returns {{ priority: 'High'|'Medium'|'Low', confidence: string, scores: object }}
 *
 * Example:
 *   predictPriority('Electric shock near school', 'Wire is sparking on road', 4)
 *   // → { priority: 'High', confidence: 'high', scores: { High: 12, Medium: 0, Low: 0 } }
 */
function predictPriority(title = '', description = '', severity = 1) {
  const text   = tokenise(`${title} ${description}`);
  const scores = { High: 0, Medium: 0, Low: 0 };

  // Count keyword signal scores
  for (const [level, { weight, keywords }] of Object.entries(PRIORITY_SIGNALS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        scores[level] += weight;
      }
    }
  }

  // Apply severity boost
  // severity 1 = no boost, severity 5 = +6 points to High
  const severityPoints = (Math.max(1, Math.min(5, severity)) - 1) * SEVERITY_BOOST;
  if (severity >= 4) {
    scores.High   += severityPoints;
  } else if (severity === 3) {
    scores.Medium += severityPoints;
  }
  // severity 1–2: no boost applied

  // Pick the highest-scoring level
  let predicted = 'Low';
  if      (scores.High   > 0 && scores.High   >= scores.Medium && scores.High   >= scores.Low)   predicted = 'High';
  else if (scores.Medium > 0 && scores.Medium >= scores.Low)                                      predicted = 'Medium';

  // Confidence: how dominant is the winning score?
  const total = scores.High + scores.Medium + scores.Low || 1;
  const dominance = scores[predicted] / total;
  let confidence;
  if      (dominance >= 0.7) confidence = 'high';
  else if (dominance >= 0.4) confidence = 'medium';
  else                       confidence = 'low';

  return { priority: predicted, confidence, scores };
}

module.exports = { predictPriority, PRIORITY_SIGNALS };
