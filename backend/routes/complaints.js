/**
 * routes/complaints.js  — UPDATED with all ML/NLP features:
 *   1. Automatic department classification   (utils/classifier.js)
 *   2. TF-IDF duplicate detection           (utils/similarity.js)
 *   3. Address-aware duplicate fallback      (address similarity when no GPS)
 *   4. ML priority prediction               (utils/priorityPredictor.js)
 *   5. Officer advisor attached to GET /:id (utils/officerAdvisor.js)
 *
 * All existing routes are preserved exactly.
 */

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');

const Complaint = require('../models/Complaint');
const { authenticate, authorize } = require('../middleware/auth');

// ── ML/NLP utilities ──────────────────────────────────────────────────────────
const { classify }        = require('../utils/classifier');
const { findDuplicate }   = require('../utils/similarity');
const { predictPriority } = require('../utils/priorityPredictor');
const { getAdvice }       = require('../utils/officerAdvisor');

const router = express.Router();

// ── Tuneable constants (override via .env) ────────────────────────────────────
const DUPLICATE_LOOKBACK_DAYS = parseInt(process.env.DUPLICATE_LOOKBACK_DAYS)  || 90;
const SIMILARITY_THRESHOLD    = parseFloat(process.env.SIMILARITY_THRESHOLD)   || undefined;
// Address similarity threshold for when GPS coords are not available
const ADDRESS_SIM_THRESHOLD   = parseFloat(process.env.ADDRESS_SIM_THRESHOLD)  || 0.5;

// ─── Multer ───────────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file,  cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`)
});
const fileFilter = (_req, file, cb) =>
  /^(image|video)\//.test(file.mimetype) ? cb(null, true) : cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

function fileToMediaObject(file) {
  return { url: `/uploads/${file.filename}`, type: file.mimetype.startsWith('video/') ? 'video' : 'image' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function textSimilarity(text1, text2) {
  const w1 = new Set(text1.toLowerCase().split(/\s+/));
  const w2 = new Set(text2.toLowerCase().split(/\s+/));
  const ix = new Set([...w1].filter(x => w2.has(x)));
  return ix.size / new Set([...w1, ...w2]).size;
}

/**
 * Address similarity — Jaccard overlap on address tokens.
 * Used as fallback when GPS coords are unavailable.
 */
function addressSimilarity(addr1 = '', addr2 = '') {
  if (!addr1 || !addr2) return 0;
  return textSimilarity(addr1, addr2);
}

/** Extract JWT userId from Authorization header. Returns null if missing/invalid. */
function extractUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret').userId;
  } catch { return null; }
}

