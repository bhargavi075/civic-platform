/**
 * utils/similarity.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Duplicate Complaint Detection using TF-IDF Cosine Similarity
 *
 * HOW IT WORKS (NLP / ML concept):
 *
 *   Step 1 – TF-IDF (Term Frequency × Inverse Document Frequency)
 *     • Term Frequency (TF): how often a word appears in THIS document
 *       (normalised by total words so long complaints don't dominate).
 *     • Inverse Document Frequency (IDF): log(total docs / docs containing word)
 *       — common words like "the", "is" get a low IDF weight.
 *       — rare, specific words like "pothole" get a high IDF weight.
 *     • TF-IDF = TF × IDF — a word that appears often in ONE doc but rarely
 *       across all docs gets a high score, making it a strong "signal" word.
 *
 *   Step 2 – Cosine Similarity
 *     • Each document becomes a vector in "word-space" (TF-IDF weights).
 *     • Cosine similarity measures the angle between two vectors:
 *         sim = (A · B) / (|A| × |B|)
 *     • Returns 0 (completely different) to 1 (identical).
 *     • This is the same algorithm used by search engines and recommendation
 *       systems to find "similar" documents.
 *
 * WHY THIS APPROACH?
 *   Pure Jaccard (word overlap) ignores word importance — two complaints both
 *   containing "the road is broken" score high even if one is about a pothole
 *   and the other about flooding. TF-IDF down-weights such filler words and
 *   up-weights the meaningful ones.
 *
 * CONFIGURATION:
 *   SIMILARITY_THRESHOLD (default 0.55) — tune this value:
 *     • Lower (e.g. 0.4) = more aggressive deduplication (more false positives)
 *     • Higher (e.g. 0.7) = stricter deduplication (may miss near-duplicates)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/** Complaints with similarity above this score are considered duplicates. */
const SIMILARITY_THRESHOLD = 0.55;

/**
 * Common English stop-words that carry no discriminating signal.
 * Removing them improves accuracy and speeds up computation.
 */
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

// ── Tokeniser ─────────────────────────────────────────────────────────────────
/**
 * Converts raw text into a filtered array of meaningful tokens.
 * Also removes single-character tokens.
 *
 * @param {string} text
 * @returns {string[]}
 */
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

// ── Term Frequency ────────────────────────────────────────────────────────────
/**
 * Calculates the normalised term frequency for each word in a token array.
 * TF(word) = count(word in doc) / total words in doc
 *
 * @param {string[]} tokens
 * @returns {Map<string, number>}
 */
function computeTF(tokens) {
  const tf    = new Map();
  const total = tokens.length || 1; // guard against empty

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  // Normalise by total token count
  for (const [word, count] of tf) {
    tf.set(word, count / total);
  }

  return tf;
}

// ── Inverse Document Frequency ────────────────────────────────────────────────
/**
 * Computes IDF for every unique word across all documents.
 * IDF(word) = log( (N + 1) / (df + 1) ) + 1   ← smoothed variant avoids log(0)
 *
 * @param {string[][]} tokenisedDocs  - array of token arrays (one per document)
 * @returns {Map<string, number>}
 */
function computeIDF(tokenisedDocs) {
  const N   = tokenisedDocs.length;
  const df  = new Map(); // document frequency per word

  for (const tokens of tokenisedDocs) {
    const uniqueInDoc = new Set(tokens);
    for (const word of uniqueInDoc) {
      df.set(word, (df.get(word) || 0) + 1);
    }
  }

  const idf = new Map();
  for (const [word, docCount] of df) {
    idf.set(word, Math.log((N + 1) / (docCount + 1)) + 1);
  }

  return idf;
}

// ── TF-IDF Vector ─────────────────────────────────────────────────────────────
/**
 * Builds a TF-IDF weight vector for a single document given a pre-computed IDF.
 *
 * @param {Map<string, number>} tf  - term frequencies for this document
 * @param {Map<string, number>} idf - global IDF values
 * @returns {Map<string, number>}   - TF-IDF weights
 */
function buildTFIDFVector(tf, idf) {
  const vector = new Map();
  for (const [word, tfVal] of tf) {
    const idfVal = idf.get(word) || 1; // unknown words get IDF = 1
    vector.set(word, tfVal * idfVal);
  }
  return vector;
}

