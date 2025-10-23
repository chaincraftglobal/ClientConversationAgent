const pool = require('../config/database');
const crypto = require('crypto');
const merchantReminderService = require('../services/merchantReminderService');

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

const merchantController = {
    // Get all merchant accounts
    getAllAccounts: async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT id, merchant_name, email, notification_email, status, last_checked_at, created_at
                 FROM merchant_accounts
                 ORDER BY created_at DESC`
            );

            res.json({
                success: true,
                data: {
                    accounts: result.rows
                }
            });
        } catch (error) {
            console.error('Error fetching merchant accounts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch merchant accounts'
            });
        }
    },

    // Add new merchant account
    addAccount: async (req, res) => {
        try {
            const { merchant_name, email, password, notification_email, imap_host, imap_port, smtp_host, smtp_port } = req.body;

            if (!merchant_name || !email || !password || !notification_email) {
                return res.status(400).json({
                    success: false,
                    message: 'Merchant name, email, password, and notification email are required'
                });
            }

            const encryptedPassword = encrypt(password);

            const result = await pool.query(
                `INSERT INTO merchant_accounts (
                    merchant_name, email, email_password_encrypted, notification_email,
                    imap_host, imap_port, smtp_host, smtp_port
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, merchant_name, email, notification_email, status, created_at`,
                [
                    merchant_name,
                    email,
                    encryptedPassword,
                    notification_email,
                    imap_host || 'imap.gmail.com',
                    imap_port || 993,
                    smtp_host || 'smtp.gmail.com',
                    smtp_port || 587
                ]
            );

            res.status(201).json({
                success: true,
                message: 'Merchant account added successfully',
                data: {
                    account: result.rows[0]
                }
            });
        } catch (error) {
            console.error('Error adding merchant account:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add merchant account',
                error: error.message
            });
        }
    },

    // Update merchant account
    updateAccount: async (req, res) => {
        try {
            const { id } = req.params;
            const { merchant_name, notification_email, status } = req.body;

            const result = await pool.query(
                `UPDATE merchant_accounts 
                 SET merchant_name = COALESCE($1, merchant_name),
                     notification_email = COALESCE($2, notification_email),
                     status = COALESCE($3, status),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4
                 RETURNING id, merchant_name, email, notification_email, status`,
                [merchant_name, notification_email, status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Merchant account not found'
                });
            }

            res.json({
                success: true,
                message: 'Merchant account updated successfully',
                data: {
                    account: result.rows[0]
                }
            });
        } catch (error) {
            console.error('Error updating merchant account:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update merchant account'
            });
        }
    },

    // Delete merchant account
    deleteAccount: async (req, res) => {
        try {
            const { id } = req.params;

            const result = await pool.query(
                'DELETE FROM merchant_accounts WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Merchant account not found'
                });
            }

            res.json({
                success: true,
                message: 'Merchant account deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting merchant account:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete merchant account'
            });
        }
    },

    // Get all conversations
    getAllConversations: async (req, res) => {
        try {
            const { merchant_id, status } = req.query;

            let query = `
                SELECT 
                    c.*,
                    m.merchant_name,
                    m.email as merchant_email,
                    (SELECT COUNT(*) FROM merchant_reminders WHERE conversation_id = c.id AND sent = false AND dismissed = false) as pending_reminders
                FROM merchant_conversations c
                JOIN merchant_accounts m ON c.merchant_account_id = m.id
                WHERE 1=1
            `;

            const params = [];
            let paramCount = 1;

            if (merchant_id) {
                query += ` AND c.merchant_account_id = $${paramCount}`;
                params.push(merchant_id);
                paramCount++;
            }

            if (status) {
                query += ` AND c.status = $${paramCount}`;
                params.push(status);
                paramCount++;
            }

            query += ` ORDER BY c.email_received_at DESC`;

            const result = await pool.query(query, params);

            res.json({
                success: true,
                data: {
                    conversations: result.rows
                }
            });
        } catch (error) {
            console.error('Error fetching conversations:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch conversations'
            });
        }
    },

    // Mark conversation as replied
    markAsReplied: async (req, res) => {
        try {
            const { id } = req.params;

            // Update conversation
            const result = await pool.query(
                `UPDATE merchant_conversations 
                 SET reply_sent = true, 
                     reply_sent_at = CURRENT_TIMESTAMP,
                     status = 'awaiting_response'
                 WHERE id = $1
                 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found'
                });
            }

            // Dismiss reply reminders
            await pool.query(
                `UPDATE merchant_reminders 
                 SET dismissed = true 
                 WHERE conversation_id = $1 AND reminder_type = 'reply_reminder'`,
                [id]
            );

            // Create follow-up reminder (18 hours)
            await merchantReminderService.createFollowUpReminder(id);

            res.json({
                success: true,
                message: 'Marked as replied and follow-up scheduled'
            });
        } catch (error) {
            console.error('Error marking as replied:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark as replied'
            });
        }
    },

    // Snooze reminder
    snoozeReminder: async (req, res) => {
        try {
            const { id } = req.params;
            const { hours } = req.body;

            if (!hours || hours < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Hours must be at least 1'
                });
            }

            const snoozeUntil = new Date();
            snoozeUntil.setHours(snoozeUntil.getHours() + hours);

            await pool.query(
                'UPDATE merchant_reminders SET snoozed_until = $1 WHERE conversation_id = $2 AND sent = false',
                [snoozeUntil, id]
            );

            res.json({
                success: true,
                message: `Reminder snoozed for ${hours} hour(s)`
            });
        } catch (error) {
            console.error('Error snoozing reminder:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to snooze reminder'
            });
        }
    },

    // Get dashboard summary
    getDashboard: async (req, res) => {
        try {
            // Get account count
            const accountCount = await pool.query(
                'SELECT COUNT(*) as total FROM merchant_accounts WHERE status = $1',
                ['active']
            );

            // Get conversation stats
            const conversationStats = await pool.query(
                `SELECT 
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                    COUNT(*) FILTER (WHERE status = 'awaiting_response') as awaiting_count,
                    COUNT(*) FILTER (WHERE reply_required = true AND reply_sent = false) as need_reply_count
                 FROM merchant_conversations`
            );

            // Get pending reminders
            const pendingReminders = await pool.query(
                `SELECT COUNT(*) as total 
                 FROM merchant_reminders 
                 WHERE sent = false 
                 AND dismissed = false 
                 AND scheduled_for <= NOW()
                 AND (snoozed_until IS NULL OR snoozed_until <= NOW())`
            );

            // Get recent conversations
            const recentConversations = await pool.query(
                `SELECT 
                    c.*,
                    m.merchant_name,
                    m.email as merchant_email
                 FROM merchant_conversations c
                 JOIN merchant_accounts m ON c.merchant_account_id = m.id
                 ORDER BY c.email_received_at DESC
                 LIMIT 10`
            );

            res.json({
                success: true,
                data: {
                    accountCount: parseInt(accountCount.rows[0].total),
                    stats: conversationStats.rows[0],
                    pendingReminders: parseInt(pendingReminders.rows[0].total),
                    recentConversations: recentConversations.rows
                }
            });
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data'
            });
        }
    },
    // Test email credentials
    testCredentials: async (req, res) => {
        const Imap = require('imap');
        const crypto = require('crypto');

        try {
            const { email, password, imap_host, imap_port } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            console.log(`🧪 Testing credentials for: ${email}`);

            const imapConfig = {
                user: email,
                password: password,
                host: imap_host || 'imap.gmail.com',
                port: imap_port || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            };

            const imap = new Imap(imapConfig);

            return new Promise((resolve) => {
                imap.once('ready', () => {
                    console.log('✅ IMAP connection successful');
                    imap.end();
                    res.json({
                        success: true,
                        message: 'Connection successful! Credentials are working.'
                    });
                    resolve();
                });

                imap.once('error', (err) => {
                    console.error('❌ IMAP connection failed:', err.message);
                    imap.end();
                    res.status(400).json({
                        success: false,
                        message: 'Connection failed: ' + err.message
                    });
                    resolve();
                });

                imap.connect();
            });

        } catch (error) {
            console.error('Test credentials error:', error);
            res.status(500).json({
                success: false,
                message: 'Test failed: ' + error.message
            });
        }
    }



};

module.exports = {
    getAllAccounts: merchantController.getAllAccounts,
    addAccount: merchantController.addAccount,
    updateAccount: merchantController.updateAccount,
    deleteAccount: merchantController.deleteAccount,
    getAllConversations: merchantController.getAllConversations,
    markAsReplied: merchantController.markAsReplied,
    snoozeReminder: merchantController.snoozeReminder,
    getDashboard: merchantController.getDashboard,
    testCredentials: merchantController.testCredentials  // ✅ ADD THIS
};