const pool = require('../config/database');
const nodemailer = require('nodemailer');

class WelcomeEmailService {

    /**
     * Main function - Process all new SUCCESS transactions and send welcome emails
     */
    async processNewTransactions() {
        try {
            console.log('\n🔄 [WELCOME EMAIL] Starting to process new transactions...\n');

            // Check if system is enabled
            const config = await this.getConfig();
            if (!config || !config.is_enabled) {
                console.log('⚠️ [WELCOME EMAIL] System is disabled');
                return { success: false, message: 'System disabled' };
            }

            // Get all SUCCESS transactions that haven't been sent welcome email yet
            const transactions = await this.getUnsentTransactions();

            if (transactions.length === 0) {
                console.log('✅ [WELCOME EMAIL] No new transactions to process');
                return { success: true, sent: 0 };
            }

            console.log(`📬 [WELCOME EMAIL] Found ${transactions.length} new SUCCESS transaction(s)\n`);

            let sentCount = 0;
            let failedCount = 0;

            // Process each transaction
            for (const transaction of transactions) {
                const result = await this.sendWelcomeEmail(transaction, config);
                if (result.success) {
                    sentCount++;
                } else {
                    failedCount++;
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Update last run time
            await this.updateLastRun();

            console.log(`\n✅ [WELCOME EMAIL] Completed! Sent: ${sentCount}, Failed: ${failedCount}\n`);

            return {
                success: true,
                sent: sentCount,
                failed: failedCount,
                total: transactions.length
            };

        } catch (error) {
            console.error('❌ [WELCOME EMAIL] Error processing transactions:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get transactions that need welcome email
     */
    async getUnsentTransactions() {
        const result = await pool.query(
            `SELECT pt.* 
             FROM payment_transactions pt
             LEFT JOIN welcome_email_logs wel ON pt.transaction_id = wel.transaction_id
             WHERE pt.status = 'success' 
             AND pt.customer_email IS NOT NULL
             AND pt.customer_email != ''
             AND wel.id IS NULL
             ORDER BY pt.created_at DESC`
        );
        return result.rows;
    }

    /**
     * Send welcome email to customer
     */
    async sendWelcomeEmail(transaction, config) {
        const logId = await this.createLog(transaction);

        try {
            console.log(`📧 Sending welcome email to ${transaction.customer_email}...`);

            // Create SMTP transporter
            // Get SMTP config from database
            const smtpHost = config.smtp_host || process.env.SMTP_HOST || 'smtp.hostinger.com';
            const smtpPort = config.smtp_port || parseInt(process.env.SMTP_PORT) || 465;
            const smtpUser = config.smtp_user || process.env.SMTP_USER;
            const smtpPassword = config.smtp_password || process.env.SMTP_PASSWORD;
            const smtpSecure = config.smtp_secure !== undefined ? config.smtp_secure : (smtpPort === 465);

            if (!smtpUser || !smtpPassword) {
                throw new Error('SMTP credentials not configured. Please configure in Settings.');
            }

            // Create SMTP transporter
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPassword
                }
            });

            // Format date
            const formattedDate = new Date(transaction.transaction_date || transaction.created_at || new Date()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Create email HTML
            const htmlContent = this.createEmailTemplate(transaction, formattedDate, config);

            // Send email
            const mailOptions = {
                from: `"${config.from_name || 'Lacewing Technologies'}" <${config.from_email || 'sales@lacewingtech.in'}>`,
                to: transaction.customer_email,
                cc: config.cc_email || 'lacewinginfo@gmail.com',
                subject: config.subject_template || '✅ Payment Received - Thank You!',
                html: htmlContent
            };

            await transporter.sendMail(mailOptions);

            // Update log as sent
            await this.updateLog(logId, 'sent', null);

            console.log(`✅ Welcome email sent to ${transaction.customer_email}`);

            return { success: true };

        } catch (error) {
            console.error(`❌ Failed to send welcome email to ${transaction.customer_email}:`, error);

            // Update log as failed
            await this.updateLog(logId, 'failed', error.message);

            return { success: false, error: error.message };
        }
    }

    /**
     * Create beautiful HTML email template
     */
    createEmailTemplate(transaction, formattedDate, config) {
        const customerName = transaction.customer_name || 'Valued Customer';
        const amount = transaction.amount || '---';
        const reference = transaction.transaction_id || '---';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 32px;
        }
        .emoji {
            font-size: 60px;
            margin-bottom: 15px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
        }
        .transaction-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 25px;
            margin: 30px 0;
            border-radius: 5px;
        }
        .transaction-box h3 {
            margin-top: 0;
            color: #667eea;
            font-size: 20px;
        }
        .transaction-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .transaction-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #666;
        }
        .value {
            color: #333;
            font-weight: 500;
        }
        .success-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .contact-box {
            background: #fff3cd;
            border: 2px solid #ffc107;
            padding: 25px;
            margin: 30px 0;
            border-radius: 8px;
            text-align: center;
        }
        .contact-box h4 {
            margin: 0 0 10px 0;
            color: #856404;
        }
        .contact-box a {
            color: #667eea;
            font-weight: 600;
            text-decoration: none;
            font-size: 16px;
        }
        .footer {
            background: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            font-size: 13px;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="emoji">🎉</div>
            <h1>Payment Received!</h1>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Thank you for your payment</p>
        </div>
        
        <div class="content">
            <p class="greeting">Dear <strong>${customerName}</strong>,</p>
            
            <p>Thank you for your payment! We are pleased to confirm that we have successfully received your transaction.</p>
            
            <div class="transaction-box">
                <h3>💳 Transaction Details</h3>
                <div class="transaction-row">
                    <span class="label">Amount:</span>
                    <span class="value">₹${amount}</span>
                </div>
                <div class="transaction-row">
                    <span class="label">Transaction ID:</span>
                    <span class="value">${reference}</span>
                </div>
                <div class="transaction-row">
                    <span class="label">Date:</span>
                    <span class="value">${formattedDate}</span>
                </div>
                <div class="transaction-row">
                    <span class="label">Status:</span>
                    <span class="success-badge">✓ SUCCESS</span>
                </div>
            </div>
            
            <p><strong>What's Next?</strong></p>
            <p>Our team will review your requirements and get back to you soon. We appreciate your business and look forward to serving you.</p>
            
            <div class="contact-box">
                <h4>📧 Need Help?</h4>
                <p style="margin: 10px 0;">If you have any questions or additional requirements, please contact us:</p>
                <p style="margin: 15px 0;">
                    <a href="mailto:lacewinginfo@gmail.com">lacewinginfo@gmail.com</a>
                </p>
            </div>
            
            <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>Lacewing Technologies Team</strong>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Lacewing Technologies</strong></p>
            <p>This is an automated confirmation email.</p>
            <p>© ${new Date().getFullYear()} Lacewing Technologies. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Get system configuration
     */
    async getConfig() {
        const result = await pool.query(
            'SELECT * FROM welcome_email_config ORDER BY id DESC LIMIT 1'
        );
        return result.rows[0] || null;
    }

    /**
     * Create log entry
     */
    async createLog(transaction) {
        const result = await pool.query(
            `INSERT INTO welcome_email_logs (
                transaction_id, customer_email, customer_name, amount, email_status
            ) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
            [
                transaction.transaction_id,
                transaction.customer_email,
                transaction.customer_name,
                transaction.amount
            ]
        );
        return result.rows[0].id;
    }

    /**
     * Update log entry
     */
    async updateLog(logId, status, errorMessage) {
        await pool.query(
            `UPDATE welcome_email_logs 
             SET email_status = $1, error_message = $2, sent_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [status, errorMessage, logId]
        );
    }

    /**
     * Update last run timestamp
     */
    async updateLastRun() {
        await pool.query(
            `UPDATE welcome_email_config 
             SET last_run_at = CURRENT_TIMESTAMP,
                 next_run_at = CURRENT_TIMESTAMP + (schedule_interval_hours || ' hours')::INTERVAL
             WHERE id = (SELECT MAX(id) FROM welcome_email_config)`
        );
    }

    /**
     * Manual trigger - for testing or manual runs
     */
    async runManually() {
        console.log('🔧 [WELCOME EMAIL] Manual trigger initiated...');
        return await this.processNewTransactions();
    }
}

module.exports = new WelcomeEmailService();