/**
 * utils/officerAdvisor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Officer Suggestion System — Rule-Based Advisor
 *
 * HOW IT WORKS:
 *   Uses the SAME keyword config as classifier.js (single source of truth).
 *   Two-level decision tree:
 *     Level 1 → department (from classifier result)
 *     Level 2 → specific keyword sub-type within the complaint text
 *
 *   The advice lookup mirrors the classification logic:
 *     1. Check PRIORITY_RULES to detect the dominant issue type.
 *     2. Find the matching advice entry in ADVICE_RULES.
 *     3. If no specific advice matches, fall back to the department default.
 *
 * ALIGNMENT GUARANTEE:
 *   Because both classifier and advisor use PRIORITY_RULES from keywordConfig,
 *   if "garbage near road" → classified as Municipal, the advisor will also
 *   look up Municipal garbage advice — never road repair advice.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { PRIORITY_RULES } = require('./keywordConfig');

// ── Advice Rules ───────────────────────────────────────────────────────────────
// Structure:
//   ADVICE_RULES[department].default  → advice when no sub-type matches
//   ADVICE_RULES[department].subtypes → array of { triggers: string[], advice: {} }
//     The first matching subtype wins (most specific listed first).

const ADVICE_RULES = {

  'Roads Department': {
    default: {
      solution:      'Inspect the road section and carry out necessary repair work.',
      estimatedTime: '3–5 days',
      estimatedCost: '₹5,000 – ₹20,000',
      steps: [
        'Send field officer to assess the damage.',
        'Barricade the affected area for safety.',
        'Schedule repair crew and procure materials.',
        'Carry out repair (patching / resurfacing).',
        'Final quality inspection and remove barricades.'
      ]
    },
    subtypes: [
      {
        triggers: ['pothole', 'potholes'],
        advice: {
          solution:      'Fill the pothole(s) using cold-mix or hot-mix asphalt.',
          estimatedTime: '1–2 days',
          estimatedCost: '₹500 – ₹3,000 per pothole',
          steps: [
            'Mark pothole boundaries with paint or chalk.',
            'Clean loose debris from the cavity.',
            'Apply tack coat (bitumen emulsion) to the edges.',
            'Fill with asphalt mix and compact with a roller.',
            'Allow to cure (min. 2 hours) before reopening to traffic.'
          ]
        }
      },
      {
        triggers: ['footpath', 'sidewalk', 'pavement', 'pedestrian'],
        advice: {
          solution:      'Repair or relay the damaged footpath / sidewalk tiles.',
          estimatedTime: '2–4 days',
          estimatedCost: '₹3,000 – ₹15,000',
          steps: [
            'Survey and measure the damaged section.',
            'Remove broken tiles or concrete slabs.',
            'Prepare sub-base with compacted gravel.',
            'Lay new interlocking tiles or cast new concrete.',
            'Cure for 24 hours and inspect before reopening.'
          ]
        }
      },
      {
        triggers: ['signal', 'traffic light', 'traffic signal'],
        advice: {
          solution:      'Inspect and repair / replace the faulty traffic signal unit.',
          estimatedTime: '4–8 hours',
          estimatedCost: '₹2,000 – ₹10,000',
          steps: [
            'Isolate power supply to the signal safely.',
            'Diagnose fault: controller, bulb/LED, or wiring.',
            'Replace the faulty component.',
            'Test all signal phases (red/amber/green) before handover.',
            'Log repair details in the signal maintenance register.'
          ]
        }
      },
      {
        triggers: ['crack', 'cracked', 'uneven', 'broken road', 'damaged road'],
        advice: {
          solution:      'Resurface or patch the cracked / uneven road section.',
          estimatedTime: '2–4 days',
          estimatedCost: '₹8,000 – ₹30,000',
          steps: [
            'Assess crack depth and extent (superficial vs structural).',
            'Apply crack-sealing compound for minor cracks.',
            'For major damage: mill the surface layer and relay new asphalt.',
            'Apply road markings after resurfacing.',
            'Conduct post-repair load test if required.'
          ]
        }
      }
    ]
  },

  'Water Department': {
    default: {
      solution:      'Inspect water supply infrastructure and carry out required repairs.',
      estimatedTime: '2–4 days',
      estimatedCost: '₹2,000 – ₹10,000',
      steps: [
        'Identify the affected pipeline section.',
        'Shut off supply valve to the affected zone.',
        'Excavate if required and repair or replace pipe.',
        'Restore supply and check for leaks.',
        'Backfill excavation and restore surface.'
      ]
    },
    subtypes: [
      {
        triggers: ['leak', 'leaking', 'burst pipe', 'broken pipe', 'pipe burst', 'water leak'],
        advice: {
          solution:      'Locate and repair the leaking or burst pipeline.',
          estimatedTime: '1–2 days',
          estimatedCost: '₹1,500 – ₹8,000',
          steps: [
            'Shut off upstream isolation valve immediately.',
            'Excavate and expose the damaged pipe section.',
            'Cut out the damaged length and replace with new pipe + fittings.',
            'Pressure-test the repaired section.',
            'Restore supply and backfill the excavation.'
          ]
        }
      },
      {
        triggers: ['drainage', 'drain', 'clogged drain', 'blocked drain', 'waterlogging'],
        advice: {
          solution:      'Clear blocked drainage and restore free water flow.',
          estimatedTime: '1 day',
          estimatedCost: '₹500 – ₹3,000',
          steps: [
            'Locate the blockage point using drain rods or CCTV.',
            'Use a high-pressure jetting machine to clear the blockage.',
            'Remove extracted debris and dispose of it safely.',
            'Inspect downstream flow to confirm clearance.',
            'Log blockage cause; update preventive maintenance schedule.'
          ]
        }
      },
      {
        triggers: ['no water', 'water supply', 'shortage', 'low pressure'],
        advice: {
          solution:      'Diagnose supply interruption and restore water pressure.',
          estimatedTime: '4–12 hours',
          estimatedCost: '₹500 – ₹4,000',
          steps: [
            'Check pump station status and reservoir water levels.',
            'Inspect for closed valves or main line breaks.',
            'Restore pump operation or open supply valves.',
            'Flush distribution lines to clear sediment.',
            'Confirm adequate pressure at the complaint point.'
          ]
        }
      },
      {
        triggers: ['contamination', 'dirty water', 'murky', 'smell', 'sewage'],
        advice: {
          solution:      'Test water quality and flush / treat the affected distribution line.',
          estimatedTime: '2–3 days',
          estimatedCost: '₹3,000 – ₹12,000',
          steps: [
            'Collect water samples for lab analysis (bacteriological + chemical).',
            'Shut down the affected section if results are unsafe.',
            'Flush the distribution line thoroughly.',
            'Dose with chlorine to safe residual levels (0.2–0.5 ppm).',
            'Re-test and issue clearance before restoring supply.'
          ]
        }
      }
    ]
  },

  'Electricity Department': {
    default: {
      solution:      'Inspect the electrical fault and carry out safe repairs.',
      estimatedTime: '4–24 hours',
      estimatedCost: '₹1,000 – ₹8,000',
      steps: [
        'Isolate the affected circuit at the nearest switchgear.',
        'Inspect pole, cable, and meter box.',
        'Identify the fault type (open circuit / short / damaged component).',
        'Replace or repair the faulty element.',
        'Restore power and verify stable supply.'
      ]
    },
    subtypes: [
      {
        triggers: ['live wire', 'sparking', 'spark', 'electric shock', 'hanging wire', 'sparking wire'],
        advice: {
          solution:      '⚠️ URGENT — Make safe and repair exposed / live wiring immediately.',
          estimatedTime: '2–6 hours (emergency response)',
          estimatedCost: '₹1,500 – ₹6,000',
          steps: [
            '🚨 PRIORITY: Isolate power immediately at the nearest switch or feeder.',
            'Cordon off the area with barriers; warn pedestrians.',
            'Dispatch emergency electrical crew (do not delay).',
            'Secure or replace damaged cable and insulation.',
            'Test insulation resistance before restoring power.'
          ]
        }
      },
      {
        triggers: ['streetlight', 'street light', 'dark', 'lamp', 'light not working', 'street lamp'],
        advice: {
          solution:      'Replace faulty streetlight bulb / LED module or repair wiring.',
          estimatedTime: '2–4 hours',
          estimatedCost: '₹500 – ₹3,000',
          steps: [
            'Log the faulty pole number / GPS location.',
            'Deploy cherry picker / ladder crew to the pole.',
            'Replace bulb / LED unit or fix loose wiring connection.',
            'Test luminance after replacement (min. 8 lux at road surface).',
            'Update the street-lighting maintenance log.'
          ]
        }
      },
      {
        triggers: ['power outage', 'blackout', 'no electricity', 'power cut', 'power failure'],
        advice: {
          solution:      'Identify transformer or feeder fault and restore power supply.',
          estimatedTime: '2–8 hours',
          estimatedCost: '₹2,000 – ₹15,000',
          steps: [
            'Check whether outage is area-wide or isolated to one feeder.',
            'Inspect transformer / feeder for tripped breaker or physical damage.',
            'Reset breaker or dispatch repair crew as appropriate.',
            'Replace blown fuse or repair cable if required.',
            'Restore power and monitor voltage stability for 30 minutes.'
          ]
        }
      },
      {
        triggers: ['fluctuation', 'voltage', 'tripping'],
        advice: {
          solution:      'Inspect distribution transformer for voltage regulation issues.',
          estimatedTime: '4–8 hours',
          estimatedCost: '₹2,000 – ₹10,000',
          steps: [
            'Measure voltage at the transformer LT terminals.',
            'Check and adjust the tap changer setting.',
            'Inspect load balance across all three phases.',
            'Replace capacitor banks if power factor correction is needed.',
            'Monitor voltage for 24 hours after adjustment.'
          ]
        }
      }
    ]
  },

  'Municipal Department': {
    default: {
      solution:      'Schedule sanitation / waste management crew for the area.',
      estimatedTime: '1–3 days',
      estimatedCost: '₹500 – ₹5,000',
      steps: [
        'Log complaint and assign to the nearest zone supervisor.',
        'Dispatch cleaning crew with equipment.',
        'Clear waste / clean the area thoroughly.',
        'Photograph completion as evidence for closure.',
        'Update collection route if this is a recurring hotspot.'
      ]
    },
    subtypes: [
      {
        // Most specific garbage-related advice — checked FIRST
        triggers: ['garbage', 'waste', 'trash', 'rubbish', 'litter', 'dustbin', 'dump', 'heaps', 'overflow', 'overflowing'],
        advice: {
          solution:      'Collect accumulated garbage and sanitise the location.',
          estimatedTime: '1 day',
          estimatedCost: '₹300 – ₹2,000',
          steps: [
            'Dispatch a garbage collection vehicle to the exact location.',
            'Segregate waste into dry (recyclable) and wet (organic) categories.',
            'Load all waste and transport to authorised disposal/processing site.',
            'Disinfect and deodorise the spot with lime or bleach solution.',
            'Install or repair "No Dumping" signage; increase pickup frequency if recurring.'
          ]
        }
      },
      {
        triggers: ['rats', 'rodent', 'mosquito', 'pest', 'insects'],
        advice: {
          solution:      'Conduct pest control treatment in the affected area.',
          estimatedTime: '1–2 days',
          estimatedCost: '₹1,000 – ₹5,000',
          steps: [
            'Survey the infestation extent and identify breeding sources.',
            'Apply ULV fogging for mosquitoes; spray larvicide on stagnant water.',
            'Lay rodent bait stations or snap traps for rats.',
            'Clear all garbage and stagnant water contributing to infestation.',
            'Schedule a follow-up treatment after 7 days and issue resident advisory.'
          ]
        }
      },
      {
        triggers: ['open defecation', 'toilet', 'sanitation', 'hygiene'],
        advice: {
          solution:      'Deploy mobile sanitation unit and conduct awareness drive.',
          estimatedTime: '1–3 days',
          estimatedCost: '₹2,000 – ₹8,000',
          steps: [
            'Deploy a temporary mobile toilet unit at the site immediately.',
            'Inform local community leaders and RWA members.',
            'Conduct ODF (Open-Defecation Free) community awareness session.',
            'Coordinate with the nearest public toilet for regular cleaning.',
            'Follow up monthly to ensure continued compliance.'
          ]
        }
      }
    ]
  },

  'Parks Department': {
    default: {
      solution:      'Inspect the park / green area and schedule maintenance.',
      estimatedTime: '2–5 days',
      estimatedCost: '₹1,000 – ₹8,000',
      steps: [
        'Visit site and assess maintenance needs.',
        'Schedule gardening / maintenance crew.',
        'Carry out trimming, clearing, or repairs.',
        'Dispose of green waste in compost or authorised bins.',
        'Inspect park facilities (benches, lights, paths) and log defects.'
      ]
    },
    subtypes: [
      {
        triggers: ['fallen tree', 'dead tree', 'tree fallen', 'uprooted'],
        advice: {
          solution:      'Remove fallen / dead tree and clear debris for public safety.',
          estimatedTime: '1 day',
          estimatedCost: '₹2,000 – ₹10,000',
          steps: [
            '🚨 Cordon off the fallen-tree area immediately to protect the public.',
            'Dispatch tree-cutting crew with chainsaw and safety equipment.',
            'Cut and remove the tree in sections from top to base.',
            'Clear all debris and wood chips from the area.',
            'Inspect nearby trees for signs of disease or structural weakness.'
          ]
        }
      },
      {
        triggers: ['overgrown', 'grass', 'weeds', 'hedge', 'trimming'],
        advice: {
          solution:      'Carry out grass cutting, hedge trimming, and weeding.',
          estimatedTime: '1–2 days',
          estimatedCost: '₹500 – ₹3,000',
          steps: [
            'Measure and assess the area requiring maintenance.',
            'Deploy ride-on mower and trimmers for large sections.',
            'Cut grass to regulation height (below 4 cm for walkways).',
            'Trim hedges and remove invasive weeds by hand or herbicide.',
            'Collect all cuttings and compost or dispose appropriately.'
          ]
        }
      }
    ]
  },

  'Building Department': {
    default: {
      solution:      'Inspect the structural concern and issue appropriate notices.',
      estimatedTime: '3–7 days',
      estimatedCost: '₹5,000 – ₹50,000',
      steps: [
        'Dispatch a structural engineer for on-site inspection.',
        'Assess risk level: safe / at-risk / dangerous.',
        'Issue safety notice to the owner if required.',
        'Order repairs or demolition as appropriate.',
        'Re-inspect after the compliance deadline.'
      ]
    },
    subtypes: [
      {
        triggers: ['illegal construction', 'encroachment', 'unauthorized', 'illegal building'],
        advice: {
          solution:      'Issue stop-work notice and initiate demolition proceedings.',
          estimatedTime: '7–30 days (legal process)',
          estimatedCost: '₹5,000 – ₹30,000',
          steps: [
            'Document the violation thoroughly with geo-tagged photographs.',
            'Issue a formal legal stop-work notice to the property owner.',
            'Cross-check against approved building plan from records.',
            'Initiate demolition order if owner does not comply within 7 days.',
            'Recover demolition cost from the violator as per municipal act.'
          ]
        }
      }
    ]
  },

  'Health Department': {
    default: {
      solution:      'Investigate the health concern and deploy a public health response.',
      estimatedTime: '1–7 days',
      estimatedCost: '₹2,000 – ₹20,000',
      steps: [
        'Deploy a public health inspector to the site.',
        'Assess risk level and collect samples if needed.',
        'Initiate treatment or containment protocol.',
        'Issue a health advisory to affected residents.',
        'Follow up with weekly monitoring for 4 weeks.'
      ]
    },
    subtypes: [
      {
        triggers: ['dengue', 'malaria', 'epidemic', 'disease outbreak', 'cholera'],
        advice: {
          solution:      '⚠️ URGENT — Deploy vector control and disease surveillance team.',
          estimatedTime: '1–3 days (ongoing monitoring)',
          estimatedCost: '₹10,000 – ₹50,000',
          steps: [
            '🚨 Alert the district health officer and activate rapid response protocol.',
            'Conduct a rapid case survey across the affected ward.',
            'Deploy ULV fogging machines and larval control teams.',
            'Set up a free testing and treatment camp at the site.',
            'Issue a public advisory and monitor cases daily for 30 days.'
          ]
        }
      }
    ]
  },

  'General': {
    default: {
      solution:      'Review the complaint, assign to the correct department, and follow standard resolution procedure.',
      estimatedTime: '3–7 days',
      estimatedCost: 'Varies by issue type',
      steps: [
        'Review the complaint text and attachments carefully.',
        'Re-classify to the most appropriate department.',
        'Dispatch a field officer for on-site assessment.',
        'Carry out the necessary repairs or administrative actions.',
        'Close the complaint with a clear resolution note.'
      ]
    },
    subtypes: []
  }
};

// ── Main export ────────────────────────────────────────────────────────────────
/**
 * Generates officer advice for a given complaint.
 *
 * Algorithm:
 *   1. Combine title + description into fullText.
 *   2. Run PRIORITY_RULES check on fullText to detect the dominant issue type.
 *      If a priority trigger fires, use its department to look up advice — this
 *      guarantees the advice matches the classification (e.g. garbage → Municipal advice).
 *   3. If no priority rule fires, use the department field from the complaint directly.
 *   4. Within the chosen department, scan subtypes for a matching trigger.
 *   5. Return matched subtype advice; fall back to department default if none match.
 *
 * @param {object} complaint
 * @param {string} complaint.department   - e.g. "Municipal Department"
 * @param {string} complaint.title        - complaint title
 * @param {string} complaint.description  - complaint description
 * @param {string} complaint.priority     - "High" | "Medium" | "Low"
 * @returns {object} advice
 *
 * Test cases:
 *   { department: "Municipal Department", title: "Garbage overflow", description: "garbage overflowing near road" }
 *   → Municipal garbage advice (NOT Road repair advice)
 *
 *   { department: "Roads Department", title: "Pothole", description: "deep pothole on MG road" }
 *   → Pothole-specific advice
 *
 *   { department: "Water Department", title: "Leak", description: "water leaking near house" }
 *   → Pipe-leak-specific advice
 */
