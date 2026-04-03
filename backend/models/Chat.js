// backend/models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
      trim: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update lastMessageAt on every save that modifies messages
chatSchema.pre('save', function (next) {
  if (this.isModified('messages') && this.messages.length > 0) {
    this.lastMessageAt = new Date();

    // Auto-generate title from first user message
    if (this.title === 'New Chat') {
      const firstUserMsg = this.messages.find((m) => m.sender === 'user');
      if (firstUserMsg) {
        const raw = firstUserMsg.text.trim();
        this.title = raw.length > 40 ? raw.slice(0, 40) + '…' : raw;
      }
    }
  }
  next();
});

// Compound index for efficient per-user/role queries
chatSchema.index({ userId: 1, role: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
