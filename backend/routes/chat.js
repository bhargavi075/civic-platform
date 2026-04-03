const express = require('express');
const router = express.Router();
const axios = require('axios');

const Chat = require('../models/Chat');
const { authenticate } = require('../middleware/auth');

// Apply auth middleware
router.use(authenticate);

/* =========================
   CREATE NEW CHAT
========================= */
router.post('/', async (req, res) => {
  try {
    const newChat = new Chat({
      userId: req.user._id,
      role: req.user.role,
      title: 'New Chat',
      messages: []
    });

    await newChat.save();

    res.status(201).json({
      success: true,
      chat: newChat
    });

  } catch (err) {
    console.error("CREATE CHAT ERROR:", err);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat'
    });
  }
});

/* =========================
   GET ALL CHATS
========================= */
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: req.user._id,
      role: req.user.role
    }).sort({ updatedAt: -1 });

    res.json({ success: true, chats });

  } catch (err) {
    console.error("GET CHATS ERROR:", err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats'
    });
  }
});

/* =========================
   SEND MESSAGE + AI RESPONSE
========================= */
router.post('/:id/messages', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      role: req.user.role
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // ✅ Save user message
    const userMessage = {
      sender: 'user',
      text,
      timestamp: new Date()
    };

    chat.messages.push(userMessage);

    // ✅ Prepare history
    const chatHistory = chat.messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // ✅ Check API key
    if (!process.env.GROQ_API_KEY) {
      console.error("❌ GROQ API KEY MISSING");

      const botMessage = {
        sender: 'bot',
        text: "AI not configured. Contact admin.",
        timestamp: new Date()
      };

      chat.messages.push(botMessage);
      await chat.save();

      return res.json({ success: true, userMessage, botMessage });
    }

    console.log("🚀 Calling GROQ API...");

    // ✅ FIXED GROQ API CALL
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant", // ✅ FIXED MODEL
        messages: [
          {
            role: "system",
            content: "You are a helpful civic assistant. Answer clearly and simply."
          },
          ...chatHistory
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const botReply =
      response?.data?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    // ✅ Save bot message
    const botMessage = {
      sender: 'bot',
      text: botReply,
      timestamp: new Date()
    };

    chat.messages.push(botMessage);
    await chat.save();

    res.json({
      success: true,
      userMessage,
      botMessage
    });

  } catch (err) {
    console.error("🔥 GROQ ERROR:", err.response?.data || err.message);

    res.json({
      success: true,
      userMessage: { sender: 'user', text: req.body.text },
      botMessage: {
        sender: 'bot',
        text: "⚠️ AI is temporarily unavailable. Try again."
      }
    });
  }
});

/* =========================
   DELETE CHAT
========================= */
router.delete('/:id', async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
      role: req.user.role
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      message: 'Chat deleted'
    });

  } catch (err) {
    console.error("DELETE CHAT ERROR:", err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat'
    });
  }
});

module.exports = router;