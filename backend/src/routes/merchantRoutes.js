const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Merchant accounts
router.get('/accounts', merchantController.getAllAccounts);
router.post('/accounts', merchantController.addAccount);
router.post('/accounts/test', merchantController.testCredentials);  // ✅ ADD THIS

router.put('/accounts/:id', merchantController.updateAccount);
router.delete('/accounts/:id', merchantController.deleteAccount);

// Conversations
router.get('/conversations', merchantController.getAllConversations);
router.post('/conversations/:id/mark-replied', merchantController.markAsReplied);
router.post('/conversations/:id/snooze', merchantController.snoozeReminder);

// Dashboard
router.get('/dashboard', merchantController.getDashboard);

module.exports = router;