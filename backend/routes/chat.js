const express = require('express');
const router = express.Router();
const chatController = require('./chatController');
const auth = require('../middleware/auth');

// @route   POST api/chat/ask
// @desc    Ask a question to the RAG chatbot
// @access  Protected (Requires login)
router.post('/', auth, chatController.askChatbot);

// @route   GET api/chat/logs
// @desc    Get chat session logs (Admin only)
// @access  Protected (Admin only)
router.get('/logs', auth, chatController.getChatLogs);

module.exports = router;
