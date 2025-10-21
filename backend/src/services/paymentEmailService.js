const nodemailer = require('nodemailer');
const pool = require('../config/database');
const crypto = require('crypto');

// Encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const ALGORITHM = 'aes-256-cbc';

const decrypt = (text) => {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

class PaymentEmailService {

    /**
     * Send failed transactions summary to admin
     */
    async sendFailedTransactionsSummary(failedCount, screenshotPath, adminEmail) {
        try {
            console.log(`📧 Sending failed transactions summary to ${adminEmail}...`);

            const subject = `⚠️ Payment Gateway Alert: ${failedCount} Failed Transaction(s)`;

            const htmlBody = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                        .content { background-color: #f8f9fa; padding: 20px; margin-top: 20px; border-radius: 5px; }
                        .alert-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                        .count { font-size: 48px; font-weight: bold; color: #dc3545; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>❌ Failed Transactions Detected</h1>
                        </div>
                        
                        <div class="content">
                            <h2>Payment Gateway Check Summary</h2>
                            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                            
                            <div class="alert-box">
                                <p style="margin: 0;"><strong>Failed Transactions Count:</strong></p>
                                <p class="count" style="margin: 10px 0;">${failedCount}</p>
                            </div>
                            
                            <p>Please review the attached screenshot for details and investigate these failed transactions in your payment gateway dashboard.</p>
                            
                            <p><strong>Action Required:</strong></p>
                            <ul>
                                <li>Login to eVirtualPay dashboard</li>
                                <li>Review failed transactions</li>
                                <li>Contact customers if needed</li>
                                <li>Investigate payment issues</li>
                            </ul>
                        </div>
                        
                        <div class="footer">
                            <p>This is an automated notification from your Payment Gateway Monitor</p>
                            <p>Login URL: <a href="https://evirtualpay.com/v2/vp_interface/login">eVirtualPay Dashboard</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.sendEmail(adminEmail, subject, htmlBody, screenshotPath);

            console.log('✅ Failed transactions summary email sent');
            return true;

        } catch (error) {
            console.error('❌ Failed to send failed transactions email:', error);
            throw error;
        }
    }

    /**
     * Send thank you email to customer for successful payment
     */
    async sendThankYouEmail(customerEmail, customerName, transactionDetails) {
        try {
            console.log(`📧 Sending thank you email to ${customerEmail}...`);

            const subject = '🎉 Payment Received - Thank You!';

            const htmlBody = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #28a745; color: white; padding: 30px; text-align: center; border-radius: 5px; }
                        .content { background-color: #ffffff; padding: 30px; margin-top: 20px; border: 1px solid #e0e0e0; border-radius: 5px; }
                        .details { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; padding-top: 20px; border-top: 1px solid #e0e0e0; }
                        .thank-you { font-size: 24px; color: #28a745; font-weight: bold; text-align: center; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Payment Confirmed</h1>
                        </div>
                        
                        <div class="content">
                            <p>Dear ${customerName || 'Valued Customer'},</p>
                            
                            <div class="thank-you">
                                Thank you for your payment!
                            </div>
                            
                            <p>We are pleased to confirm that we have received your payment. Your transaction has been processed successfully.</p>
                            
                            <div class="details">
                                <h3 style="margin-top: 0;">Transaction Details:</h3>
                                ${transactionDetails.amount ? `<p><strong>Amount:</strong> ${transactionDetails.amount}</p>` : ''}
                                ${transactionDetails.transaction_id ? `<p><strong>Transaction ID:</strong> ${transactionDetails.transaction_id}</p>` : ''}
                                ${transactionDetails.date ? `<p><strong>Date:</strong> ${transactionDetails.date}</p>` : ''}
                                ${transactionDetails.payment_method ? `<p><strong>Payment Method:</strong> ${transactionDetails.payment_method}</p>` : ''}
                            </div>
                            
                            <p>A receipt for this transaction has been processed. If you have any questions or concerns regarding this payment, please don't hesitate to contact us.</p>
                            
                            <p>We truly appreciate your business and look forward to serving you again.</p>
                            
                            <p style="margin-top: 30px;">
                                Best regards,<br>
                                <strong>Your Company Team</strong>
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>This is an automated confirmation email.</p>
                            <p>If you did not make this payment, please contact us immediately.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.sendEmail(customerEmail, subject, htmlBody);

            console.log('✅ Thank you email sent to customer');
            return true;

        } catch (error) {
            console.error('❌ Failed to send thank you email:', error);
            throw error;
        }
    }

    /**
     * Send admin notification with success transactions summary
     */
    async sendSuccessTransactionsSummary(successCount, transactions, adminEmail) {
        try {
            console.log(`📧 Sending success transactions summary to ${adminEmail}...`);

            const subject = `✅ Payment Gateway Report: ${successCount} Successful Transaction(s)`;

            const transactionsList = transactions.map((t, i) => `
                <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 10px;">${i + 1}</td>
                    <td style="padding: 10px;">${t.customer_name || 'N/A'}</td>
                    <td style="padding: 10px;">${t.customer_email || 'N/A'}</td>
                    <td style="padding: 10px;">${t.amount || 'N/A'}</td>
                    <td style="padding: 10px;">${t.thank_you_sent ? '✅ Sent' : '⏳ Pending'}</td>
                </tr>
            `).join('');

            const htmlBody = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                        .content { background-color: #f8f9fa; padding: 20px; margin-top: 20px; border-radius: 5px; }
                        .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                        .count { font-size: 48px; font-weight: bold; color: #28a745; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
                        th { background-color: #28a745; color: white; padding: 12px; text-align: left; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Successful Transactions Report</h1>
                        </div>
                        
                        <div class="content">
                            <h2>Payment Gateway Check Summary</h2>
                            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                            
                            <div class="success-box">
                                <p style="margin: 0;"><strong>Successful Transactions Count:</strong></p>
                                <p class="count" style="margin: 10px 0;">${successCount}</p>
                            </div>
                            
                            <h3>Transaction Details:</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Customer Name</th>
                                        <th>Email</th>
                                        <th>Amount</th>
                                        <th>Thank You Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactionsList}
                                </tbody>
                            </table>
                            
                            <p><strong>Note:</strong> Thank you emails have been automatically sent to customers for their successful payments.</p>
                        </div>
                        
                        <div class="footer">
                            <p>This is an automated notification from your Payment Gateway Monitor</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.sendEmail(adminEmail, subject, htmlBody);

            console.log('✅ Success transactions summary email sent');
            return true;

        } catch (error) {
            console.error('❌ Failed to send success transactions email:', error);
            throw error;
        }
    }

    /**
     * Internal method to send email using first available agent's SMTP
     */
    async sendEmail(to, subject, htmlBody, attachmentPath = null) {
        try {
            // Get first active agent to use their SMTP
            const agentResult = await pool.query(
                'SELECT * FROM agents WHERE status = $1 LIMIT 1',
                ['active']
            );

            if (agentResult.rows.length === 0) {
                throw new Error('No active agent found to send email');
            }

            const agent = agentResult.rows[0];
            const password = decrypt(agent.email_password);

            // Create transporter
            const transporter = nodemailer.createTransport({
                host: agent.smtp_host || 'smtp.gmail.com',
                port: agent.smtp_port || 587,
                secure: agent.smtp_port === 465,
                auth: {
                    user: agent.email,
                    pass: password
                }
            });

            // Email options
            const mailOptions = {
                from: agent.email,
                to: to,
                subject: subject,
                html: htmlBody
            };

            // Add attachment if provided
            if (attachmentPath) {
                mailOptions.attachments = [{
                    filename: 'screenshot.png',
                    path: attachmentPath
                }];
            }

            // Send email
            await transporter.sendMail(mailOptions);

            return true;

        } catch (error) {
            console.error('Email send error:', error);
            throw error;
        }
    }
}

module.exports = new PaymentEmailService();