// ── Cosine Similarity ─────────────────────────────────────────────────────────
/**
 * Computes cosine similarity between two TF-IDF vectors.
 * sim = dot(A, B) / (magnitude(A) × magnitude(B))
 *
 * Returns a value between 0 (no similarity) and 1 (identical).
 *
 * @param {Map<string, number>} vecA
 * @param {Map<string, number>} vecB
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct  = 0;
  let magA        = 0;
  let magB        = 0;

  // Dot product (only over shared words — others contribute 0)
  for (const [word, weightA] of vecA) {
    const weightB = vecB.get(word) || 0;
    dotProduct += weightA * weightB;
    magA       += weightA * weightA;
  }

  // Magnitude of B (for words not in A)
  for (const [, weightB] of vecB) {
    magB += weightB * weightB;
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;

  // Round to 4 decimal places for clean output
  return Math.round((dotProduct / denominator) * 10000) / 10000;
}

// ── Main Export: findDuplicate ────────────────────────────────────────────────
/**
 * Checks whether a new complaint is a duplicate of any existing complaints.
 *
 * Algorithm:
 *   1. Build a corpus of all complaint texts (existing + new).
 *   2. Compute IDF over the whole corpus (so word weights reflect the domain).
 *   3. Compute TF-IDF vector for the new complaint and each existing one.
 *   4. Measure cosine similarity between new and each existing complaint.
 *   5. If max similarity > SIMILARITY_THRESHOLD → return as duplicate.
 *
 * @param {string}   newText           - combined title+description of new complaint
 * @param {Array}    existingComplaints - array of Mongoose complaint documents
 * @param {number}  [threshold]        - override default threshold (0 to 1)
 * @returns {{ isDuplicate: boolean, similarity: number, matchedComplaint: object|null }}
 */
function findDuplicate(newText, existingComplaints, threshold = SIMILARITY_THRESHOLD) {
  // Guard: nothing to compare against
  if (!existingComplaints || existingComplaints.length === 0) {
    return { isDuplicate: false, similarity: 0, matchedComplaint: null };
  }

  // Step 1: Tokenise every document
  const newTokens      = tokenise(newText);
  const existingTokens = existingComplaints.map(c =>
    tokenise((c.title || '') + ' ' + (c.description || ''))
  );

  // Guard: if new complaint is empty after tokenisation, skip
  if (newTokens.length === 0) {
    return { isDuplicate: false, similarity: 0, matchedComplaint: null };
  }

  // Step 2: Compute IDF over the whole corpus (all docs + the new one)
  const corpus = [...existingTokens, newTokens];
  const idf    = computeIDF(corpus);

  // Step 3: Build TF-IDF vector for the new complaint
  const newTF     = computeTF(newTokens);
  const newVector = buildTFIDFVector(newTF, idf);

  // Step 4: Compare against each existing complaint
  let bestScore    = 0;
  let bestMatch    = null;

  for (let i = 0; i < existingComplaints.length; i++) {
    const existingTF     = computeTF(existingTokens[i]);
    const existingVector = buildTFIDFVector(existingTF, idf);
    const score          = cosineSimilarity(newVector, existingVector);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = existingComplaints[i];
    }
  }

  // Step 5: Threshold check
  const isDuplicate = bestScore >= threshold;

  return {
    isDuplicate,
    similarity:        bestScore,
    matchedComplaint:  isDuplicate ? bestMatch : null
  };
}

// ── Named Export: computeSimilarity (for single pair, useful in tests) ────────
/**
 * Convenience function to compare exactly two text strings.
 * Useful for unit tests or admin debugging.
 *
 * @param {string} textA
 * @param {string} textB
 * @returns {number} similarity score (0 to 1)
 */
function computeSimilarity(textA, textB) {
  const tokensA = tokenise(textA);
  const tokensB = tokenise(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const idf     = computeIDF([tokensA, tokensB]);
  const vectorA = buildTFIDFVector(computeTF(tokensA), idf);
  const vectorB = buildTFIDFVector(computeTF(tokensB), idf);

  return cosineSimilarity(vectorA, vectorB);
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  findDuplicate,
  computeSimilarity,
  SIMILARITY_THRESHOLD
};
