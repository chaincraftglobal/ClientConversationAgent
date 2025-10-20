const express = require('express');
const router = express.Router();
const {
    testSMTPConnection,
    testIMAPConnection,
    testFullConnection
} = require('../controllers/testConnectionController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Test connection routes
router.post('/smtp', testSMTPConnection);
router.post('/imap', testIMAPConnection);
router.post('/full', testFullConnection);

module.exports = router;