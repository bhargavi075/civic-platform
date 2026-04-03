/**
 * utils/keywordConfig.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH — Keyword Configuration
 *
 * Both classifier.js and officerAdvisor.js import from here.
 * To add/change a department's keywords, edit ONLY this file.
 *
 * PRIORITY RULES (evaluated top-to-bottom — first match wins):
 *   Strong/specific keywords are listed FIRST so they override ambiguous ones.
 *   E.g. "garbage" near "road" → Municipal wins, not Roads.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Priority keyword groups evaluated BEFORE the full scoring pass.
 * Each entry: { department, category, triggers: string[] }
 * The first entry whose trigger words appear in the text wins outright.
 */
const PRIORITY_RULES = [
  // ── Municipal (waste / sanitation) wins over Roads when both appear ─────────
  {
    department: 'Municipal Department',
    category: 'Municipal',
    triggers: [
      'garbage', 'waste', 'trash', 'rubbish', 'litter', 'dustbin', 'bin',
      'dump', 'dumping', 'filth', 'stench', 'odour', 'smell', 'sweeping',
      'sanitation', 'hygiene', 'cleanliness', 'heaps', 'burning waste',
      'open defecation', 'rats', 'rodent', 'mosquito', 'pest', 'insects'
    ]
  },
  // ── Water Department strong signals ─────────────────────────────────────────
  {
    department: 'Water Department',
    category: 'Water',
    triggers: [
      'water leak', 'burst pipe', 'broken pipe', 'no water', 'dirty water',
      'water supply', 'water shortage', 'water logging', 'waterlogging',
      'sewage', 'sewer', 'clogged drain', 'blocked drain'
    ]
  },
  // ── Electricity urgent signals ───────────────────────────────────────────────
  {
    department: 'Electricity Department',
    category: 'Electricity',
    triggers: [
      'live wire', 'sparking wire', 'electric shock', 'hanging wire',
      'power outage', 'power cut', 'power failure', 'no electricity', 'blackout'
    ]
  }
];

/**
 * Full keyword map used for scoring (bag-of-words pass).
 * Order here does NOT matter — the classifier scores ALL departments
 * and picks the best.  PRIORITY_RULES is what enforces precedence.
 */
const KEYWORD_MAP = {
  'Roads Department': {
    category: 'Roads',
    keywords: [
      'pothole', 'potholes', 'road', 'roads', 'street', 'streets', 'pavement',
      'footpath', 'sidewalk', 'highway', 'bridge', 'traffic', 'signal', 'divider',
      'median', 'speed', 'bump', 'asphalt', 'tar', 'crack', 'cracked', 'lane',
      'crossing', 'pedestrian', 'zebra', 'junction', 'intersection',
      'broken road', 'damaged road', 'uneven', 'blockage', 'encroachment'
    ]
  },

  'Water Department': {
    category: 'Water',
    keywords: [
      'water', 'leak', 'leaking', 'pipe', 'pipes', 'pipeline', 'drainage',
      'drain', 'flood', 'flooding', 'overflowing', 'sewage', 'sewer',
      'tap', 'supply', 'shortage', 'contamination', 'murky',
      'stagnant', 'puddle', 'waterlogging', 'overflow', 'manhole',
      'clogged drain', 'broken pipe', 'burst pipe', 'no water', 'low pressure',
      'dirty water', 'water supply'
    ]
  },

  'Electricity Department': {
    category: 'Electricity',
    keywords: [
      'electricity', 'electric', 'power', 'outage', 'blackout', 'streetlight',
      'street light', 'lights', 'bulb', 'transformer', 'wire', 'wires', 'cable',
      'cables', 'pole', 'tripping', 'fluctuation', 'sparking', 'spark', 'shock',
      'voltage', 'meter', 'bill', 'connection', 'no electricity', 'power cut',
      'power failure', 'live wire', 'faulty', 'damaged wire', 'dark', 'darkness'
    ]
  },

  'Municipal Department': {
    category: 'Municipal',
    keywords: [
      'garbage', 'waste', 'trash', 'litter', 'littering', 'dumping', 'dump',
      'sanitation', 'cleanliness', 'dirty', 'filth', 'rubbish', 'bin', 'bins',
      'collection', 'sweeping', 'cleaning', 'hygiene', 'smell', 'stench',
      'odour', 'rats', 'mosquito', 'insects', 'open defecation', 'toilets',
      'public toilet', 'compost', 'plastic', 'burning waste', 'heaps', 'dustbin'
    ]
  },

  'Parks Department': {
    category: 'Parks',
    keywords: [
      'park', 'parks', 'garden', 'gardens', 'tree', 'trees', 'branch',
      'fallen tree', 'grass', 'overgrown', 'playground', 'bench', 'benches',
      'fountain', 'maintenance', 'trimming', 'cutting', 'weeds', 'shrubs',
      'hedge', 'jogging', 'compound', 'greenery', 'plants', 'dead tree'
    ]
  },

  'Building Department': {
    category: 'Infrastructure',
    keywords: [
      'building', 'construction', 'illegal construction', 'encroachment',
      'demolition', 'collapse', 'wall', 'dilapidated', 'unsafe',
      'permit', 'zoning', 'property', 'structure', 'foundation', 'balcony',
      'roof', 'ceiling', 'stairs', 'elevator', 'lift'
    ]
  },

  'Health Department': {
    category: 'Health',
    keywords: [
      'hospital', 'clinic', 'health', 'disease', 'epidemic', 'dengue', 'malaria',
      'cholera', 'infection', 'spreading', 'medical', 'ambulance', 'doctor',
      'medicine', 'vaccine', 'contaminated', 'toxic',
      'chemical', 'pollution', 'air quality', 'dust', 'smoke'
    ]
  }
};

module.exports = { KEYWORD_MAP, PRIORITY_RULES };
