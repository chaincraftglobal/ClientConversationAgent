const express = require('express');
const router = express.Router();
const {
    createAssignment,
    getAllAssignments,
    getAssignmentById,
    updateAssignment,
    deleteAssignment
} = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Assignment routes
router.post('/', createAssignment);
router.get('/', getAllAssignments);
router.get('/:id', getAssignmentById);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

module.exports = router;