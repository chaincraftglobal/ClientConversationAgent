const pool = require('../config/database');
const nodemailer = require('nodemailer');

class ThankYouEmailService {

    /**
     * Send thank you email for successful payment
     */
    async sendThankYouEmail(transaction) {
        try {
            // Check if already sent
            if (transaction.thank_you_email_sent) {
                console.log(`⚠️ Thank you email already sent for transaction ${transaction.transaction_id}`);
                return { success: false, message: 'Already sent' };
            }

            // Validate client email
            if (!transaction.client_email) {
                console.log(`⚠️ No client email for transaction ${transaction.transaction_id}`);
                return { success: false, message: 'No client email' };
            }

            console.log(`📧 Sending thank you email for transaction ${transaction.transaction_id}`);

            // Get SMTP credentials from environment or use default
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_PORT === 465,
                auth: {
                    user: process.env.SMTP_USER || 'your-email@gmail.com',
                    pass: process.env.SMTP_PASSWORD || 'your-app-password'
                }
            });

            // Format date
            const formattedDate = new Date(transaction.transaction_date || new Date()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Create HTML email
            const htmlContent = this.createEmailTemplate(transaction, formattedDate);

            // Send email
            const mailOptions = {
                from: process.env.SMTP_USER || 'noreply@lacewingtech.com',
                to: transaction.client_email,
                cc: 'lacewinginfo@gmail.com',
                subject: '✅ Payment Received - Thank You!',
                html: htmlContent
            };

            await transporter.sendMail(mailOptions);

            // Update database
            await pool.query(
                `UPDATE payment_transactions 
                 SET thank_you_email_sent = true, 
                     thank_you_email_sent_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [transaction.id]
            );

            console.log(`✅ Thank you email sent successfully to ${transaction.client_email}`);

            return {
                success: true,
                message: 'Email sent successfully',
                sentTo: transaction.client_email
            };

        } catch (error) {
            console.error('❌ Error sending thank you email:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Create professional HTML email template
     */
    createEmailTemplate(transaction, formattedDate) {
        const clientName = transaction.client_name || 'Valued Client';
        const amount = transaction.amount || '---';
        const reference = transaction.transaction_id || transaction.reference_number || '---';
        const merchantName = transaction.merchant_name || 'Merchant';

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
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
        }
        .transaction-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .transaction-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
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
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .contact-box {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            text-align: center;
        }
        .contact-box strong {
            color: #856404;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 10px 10px;
            border: 1px solid #e0e0e0;
            border-top: none;
            font-size: 14px;
            color: #666;
        }
        .emoji {
            font-size: 48px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="emoji">🎉</div>
        <h1>Payment Received!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your payment</p>
    </div>
    
    <div class="content">
        <p>Dear <strong>${clientName}</strong>,</p>
        
        <p>Thank you for your payment! We have successfully received your transaction and it has been processed.</p>
        
        <div class="transaction-box">
            <h3 style="margin-top: 0; color: #667eea;">💳 Transaction Details</h3>
            <div class="transaction-row">
                <span class="label">Merchant:</span>
                <span class="value">${merchantName}</span>
            </div>
            <div class="transaction-row">
                <span class="label">Amount:</span>
                <span class="value">₹${amount}</span>
            </div>
            <div class="transaction-row">
                <span class="label">Reference:</span>
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
        <p>Our team will review your payment and requirements, and get back to you soon. We appreciate your business and look forward to serving you.</p>
        
        <div class="contact-box">
            <p style="margin: 5px 0;"><strong>📧 Need Help?</strong></p>
            <p style="margin: 5px 0;">If you have any urgent matters or additional requirements, please contact us:</p>
            <p style="margin: 10px 0 5px 0;">
                <a href="mailto:lacewinginfo@gmail.com" style="color: #667eea; font-weight: 600; text-decoration: none;">
                    lacewinginfo@gmail.com
                </a>
            </p>
        </div>
        
        <p style="margin-top: 30px;">We look forward to working with you!</p>
        
        <p style="margin-top: 20px;">
            Best regards,<br>
            <strong>Lacewing Team</strong>
        </p>
    </div>
    
    <div class="footer">
        <p style="margin: 5px 0;">This is an automated email. Please do not reply directly to this message.</p>
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} Lacewing Technologies. All rights reserved.</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Process all successful transactions and send emails
     */
    async processSuccessfulTransactions() {
        try {
            console.log('🔄 Checking for successful transactions needing thank you emails...');

            // Get all SUCCESS transactions that haven't received thank you email
            const result = await pool.query(
                `SELECT * FROM payment_transactions 
                 WHERE status = 'SUCCESS' 
                 AND thank_you_email_sent = false 
                 AND client_email IS NOT NULL
                 ORDER BY created_at DESC`
            );

            if (result.rows.length === 0) {
                console.log('✅ No transactions need thank you emails');
                return;
            }

            console.log(`📬 Found ${result.rows.length} transaction(s) needing thank you emails`);

            for (const transaction of result.rows) {
                await this.sendThankYouEmail(transaction);
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log('✅ Finished processing thank you emails');

        } catch (error) {
            console.error('❌ Error processing successful transactions:', error);
        }
    }
}

module.exports = new ThankYouEmailService();