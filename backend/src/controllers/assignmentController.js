const pool = require('../config/database');

// Create assignment (assign agent to client)
const createAssignment = async (req, res) => {
    try {
        const { agent_id, client_id, project_name, project_description } = req.body;

        // Validate required fields
        if (!agent_id || !client_id) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID and Client ID are required'
            });
        }

        // Check if agent exists
        const agentExists = await pool.query(
            'SELECT * FROM agents WHERE id = $1',
            [agent_id]
        );

        if (agentExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Check if client exists
        const clientExists = await pool.query(
            'SELECT * FROM clients WHERE id = $1',
            [client_id]
        );

        if (clientExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Check if assignment already exists
        const assignmentExists = await pool.query(
            'SELECT * FROM agent_client_assignments WHERE agent_id = $1 AND client_id = $2',
            [agent_id, client_id]
        );

        if (assignmentExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'This agent is already assigned to this client'
            });
        }

        // Create assignment
        const result = await pool.query(
            `INSERT INTO agent_client_assignments (agent_id, client_id, project_name, project_description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, agent_id, client_id, project_name, project_description, status, assigned_at`,
            [agent_id, client_id, project_name, project_description]
        );

        // Get agent and client details
        const assignment = result.rows[0];
        const agent = agentExists.rows[0];
        const client = clientExists.rows[0];

        res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            data: {
                assignment: {
                    ...assignment,
                    agent: {
                        id: agent.id,
                        name: agent.name,
                        email: agent.email
                    },
                    client: {
                        id: client.id,
                        name: client.name,
                        email: client.email
                    }
                }
            }
        });

    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating assignment'
        });
    }
};

// Get all assignments
const getAllAssignments = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
        a.id, a.agent_id, a.client_id, a.project_name, 
        a.project_description, a.status, a.assigned_at,
        ag.name as agent_name, ag.email as agent_email,
        c.name as client_name, c.email as client_email, c.company as client_company
       FROM agent_client_assignments a
       JOIN agents ag ON a.agent_id = ag.id
       JOIN clients c ON a.client_id = c.id
       ORDER BY a.assigned_at DESC`
        );

        res.status(200).json({
            success: true,
            data: {
                assignments: result.rows,
                count: result.rows.length
            }
        });

    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching assignments'
        });
    }
};

// Get single assignment by ID
const getAssignmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
        a.id, a.agent_id, a.client_id, a.project_name, 
        a.project_description, a.status, a.assigned_at,
        ag.name as agent_name, ag.email as agent_email,
        c.name as client_name, c.email as client_email, c.company as client_company
       FROM agent_client_assignments a
       JOIN agents ag ON a.agent_id = ag.id
       JOIN clients c ON a.client_id = c.id
       WHERE a.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                assignment: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching assignment'
        });
    }
};

// Update assignment
const updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { project_name, project_description, status } = req.body;

        // Check if assignment exists
        const assignmentExists = await pool.query(
            'SELECT * FROM agent_client_assignments WHERE id = $1',
            [id]
        );

        if (assignmentExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Prepare update query
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        if (project_name !== undefined) {
            updateFields.push(`project_name = $${paramCount++}`);
            values.push(project_name);
        }
        if (project_description !== undefined) {
            updateFields.push(`project_description = $${paramCount++}`);
            values.push(project_description);
        }
        if (status) {
            updateFields.push(`status = $${paramCount++}`);
            values.push(status);
        }

        values.push(id);

        const result = await pool.query(
            `UPDATE agent_client_assignments
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, agent_id, client_id, project_name, project_description, status, assigned_at`,
            values
        );

        res.status(200).json({
            success: true,
            message: 'Assignment updated successfully',
            data: {
                assignment: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating assignment'
        });
    }
};

// Delete assignment
const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM agent_client_assignments WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Assignment deleted successfully'
        });

    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting assignment'
        });
    }
};

module.exports = {
    createAssignment,
    getAllAssignments,
    getAssignmentById,
    updateAssignment,
    deleteAssignment
};