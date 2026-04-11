const express = require('express');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Analytics dashboard
router.get('/analytics', async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'InProgress' });
    
    const totalOfficers = await User.countDocuments({ role: 'officer' });
    const totalCitizens = await User.countDocuments({ role: 'citizen' });

    // Category breakdown
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrend = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Officer performance
    const officerPerformance = await Complaint.aggregate([
      { $match: { officerId: { $ne: null } } },
      { $group: {
        _id: '$officerId',
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } }
      }},
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'officer' } },
      { $unwind: '$officer' },
      { $project: { name: '$officer.name', department: '$officer.department', total: 1, resolved: 1 } },
      { $sort: { resolved: -1 } },
      { $limit: 10 }
    ]);

    // SLA breaches
    const slaBreaches = await Complaint.countDocuments({
      status: { $ne: 'Resolved' },
      slaDeadline: { $lt: new Date() }
    });

    res.json({
      totalComplaints, resolvedComplaints, pendingComplaints, inProgressComplaints,
      totalOfficers, totalCitizens, categoryStats, monthlyTrend, officerPerformance, slaBreaches,
      resolutionRate: totalComplaints > 0 ? ((resolvedComplaints / totalComplaints) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all officers
router.get('/officers', async (req, res) => {
  try {
    const officers = await User.find({ role: 'officer' }).sort({ createdAt: -1 });
    res.json(officers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create officer
router.post('/officers', async (req, res) => {
  try {
    const { name, email, password, department, jurisdiction, jurisdictionCoords } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const officer = new User({
      name, email, password, role: 'officer',
      department, jurisdiction, jurisdictionCoords
    });
    await officer.save();
    res.status(201).json(officer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update officer
router.put('/officers/:id', async (req, res) => {
  try {
    const { name, email, department, jurisdiction, jurisdictionCoords, isActive } = req.body;
    const officer = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, department, jurisdiction, jurisdictionCoords, isActive },
      { new: true }
    );
    if (!officer) return res.status(404).json({ message: 'Officer not found' });
    res.json(officer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete officer
router.delete('/officers/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Officer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all complaints (admin view)
router.get('/complaints', async (req, res) => {
  try {
    const now = new Date();
    const all = await Complaint.find()
      .populate('citizenId', 'name email')
      .populate('officerId', 'name department')
      .sort({ slaDeadline: 1, priority: -1, createdAt: -1 });

    // SLA-breached unresolved complaints surfaced first
    const breached    = all.filter(c => c.status !== 'Resolved' && c.slaDeadline && c.slaDeadline < now);
    const notBreached = all.filter(c => !(c.status !== 'Resolved' && c.slaDeadline && c.slaDeadline < now));
    res.json([...breached, ...notBreached]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all citizens
router.get('/citizens', async (req, res) => {
  try {
    const citizens = await User.find({ role: 'citizen' }).sort({ createdAt: -1 });
    res.json(citizens);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ─── Department-wise officer performance ──────────────────────────────────────

// GET /api/admin/departments/:dept/officers
// Officers in a department with complaint stat counts
router.get('/departments/:dept/officers', async (req, res) => {
  try {
    const dept = req.params.dept;
    const officers = await User.find({
      role: 'officer',
      department: { $regex: new RegExp(dept, 'i') },
    }).lean();

    if (!officers.length) return res.json([]);

    const officerIds = officers.map(o => o._id);
    const stats = await Complaint.aggregate([
      { $match: { officerId: { $in: officerIds } } },
      {
        $group: {
          _id: '$officerId',
          total:      { $sum: 1 },
          resolved:   { $sum: { $cond: [{ $eq: ['$status', 'Resolved']   }, 1, 0] } },
          pending:    { $sum: { $cond: [{ $eq: ['$status', 'Pending']    }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'InProgress'] }, 1, 0] } },
        },
      },
    ]);

    const statsMap = Object.fromEntries(stats.map(s => [String(s._id), s]));
    const result = officers.map(o => ({
      ...o,
      password: undefined,
      stats: statsMap[String(o._id)] ?? { total: 0, resolved: 0, pending: 0, inProgress: 0 },
    }));

    res.json(result);
  } catch (err) {
    console.error('dept officers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/officers/:id/issues
// Full officer profile + all assigned complaints
router.get('/officers/:id/issues', async (req, res) => {
  try {
    const officer = await User.findById(req.params.id).lean();
    if (!officer || officer.role !== 'officer')
      return res.status(404).json({ message: 'Officer not found' });

    const now        = new Date();
    const allComplaints = await Complaint.find({ officerId: officer._id })
      .sort({ slaDeadline: 1, priority: -1, createdAt: -1 })
      .lean();

    // SLA breached unresolved first
    const breached    = allComplaints.filter(c => c.status !== 'Resolved' && c.slaDeadline && c.slaDeadline < now);
    const notBreached = allComplaints.filter(c => !(c.status !== 'Resolved' && c.slaDeadline && c.slaDeadline < now));
    const complaints  = [...breached, ...notBreached];

    const resolved   = complaints.filter(c => c.status === 'Resolved').length;
    const pending    = complaints.filter(c => c.status === 'Pending').length;
    const inProgress = complaints.filter(c => c.status === 'InProgress').length;

    res.json({
      officer: { ...officer, password: undefined },
      stats: { total: complaints.length, resolved, pending, inProgress },
      complaints,
    });
  } catch (err) {
    console.error('officer issues error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
