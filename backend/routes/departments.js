const express = require('express');
const Department = require('../models/Department');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all departments (public)
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create department (admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, keywords, slaHigh, slaMedium, slaLow } = req.body;
    const dept = new Department({ name, description, keywords, slaHigh, slaMedium, slaLow });
    await dept.save();
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update department (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete department (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Seed default departments
router.post('/seed', authenticate, authorize('admin'), async (req, res) => {
  try {
    const defaults = [
      { name: 'Roads Department', keywords: ['pothole', 'road', 'street', 'pavement', 'crack'], description: 'Handles road and street maintenance' },
      { name: 'Municipal Department', keywords: ['garbage', 'waste', 'trash', 'litter', 'sanitation'], description: 'Handles waste management and sanitation' },
      { name: 'Electricity Department', keywords: ['streetlight', 'power outage', 'electricity', 'electric', 'blackout'], description: 'Handles electrical infrastructure' },
      { name: 'Water Department', keywords: ['water', 'leak', 'pipe', 'drainage', 'flood'], description: 'Handles water supply and drainage' },
      { name: 'Parks Department', keywords: ['park', 'tree', 'garden', 'playground'], description: 'Handles parks and green spaces' }
    ];

    for (const dept of defaults) {
      await Department.findOneAndUpdate({ name: dept.name }, dept, { upsert: true, new: true });
    }

    res.json({ message: 'Default departments seeded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
