/**
 * routes/slaRules.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only CRUD for per-category SLA rules.
 *
 * GET    /api/sla-rules          → list all rules
 * POST   /api/sla-rules          → create or update rule for a category (upsert)
 * PUT    /api/sla-rules/:id      → update a rule by id
 * DELETE /api/sla-rules/:id      → delete a rule
 *
 * When a rule is saved/updated, all existing unresolved complaints in that
 * category get their slaDeadline recalculated based on the new rule.
 */

const express   = require('express');
const SlaRule   = require('../models/SlaRule');
const Complaint = require('../models/Complaint');
const { authenticate, authorize } = require('../middleware/auth');
const { computeSlaDeadlineSync }  = require('../utils/slaHelper');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// ── GET /api/sla-rules ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rules = await SlaRule.find().sort({ category: 1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/sla-rules ───────────────────────────────────────────────────────
// Upsert: if a rule for this category exists, update it; otherwise create it.
router.post('/', async (req, res) => {
  try {
    const { category, highHours, mediumHours, lowHours, description } = req.body;
    if (!category) return res.status(400).json({ message: 'category is required' });

    const rule = await SlaRule.findOneAndUpdate(
      { category },
      { category, highHours, mediumHours, lowHours, description, updatedAt: new Date() },
      { new: true, upsert: true, runValidators: true }
    );

    // Backfill: recalculate slaDeadline for all unresolved complaints in this category
    await _backfillCategory(category, rule);

    res.status(201).json(rule);
  } catch (err) {
    console.error('SLA rule create error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/sla-rules/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { category, highHours, mediumHours, lowHours, description } = req.body;
    const rule = await SlaRule.findByIdAndUpdate(
      req.params.id,
      { category, highHours, mediumHours, lowHours, description, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    // Backfill recalculation
    await _backfillCategory(rule.category, rule);

    res.json(rule);
  } catch (err) {
    console.error('SLA rule update error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── DELETE /api/sla-rules/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const rule = await SlaRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json({ message: 'Rule deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Internal: recalculate slaDeadline for all unresolved complaints ───────────
async function _backfillCategory(category, rule) {
  try {
    const complaints = await Complaint.find({
      category,
      status: { $ne: 'Resolved' },
    }).select('priority createdAt slaDeadline');

    const rulesMap = { [category]: rule };
    const bulkOps  = complaints.map(c => ({
      updateOne: {
        filter: { _id: c._id },
        update: {
          $set: {
            slaDeadline: computeSlaDeadlineSync(rulesMap, category, c.priority, c.createdAt),
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await Complaint.bulkWrite(bulkOps);
      console.log(`[SlaRules] Backfilled ${bulkOps.length} complaints in category "${category}"`);
    }
  } catch (err) {
    console.error('[SlaRules] Backfill error:', err.message);
  }
}

module.exports = router;