// ─── GET /api/complaints ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, category, lat, lng, radius = 5000 } = req.query;
    const query = {};
    if (status)   query.status   = status;
    if (category) query.category = category;

    const complaints = await Complaint.find(query)
      .populate('officerId', 'name department')
      .sort({ createdAt: -1 })
      .limit(100);

    let filtered = complaints;
    if (lat && lng) {
      filtered = complaints.filter(c =>
        c.latitude != null && c.longitude != null &&
        haversineDistance(parseFloat(lat), parseFloat(lng), c.latitude, c.longitude) <= parseFloat(radius)
      );
    }

    const currentUserId = extractUserId(req);
    const result = filtered.map(c => {
      const obj   = c.toObject();
      obj.isOwner = !!(currentUserId && obj.citizenId && obj.citizenId.toString() === currentUserId.toString());
      if (obj.isAnonymous) { obj.citizenId = null; obj.reportedBy = 'Anonymous'; }
      else obj.reportedBy = obj.citizenId ? 'Citizen' : 'Anonymous';
      return obj;
    });

    res.json(result);
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/complaints/:id  — UPDATED: attaches officer advice ──────────────
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('officerId', 'name department');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const currentUserId = extractUserId(req);
    const obj   = complaint.toObject();
    obj.isOwner = !!(currentUserId && obj.citizenId && obj.citizenId.toString() === currentUserId.toString());
    if (obj.isAnonymous) { obj.citizenId = null; obj.reportedBy = 'Anonymous'; }

    // ── ML FEATURE: Officer Advisor ────────────────────────────────────────
    // Attach AI-generated suggestion to the response.
    // Does NOT touch the database — purely computed on the fly.
    obj.officerAdvice = getAdvice(complaint);
    // ──────────────────────────────────────────────────────────────────────

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/complaints/check-duplicate  (unchanged) ───────────────────────
router.post('/check-duplicate', async (req, res) => {
  try {
    const { title, description, latitude, longitude } = req.body;
    const recentComplaints = await Complaint.find({
      createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
    }).limit(200);

    const duplicates = recentComplaints.filter(c => {
      const dist = haversineDistance(latitude, longitude, c.latitude, c.longitude);
      const sim  = textSimilarity(title+' '+description, c.title+' '+c.description);
      return dist <= 100 && sim >= 0.3;
    });

    if (duplicates.length > 0) res.json({ isDuplicate: true, existing: duplicates[0] });
    else                        res.json({ isDuplicate: false });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/complaints  — UPDATED WITH ALL ML FEATURES ────────────────────
router.post('/', upload.array('media', 10), async (req, res) => {
  try {
    const {
      title, description,
      latitude, longitude, address,
      isAnonymous, severity, language,
      images   // legacy base64
    } = req.body;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    const hasCoords  = latitude  != null && longitude != null &&
                       latitude  !== ''  && longitude !== '';
    const hasAddress = address && address.trim().length > 0;

    if (!hasCoords && !hasAddress) {
      return res.status(400).json({
        message: 'Please provide either map coordinates or a text address.'
      });
    }

    // Resolve citizen from JWT
    const citizenId = extractUserId(req);

    const fullText = `${title} ${description}`;

    // ── ML FEATURE 1: AUTOMATIC DEPARTMENT CLASSIFICATION ────────────────────
    const classification = classify(fullText);
    console.log(`[Classifier] "${title}" → ${classification.department} (${classification.confidence})`);

    // ── ML FEATURE 2: PRIORITY PREDICTION ────────────────────────────────────
    // Run the keyword predictor; it feeds into the final priority below.
    const parsedSeverity   = parseInt(severity) || 1;
    const priorityResult   = predictPriority(title, description, parsedSeverity);
    console.log(`[Priority]   Predicted: ${priorityResult.priority} (${priorityResult.confidence})`);

    // ── ML FEATURE 3: DUPLICATE DETECTION ────────────────────────────────────
    const lookbackDate     = new Date(Date.now() - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const recentComplaints = await Complaint.find({ createdAt: { $gte: lookbackDate } })
      .select('title description status createdAt department latitude longitude address')
      .limit(500)
      .lean();

    let duplicateResult;

    if (hasCoords) {
      // Primary method: TF-IDF cosine similarity on text (GPS available)
      duplicateResult = findDuplicate(fullText, recentComplaints, SIMILARITY_THRESHOLD);
    } else {
      // Fallback: use address similarity when GPS coords are missing
      console.log('[Duplicate] No GPS — using address similarity fallback');
      const addressMatches = recentComplaints.filter(c =>
        addressSimilarity(address, c.address) >= ADDRESS_SIM_THRESHOLD
      );
      // Among address-matched complaints, run text similarity to confirm
      duplicateResult = findDuplicate(fullText, addressMatches, SIMILARITY_THRESHOLD);
    }

    if (duplicateResult.isDuplicate) {
      console.log(`[Duplicate] Blocked — sim=${duplicateResult.similarity} id=${duplicateResult.matchedComplaint._id}`);
      return res.status(409).json({
        message:           'A similar complaint already exists in our system.',
        similarityScore:   duplicateResult.similarity,
        existingComplaint: {
          _id:         duplicateResult.matchedComplaint._id,
          title:       duplicateResult.matchedComplaint.title,
          description: duplicateResult.matchedComplaint.description,
          status:      duplicateResult.matchedComplaint.status,
          department:  duplicateResult.matchedComplaint.department,
          createdAt:   duplicateResult.matchedComplaint.createdAt
        }
      });
    }

    // ── Build media ───────────────────────────────────────────────────────────
    const legacyImages  = Array.isArray(images) ? images : [];
    const combinedMedia = [
      ...(req.files || []).map(fileToMediaObject),
      ...legacyImages.map(url => ({ url, type: 'image' }))
    ];

    // ── Create complaint ──────────────────────────────────────────────────────
    const complaint = new Complaint({
      title,
      description,
      latitude:    hasCoords ? parseFloat(latitude)  : null,
      longitude:   hasCoords ? parseFloat(longitude) : null,
      address:     address || '',
      isAnonymous: isAnonymous || !citizenId,
      citizenId,
      severity:    parsedSeverity,
      language:    language || 'en',
      media:       combinedMedia,
      images:      legacyImages,
      // ✅ ML-assigned fields
      department:  classification.department,
      category:    classification.category,
      priority:    priorityResult.priority   // ← ML predicted priority
    });

    // The instance method recalculates from votes+severity.
    // Only override with ML prediction if the instance method gives "Low"
    // (i.e. if ML found urgency signals, trust ML; otherwise trust the formula).
    const formulaPriority = complaint.calculatePriority();
    const LEVEL = { High: 3, Medium: 2, Low: 1 };
    complaint.priority = LEVEL[priorityResult.priority] >= LEVEL[formulaPriority]
      ? priorityResult.priority
      : formulaPriority;

    await complaint.save();

    // ── Response with ML metadata ─────────────────────────────────────────────
    const response = complaint.toObject();
    response.mlInfo = {
      classification: {
        department: classification.department,
        category:   classification.category,
        confidence: classification.confidence
      },
      priority: {
        predicted:  priorityResult.priority,
        confidence: priorityResult.confidence
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── DELETE /api/complaints/:id  (unchanged) ─────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (!complaint.citizenId || complaint.citizenId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own complaints' });
    }
    if (complaint.status !== 'Pending') {
      return res.status(400).json({ message: 'Only Pending complaints can be deleted' });
    }
    complaint.media.forEach(item => {
      const fp = path.join(UPLOADS_DIR, path.basename(item.url));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/complaints/:id/vote  (unchanged) ──────────────────────────────
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    const userId = req.user._id;
    const hasVoted = complaint.votedBy.includes(userId);
    if (hasVoted) { complaint.votes -= 1; complaint.votedBy = complaint.votedBy.filter(id => !id.equals(userId)); }
    else          { complaint.votes += 1; complaint.votedBy.push(userId); }
    complaint.priority = complaint.calculatePriority();
    await complaint.save();
    res.json({ votes: complaint.votes, hasVoted: !hasVoted });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/complaints/:id/status  (unchanged) ───────────────────────────
router.patch('/:id/status', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { status, resolutionNote, resolutionImages } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    complaint.status = status;
    if (resolutionNote)   complaint.resolutionNote   = resolutionNote;
    if (resolutionImages) complaint.resolutionImages = resolutionImages;
    if (status === 'Resolved') complaint.resolvedAt  = new Date();
    complaint.updatedAt = new Date();
    await complaint.save();
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/complaints/:id/assign  (unchanged) ───────────────────────────
router.patch('/:id/assign', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { officerId } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { officerId, status: 'InProgress', updatedAt: new Date() },
      { new: true }
    ).populate('officerId', 'name department');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/complaints/officer/assigned  (unchanged) ───────────────────────
router.get('/officer/assigned', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'officer') {
      query.$or = [{ officerId: req.user._id }, { department: req.user.department }];
    }
    const complaints = await Complaint.find(query)
      .populate('citizenId', 'name')
      .populate('officerId', 'name department')
      .sort({ priority: -1, createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
