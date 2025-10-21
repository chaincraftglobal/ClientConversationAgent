const express = require('express');
const router = express.Router();
const paymentGatewayController = require('../controllers/paymentGatewayController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Credentials
router.get('/credentials', paymentGatewayController.getCredentials);
router.post('/credentials', paymentGatewayController.saveCredentials);

// Schedule
router.get('/schedule', paymentGatewayController.getSchedule);
router.post('/schedule', paymentGatewayController.updateSchedule);

// Manual check
router.post('/check-now', paymentGatewayController.runManualCheck);

// Logs and transactions
router.get('/logs', paymentGatewayController.getCheckLogs);
router.get('/transactions', paymentGatewayController.getTransactions);

// Dashboard summary
router.get('/dashboard', paymentGatewayController.getDashboardSummary);

module.exports = router;