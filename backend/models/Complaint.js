/**
 * models/Complaint.js  — UPDATED
 *
 * Changes from previous version:
 *   1. latitude / longitude are now OPTIONAL (address alone is sufficient).
 *   2. category enum expanded to include Infrastructure and Health.
 *   3. Pre-save hook only fires its keyword logic when department is still "General"
 *      (avoids overriding the ML classifier result set in the route).
 *   4. Fully backward-compatible with existing MongoDB documents.
 */

const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type:     String,
    required: true,
    trim:     true
  },
  description: {
    type:     String,
    required: true,
    trim:     true
  },

  // ─── Media (images + videos) ───────────────────────────────────────────────
  media: [
    {
      url:  { type: String, required: true },
      type: { type: String, enum: ['image', 'video'], required: true }
    }
  ],
  images: [{ type: String }],   // DEPRECATED – kept for backward-compat

  // ─── Location — UPDATED: lat/lng are now OPTIONAL ──────────────────────────
  // At least one of (address) OR (latitude+longitude) is required.
  // Enforcement is done in the route, not here, so old docs remain valid.
  latitude: {
    type:     Number,
    required: false,
    default:  null
  },
  longitude: {
    type:     Number,
    required: false,
    default:  null
  },
  address: {
    type:    String,
    default: '',
    trim:    true
  },

  // ─── Classification ────────────────────────────────────────────────────────
  category: {
    type:    String,
    enum:    ['Roads', 'Municipal', 'Electricity', 'Water', 'Parks', 'Infrastructure', 'Health', 'Other'],
    default: 'Other'
  },
  department: {
    type:    String,
    default: 'General'
  },

  // ─── Civic fields ──────────────────────────────────────────────────────────
  votes: { type: Number, default: 0 },
  votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type:    String,
    enum:    ['Pending', 'InProgress', 'Resolved'],
    default: 'Pending'
  },
  priority: {
    type:    String,
    enum:    ['High', 'Medium', 'Low'],
    default: 'Low'
  },
  severity:    { type: Number, default: 1, min: 1, max: 5 },
  isAnonymous: { type: Boolean, default: false },
  citizenId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  officerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolutionImages: [{ type: String }],
  resolutionNote:   { type: String, default: '' },
  slaDeadline:      { type: Date, default: null },
  resolvedAt:       { type: Date, default: null },
  language:         { type: String, default: 'en' },
  createdAt:        { type: Date, default: Date.now },
  updatedAt:        { type: Date, default: Date.now }
});

// ─── Pre-save: fallback classification + SLA ──────────────────────────────────
// Only runs keyword classification when the department is still "General"
// (i.e. the ML classifier in the route did not already set it).
complaintSchema.pre('save', function (next) {
  if (!this.department || this.department === 'General') {
    const desc = (this.title + ' ' + this.description).toLowerCase();
    if (desc.includes('pothole') || desc.includes('road') || desc.includes('street') || desc.includes('pavement')) {
      this.category = 'Roads'; this.department = 'Roads Department';
    } else if (desc.includes('garbage') || desc.includes('waste') || desc.includes('trash') || desc.includes('litter')) {
      this.category = 'Municipal'; this.department = 'Municipal Department';
    } else if (desc.includes('streetlight') || desc.includes('electricity') || desc.includes('electric') || desc.includes('blackout')) {
      this.category = 'Electricity'; this.department = 'Electricity Department';
    } else if (desc.includes('water') || desc.includes('leak') || desc.includes('pipe') || desc.includes('drainage') || desc.includes('flood')) {
      this.category = 'Water'; this.department = 'Water Department';
    } else if (desc.includes('park') || desc.includes('tree') || desc.includes('garden')) {
      this.category = 'Parks'; this.department = 'Parks Department';
    }
  }

  // SLA deadline based on priority
  const now = new Date();
  if      (this.priority === 'High')   this.slaDeadline = new Date(now.getTime() + 1  * 24 * 60 * 60 * 1000);
  else if (this.priority === 'Medium') this.slaDeadline = new Date(now.getTime() + 3  * 24 * 60 * 60 * 1000);
  else                                  this.slaDeadline = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000);

  this.updatedAt = new Date();
  next();
});

// ─── Instance method ──────────────────────────────────────────────────────────
complaintSchema.methods.calculatePriority = function () {
  if (this.votes >= 20 || this.severity >= 4) return 'High';
  if (this.votes >= 10 || this.severity >= 3) return 'Medium';
  return 'Low';
};

module.exports = mongoose.model('Complaint', complaintSchema);
