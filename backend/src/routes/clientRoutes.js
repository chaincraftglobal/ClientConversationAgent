const express = require('express');
const router = express.Router();
const {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient
} = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Client CRUD routes
router.post('/', createClient);
router.get('/', getAllClients);
router.get('/:id', getClientById);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;