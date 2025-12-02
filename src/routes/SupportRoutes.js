/**
 * Support Routes - Frontend Compatibility Layer
 * Provides backward compatibility for legacy frontend chat/support implementations
 * Routes /api/support/* to the new chat system under /api/chat/*
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController/chatController');
const { verifyFirebaseToken, optionalFirebaseToken } = require('../middleware/firebaseAuth');

// ========================================
// SUPPORT ROUTES (Frontend Compatibility)
// ========================================
// These routes maintain backward compatibility with existing frontend code
// that may still be using /api/support/* endpoints

// Create new support session - Maps to chat session creation
router.post('/session', verifyFirebaseToken, chatController.createChatSession);

// Get support session details
router.get('/session/:sessionId', verifyFirebaseToken, chatController.getChatSession);

// End support session
router.post('/session/end', verifyFirebaseToken, chatController.endChatSession);

// Get user's support history
router.get('/history', verifyFirebaseToken, chatController.getChatHistory);

// Send support message
router.post('/message', verifyFirebaseToken, chatController.sendMessage);

// Get support messages for a session
router.get('/messages/:sessionId', verifyFirebaseToken, chatController.getChatMessages);

// Poll for new support messages
router.get('/poll/:sessionId', verifyFirebaseToken, chatController.pollForMessages);

// Mark support messages as read
router.patch('/messages/:sessionId/read', verifyFirebaseToken, chatController.markMessagesAsRead);

// Submit support rating
router.post('/rating', optionalFirebaseToken, chatController.submitRating);

// Get rating details
router.get('/rating/:sessionId', verifyFirebaseToken, chatController.getRating);

module.exports = router;
