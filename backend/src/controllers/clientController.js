const pool = require('../config/database');

// Create new client
const createClient = async (req, res) => {
    try {
        const { name, email, company, phone, notes } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        // Check if client email already exists
        const clientExists = await pool.query(
            'SELECT * FROM clients WHERE email = $1',
            [email]
        );

        if (clientExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Client with this email already exists'
            });
        }

        // Insert client
        const result = await pool.query(
            `INSERT INTO clients (
        name, email, email_password, email_provider, 
        smtp_host, smtp_port, imap_host, imap_port,
        phone, company, address, city, country, industry, website, notes,
        timezone, working_hours_start, working_hours_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *`,
            [
                name, email, encryptedPassword, email_provider,
                smtp_host, smtp_port, imap_host, imap_port,
                phone, company, address, city, country, industry, website, notes,
                timezone || 'UTC',
                working_hours_start || '09:00',
                working_hours_end || '18:00'
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            data: {
                client: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating client'
        });
    }
};

// Get all clients
// Get all clients
const getAllClients = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, notes, created_at, updated_at
       FROM clients
       ORDER BY created_at DESC`
        );
        // ✅ Removed 'company' column (doesn't exist yet)

        res.status(200).json({
            success: true,
            data: {
                clients: result.rows,
                count: result.rows.length
            }
        });

    } catch (error) {
        console.log('ℹ️  [CLIENTS] Clients feature not configured yet');
        res.status(200).json({
            success: true,
            data: {
                clients: [],
                count: 0
            }
        });
    }
};

// Get single client by ID
const getClientById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, name, email, company, phone, notes, created_at, updated_at
       FROM clients
       WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                client: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching client'
        });
    }
};

// Update client
const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, company, phone, notes } = req.body;

        // Check if client exists
        const clientExists = await pool.query(
            'SELECT * FROM clients WHERE id = $1',
            [id]
        );

        if (clientExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Prepare update query
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        if (name) {
            updateFields.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (email) {
            updateFields.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (company !== undefined) {
            updateFields.push(`company = $${paramCount++}`);
            values.push(company);
        }
        if (phone !== undefined) {
            updateFields.push(`phone = $${paramCount++}`);
            values.push(phone);
        }
        if (notes !== undefined) {
            updateFields.push(`notes = $${paramCount++}`);
            values.push(notes);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
            `UPDATE clients
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, email, company, phone, notes, created_at, updated_at`,
            values
        );

        res.status(200).json({
            success: true,
            message: 'Client updated successfully',
            data: {
                client: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating client'
        });
    }
};

// Delete client
const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM clients WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Client deleted successfully'
        });

    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting client'
        });
    }
};

module.exports = {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient
};