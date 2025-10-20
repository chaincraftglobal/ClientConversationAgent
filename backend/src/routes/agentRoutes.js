const express = require('express');
const router = express.Router();
const {
    createAgent,
    getAllAgents,
    getAgentById,
    updateAgent,
    deleteAgent
} = require('../controllers/agentController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Agent CRUD routes
router.post('/', createAgent);
router.get('/', getAllAgents);
router.get('/:id', getAgentById);
router.put('/:id', updateAgent);
router.delete('/:id', deleteAgent);

module.exports = router;