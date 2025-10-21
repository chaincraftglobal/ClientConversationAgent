const pool = require('../config/database');
const crypto = require('crypto');
const paymentGatewayScheduler = require('../services/paymentGatewayScheduler');

// Encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const ALGORITHM = 'aes-256-cbc';

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const paymentGatewayController = {
    // Get credentials
    getCredentials: async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, gateway_name, login_url, username, is_active, last_checked_at FROM payment_gateway_credentials WHERE is_active = true LIMIT 1'
            );

            res.json({
                success: true,
                data: result.rows[0] || null
            });
        } catch (error) {
            console.error('Error fetching credentials:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch credentials'
            });
        }
    },

    // Save/Update credentials
    saveCredentials: async (req, res) => {
        try {
            const { login_url, username, password } = req.body;

            if (!login_url || !username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Login URL, username, and password are required'
                });
            }

            const encryptedPassword = encrypt(password);

            // Check if credentials exist
            const existing = await pool.query(
                'SELECT id FROM payment_gateway_credentials WHERE is_active = true LIMIT 1'
            );

            if (existing.rows.length > 0) {
                // Update existing
                await pool.query(
                    `UPDATE payment_gateway_credentials 
                     SET login_url = $1, username = $2, password_encrypted = $3, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $4`,
                    [login_url, username, encryptedPassword, existing.rows[0].id]
                );
            } else {
                // Insert new
                await pool.query(
                    `INSERT INTO payment_gateway_credentials (login_url, username, password_encrypted)
                     VALUES ($1, $2, $3)`,
                    [login_url, username, encryptedPassword]
                );
            }

            res.json({
                success: true,
                message: 'Credentials saved successfully'
            });
        } catch (error) {
            console.error('Error saving credentials:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save credentials'
            });
        }
    },

    // Get schedule settings
    getSchedule: async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM payment_gateway_schedule ORDER BY id DESC LIMIT 1'
            );

            res.json({
                success: true,
                data: result.rows[0] || null
            });
        } catch (error) {
            console.error('Error fetching schedule:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch schedule'
            });
        }
    },

    // Update schedule settings
    updateSchedule: async (req, res) => {
        try {
            const { check_interval_hours, admin_email, is_enabled } = req.body;

            const result = await pool.query(
                'SELECT id FROM payment_gateway_schedule LIMIT 1'
            );

            if (result.rows.length > 0) {
                // Update existing
                await pool.query(
                    `UPDATE payment_gateway_schedule 
                     SET check_interval_hours = $1, admin_email = $2, is_enabled = $3, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $4`,
                    [check_interval_hours, admin_email, is_enabled, result.rows[0].id]
                );
            } else {
                // Insert new
                await pool.query(
                    `INSERT INTO payment_gateway_schedule (check_interval_hours, admin_email, is_enabled)
                     VALUES ($1, $2, $3)`,
                    [check_interval_hours, admin_email, is_enabled]
                );
            }

            // Restart scheduler with new settings
            await paymentGatewayScheduler.restart();

            res.json({
                success: true,
                message: 'Schedule updated successfully'
            });
        } catch (error) {
            console.error('Error updating schedule:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update schedule'
            });
        }
    },

    // Manual check
    runManualCheck: async (req, res) => {
        try {
            const result = await paymentGatewayScheduler.runManualCheck();

            res.json({
                success: true,
                message: 'Check completed successfully',
                data: result
            });
        } catch (error) {
            console.error('Error running manual check:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to run check'
            });
        }
    },

    // Get check logs
    getCheckLogs: async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM payment_check_logs ORDER BY check_started_at DESC LIMIT 20'
            );

            res.json({
                success: true,
                data: {
                    logs: result.rows
                }
            });
        } catch (error) {
            console.error('Error fetching logs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch logs'
            });
        }
    },

    // Get transactions
    getTransactions: async (req, res) => {
        try {
            const { status, limit = 50 } = req.query;

            let query = 'SELECT * FROM payment_transactions';
            let params = [];

            if (status) {
                query += ' WHERE status = $1';
                params.push(status);
            }

            query += ' ORDER BY discovered_at DESC LIMIT $' + (params.length + 1);
            params.push(limit);

            const result = await pool.query(query, params);

            res.json({
                success: true,
                data: {
                    transactions: result.rows
                }
            });
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions'
            });
        }
    },

    // Get dashboard summary
    getDashboardSummary: async (req, res) => {
        try {
            // Get schedule info
            const scheduleResult = await pool.query(
                'SELECT * FROM payment_gateway_schedule ORDER BY id DESC LIMIT 1'
            );

            // Get last check log
            const lastCheckResult = await pool.query(
                'SELECT * FROM payment_check_logs ORDER BY check_started_at DESC LIMIT 1'
            );

            // Get transaction counts
            const countsResult = await pool.query(
                `SELECT 
                    COUNT(*) FILTER (WHERE status = 'success') as success_count,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
                    COUNT(*) as total_count
                 FROM payment_transactions`
            );

            // Get recent transactions
            const recentResult = await pool.query(
                'SELECT * FROM payment_transactions ORDER BY discovered_at DESC LIMIT 10'
            );

            res.json({
                success: true,
                data: {
                    schedule: scheduleResult.rows[0] || null,
                    lastCheck: lastCheckResult.rows[0] || null,
                    counts: countsResult.rows[0] || { success_count: 0, failed_count: 0, total_count: 0 },
                    recentTransactions: recentResult.rows,
                    schedulerStatus: paymentGatewayScheduler.getStatus()
                }
            });
        } catch (error) {
            console.error('Error fetching dashboard summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard summary'
            });
        }
    }
};

module.exports = paymentGatewayController;