function getAdvice(complaint) {
  const {
    department = 'General',
    title = '',
    description = '',
    priority = 'Low'
  } = complaint;

  const fullText = `${title} ${description}`.toLowerCase();

  // ── Step 1: Confirm effective department using priority rules ───────────────
  // This ensures advice always aligns with classification.
  // E.g. if "garbage" is in text, always use Municipal advice regardless of
  // what department field says (handles edge cases in existing data).
  let effectiveDept = department;
  for (const rule of PRIORITY_RULES) {
    const hit = rule.triggers.some(trigger => fullText.includes(trigger.toLowerCase()));
    if (hit) {
      effectiveDept = rule.department;
      break;
    }
  }

  // ── Step 2: Look up rule set ────────────────────────────────────────────────
  const ruleSet = ADVICE_RULES[effectiveDept] || ADVICE_RULES['General'];

  // ── Step 3: Find matching subtype ──────────────────────────────────────────
  for (const subtype of (ruleSet.subtypes || [])) {
    const matched = subtype.triggers.some(trigger => fullText.includes(trigger.toLowerCase()));
    if (matched) {
      return _buildResponse(subtype.advice, effectiveDept, priority);
    }
  }

  // ── Step 4: Return department default ──────────────────────────────────────
  return _buildResponse(ruleSet.default, effectiveDept, priority);
}

/**
 * Attaches metadata to the advice object.
 */
function _buildResponse(advice, department, priority) {
  return {
    solution:      advice.solution,
    estimatedTime: advice.estimatedTime,
    estimatedCost: advice.estimatedCost,
    steps:         advice.steps || [],
    department,
    urgencyNote:   priority === 'High'
      ? '⚠️ This complaint is marked HIGH PRIORITY. Please act within 24 hours.'
      : null
  };
}

module.exports = { getAdvice, ADVICE_RULES };