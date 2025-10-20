const pool = require('../config/database');
const crypto = require('crypto');

// Encryption key from env (we'll add this later)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const ALGORITHM = 'aes-256-cbc';

// Encrypt password
const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Decrypt password
const decrypt = (text) => {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

// Create new agent
const createAgent = async (req, res) => {
    try {
        const {
            name,
            email,
            email_password,
            email_provider,
            imap_host,
            imap_port,
            smtp_host,
            smtp_port,
            persona_description,
            system_prompt
        } = req.body;

        // Validate required fields
        if (!name || !email || !email_password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if agent email already exists
        const agentExists = await pool.query(
            'SELECT * FROM agents WHERE email = $1',
            [email]
        );

        if (agentExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Agent with this email already exists'
            });
        }

        // Encrypt email password
        const encryptedPassword = encrypt(email_password);

        // Insert agent
        const result = await pool.query(
            `INSERT INTO agents (
        name, email, email_password, email_provider,
        imap_host, imap_port, smtp_host, smtp_port,
        persona_description, system_prompt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, email, email_provider, imap_host, imap_port,
                smtp_host, smtp_port, persona_description, system_prompt,
                status, created_at, updated_at`,
            [
                name, email, encryptedPassword, email_provider || 'outlook',
                imap_host, imap_port || 993, smtp_host, smtp_port || 587,
                persona_description, system_prompt
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            data: {
                agent: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Create agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating agent'
        });
    }
};

// Get all agents
const getAllAgents = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, email_provider, imap_host, imap_port,
              smtp_host, smtp_port, persona_description, system_prompt,
              status, created_at, updated_at
       FROM agents
       ORDER BY created_at DESC`
        );

        res.status(200).json({
            success: true,
            data: {
                agents: result.rows,
                count: result.rows.length
            }
        });

    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching agents'
        });
    }
};

// Get single agent by ID
const getAgentById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, name, email, email_provider, imap_host, imap_port,
              smtp_host, smtp_port, persona_description, system_prompt,
              status, created_at, updated_at
       FROM agents
       WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                agent: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching agent'
        });
    }
};

// Update agent
const updateAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            email_password,
            email_provider,
            imap_host,
            imap_port,
            smtp_host,
            smtp_port,
            persona_description,
            system_prompt,
            status
        } = req.body;

        // Check if agent exists
        const agentExists = await pool.query(
            'SELECT * FROM agents WHERE id = $1',
            [id]
        );

        if (agentExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
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
        if (email_password) {
            updateFields.push(`email_password = $${paramCount++}`);
            values.push(encrypt(email_password));
        }
        if (email_provider) {
            updateFields.push(`email_provider = $${paramCount++}`);
            values.push(email_provider);
        }
        if (imap_host) {
            updateFields.push(`imap_host = $${paramCount++}`);
            values.push(imap_host);
        }
        if (imap_port) {
            updateFields.push(`imap_port = $${paramCount++}`);
            values.push(imap_port);
        }
        if (smtp_host) {
            updateFields.push(`smtp_host = $${paramCount++}`);
            values.push(smtp_host);
        }
        if (smtp_port) {
            updateFields.push(`smtp_port = $${paramCount++}`);
            values.push(smtp_port);
        }
        if (persona_description !== undefined) {
            updateFields.push(`persona_description = $${paramCount++}`);
            values.push(persona_description);
        }
        if (system_prompt !== undefined) {
            updateFields.push(`system_prompt = $${paramCount++}`);
            values.push(system_prompt);
        }
        if (status) {
            updateFields.push(`status = $${paramCount++}`);
            values.push(status);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
            `UPDATE agents
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, email, email_provider, imap_host, imap_port,
                 smtp_host, smtp_port, persona_description, system_prompt,
                 status, created_at, updated_at`,
            values
        );

        res.status(200).json({
            success: true,
            message: 'Agent updated successfully',
            data: {
                agent: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating agent'
        });
    }
};

// Delete agent
const deleteAgent = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM agents WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Agent deleted successfully'
        });

    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting agent'
        });
    }
};

module.exports = {
    createAgent,
    getAllAgents,
    getAgentById,
    updateAgent,
    deleteAgent
};