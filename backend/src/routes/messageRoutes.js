const express = require('express');
const router = express.Router();
const {
    sendMessage,
    getMessagesByAssignment,
    getMessageById
} = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Message routes
router.post('/send', sendMessage);
router.get('/assignment/:assignment_id', getMessagesByAssignment);
router.get('/:id', getMessageById);

module.exports = router;