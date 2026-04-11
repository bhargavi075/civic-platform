const mongoose = require('mongoose');

/**
 * SlaRule — per-category SLA deadlines set by admin.
 * Each rule defines how many hours a complaint in a given category
 * has before it is considered breached, broken down by priority.
 *
 * If a rule exists for a category, it overrides the hardcoded defaults
 * in the Complaint pre-save hook (High=24h, Medium=72h, Low=168h).
 */
const slaRuleSchema = new mongoose.Schema({
  category: {
    type:     String,
    required: true,
    unique:   true,   // one rule per category
    trim:     true,
  },
  highHours:   { type: Number, default: 24  },  // hours for High priority
  mediumHours: { type: Number, default: 72  },  // hours for Medium priority
  lowHours:    { type: Number, default: 168 },  // hours for Low priority
  description: { type: String, default: '' },
  createdAt:   { type: Date,   default: Date.now },
  updatedAt:   { type: Date,   default: Date.now },
});

slaRuleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SlaRule', slaRuleSchema);
