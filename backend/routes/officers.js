const express = require('express');
const Complaint = require('../models/Complaint');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get complaints for current officer's department
router.get('/complaints', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'officer') {
      query = {
        $or: [
          { officerId: req.user._id },
          { department: req.user.department }
        ]
      };
    }

    const complaints = await Complaint.find(query)
      .populate('citizenId', 'name email')
      .populate('officerId', 'name department')
      .sort({ priority: -1, votes: -1, createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update complaint status
router.patch('/complaints/:id', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { status, resolutionNote, resolutionImages } = req.body;
    
    const updates = { status, updatedAt: new Date() };
    if (resolutionNote) updates.resolutionNote = resolutionNote;
    if (resolutionImages) updates.resolutionImages = resolutionImages;
    if (status === 'Resolved') updates.resolvedAt = new Date();

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('citizenId', 'name email')
      .populate('officerId', 'name department');

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get officer stats
router.get('/stats', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    let matchQuery = {};
    if (req.user.role === 'officer') {
      matchQuery = { $or: [{ officerId: req.user._id }, { department: req.user.department }] };
    }

    const total = await Complaint.countDocuments(matchQuery);
    const resolved = await Complaint.countDocuments({ ...matchQuery, status: 'Resolved' });
    const inProgress = await Complaint.countDocuments({ ...matchQuery, status: 'InProgress' });
    const pending = await Complaint.countDocuments({ ...matchQuery, status: 'Pending' });

    res.json({ total, resolved, inProgress, pending });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
