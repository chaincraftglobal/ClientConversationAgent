const pool = require('../config/database');
const welcomeEmailService = require('../services/welcomeEmailService');
const welcomeEmailScheduler = require('../services/welcomeEmailScheduler');

// Get configuration
const getConfig = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM welcome_email_config ORDER BY id DESC LIMIT 1'
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Update configuration
const updateConfig = async (req, res) => {
    try {
        const {
            is_enabled,
            schedule_interval_hours,
            email_template,
            subject_template,
            from_email,
            from_name,
            cc_email
        } = req.body;

        const result = await pool.query(
            `UPDATE welcome_email_config 
             SET is_enabled = $1,
                 schedule_interval_hours = $2,
                 email_template = $3,
                 subject_template = $4,
                 from_email = $5,
                 from_name = $6,
                 cc_email = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = (SELECT MAX(id) FROM welcome_email_config)
             RETURNING *`,
            [is_enabled, schedule_interval_hours, email_template, subject_template, from_email, from_name, cc_email]
        );

        res.status(200).json({
            success: true,
            message: 'Configuration updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get email logs
const getLogs = async (req, res) => {
    try {
        const { limit = 50, status } = req.query;

        let query = 'SELECT * FROM welcome_email_logs';
        const params = [];

        if (status) {
            query += ' WHERE email_status = $1';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get dashboard statistics
const getStats = async (req, res) => {
    try {
        // Total emails sent today
        const todayResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM welcome_email_logs 
             WHERE DATE(created_at) = CURRENT_DATE 
             AND email_status = 'sent'`
        );

        // Total emails sent (all time)
        const totalResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM welcome_email_logs 
             WHERE email_status = 'sent'`
        );

        // Failed emails today
        const failedTodayResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM welcome_email_logs 
             WHERE DATE(created_at) = CURRENT_DATE 
             AND email_status = 'failed'`
        );

        // Get config for last run info
        const configResult = await pool.query(
            'SELECT last_run_at, next_run_at FROM welcome_email_config ORDER BY id DESC LIMIT 1'
        );

        // Recent logs
        const recentLogsResult = await pool.query(
            'SELECT * FROM welcome_email_logs ORDER BY created_at DESC LIMIT 10'
        );

        const config = configResult.rows[0] || {};

        res.status(200).json({
            success: true,
            data: {
                sentToday: parseInt(todayResult.rows[0].count),
                sentTotal: parseInt(totalResult.rows[0].count),
                failedToday: parseInt(failedTodayResult.rows[0].count),
                lastRunAt: config.last_run_at,
                nextRunAt: config.next_run_at,
                recentLogs: recentLogsResult.rows
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Test email (send test to admin)
const testEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        // Create a dummy transaction for testing
        const dummyTransaction = {
            transaction_id: 'TEST_' + Date.now(),
            customer_email: email,
            customer_name: 'Test Customer',
            amount: '1000.00',
            created_at: new Date()
        };

        const config = await welcomeEmailService.getConfig();
        const result = await welcomeEmailService.sendWelcomeEmail(dummyTransaction, config);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Test email sent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Manual trigger
const runNow = async (req, res) => {
    try {
        console.log('🔧 Manual trigger requested from API');

        const result = await welcomeEmailService.runManually();

        res.status(200).json({
            success: true,
            message: 'Welcome email check completed',
            data: result
        });

    } catch (error) {
        console.error('Run now error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get scheduler status
const getSchedulerStatus = async (req, res) => {
    try {
        const status = welcomeEmailScheduler.getStatus();

        res.status(200).json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Get scheduler status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Test SMTP connection
const testSMTPConnection = async (req, res) => {
    try {
        const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure } = req.body;

        if (!smtp_host || !smtp_port || !smtp_user || !smtp_password) {
            return res.status(400).json({
                success: false,
                message: 'All SMTP fields are required'
            });
        }

        console.log(`🔧 Testing SMTP connection: ${smtp_user}@${smtp_host}:${smtp_port}`);

        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: parseInt(smtp_port),
            secure: smtp_secure === true || smtp_port === 465,
            auth: {
                user: smtp_user,
                pass: smtp_password
            }
        });

        // Verify connection
        await transporter.verify();

        console.log('✅ SMTP connection successful');

        res.status(200).json({
            success: true,
            message: 'SMTP connection successful! ✅'
        });

    } catch (error) {
        console.error('❌ SMTP connection failed:', error);

        // Build detailed error message
        let errorMessage = error.message;

        if (error.code === 'ETIMEDOUT') {
            errorMessage = `Connection timeout. Port ${smtp_port} may be blocked by Railway or your email provider.`;
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = `Connection refused. Check host and port settings.`;
        } else if (error.code === 'EAUTH') {
            errorMessage = `Authentication failed. Check email and password.`;
        }

        // Add technical details
        if (error.code) {
            errorMessage += ` (Error code: ${error.code})`;
        }

        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
};

module.exports = {
    getConfig,
    updateConfig,
    getLogs,
    getStats,
    testEmail,
    runNow,
    getSchedulerStatus,
    testSMTPConnection  // ✅ ADD THIS
};
