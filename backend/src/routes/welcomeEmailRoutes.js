const express = require('express');
const router = express.Router();
const welcomeEmailController = require('../controllers/welcomeEmailController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Configuration
router.get('/config', welcomeEmailController.getConfig);
router.put('/config', welcomeEmailController.updateConfig);

// Logs
router.get('/logs', welcomeEmailController.getLogs);

// Stats/Dashboard
router.get('/stats', welcomeEmailController.getStats);

// Actions
router.post('/test', welcomeEmailController.testEmail);
router.post('/run-now', welcomeEmailController.runNow);

// Scheduler status
router.get('/scheduler-status', welcomeEmailController.getSchedulerStatus);

module.exports = router;