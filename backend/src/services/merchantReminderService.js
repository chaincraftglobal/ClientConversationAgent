const pool = require('../config/database');
const sendgridHelper = require('../utils/sendgridHelper');
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

class MerchantReminderService {

    /**
     * Process all pending reminders
     */
    async processReminders() {
        try {
            console.log('\n⏰ [REMINDER] Checking for pending reminders...');

            // Get all due reminders
            const remindersResult = await pool.query(
                `SELECT 
                    r.*,
                    c.merchant_account_id,
                    c.from_email,
                    c.subject,
                    c.body_text,
                    c.status as conversation_status,
                    m.merchant_name,
                    m.email as merchant_email,
                    m.notification_email,
                    m.email_password_encrypted,
                    m.smtp_host,
                    m.smtp_port
                 FROM merchant_reminders r
                 JOIN merchant_conversations c ON r.conversation_id = c.id
                 JOIN merchant_accounts m ON c.merchant_account_id = m.id
                 WHERE r.sent = false 
                 AND r.dismissed = false
                 AND r.scheduled_for <= NOW()
                 AND (r.snoozed_until IS NULL OR r.snoozed_until <= NOW())
                 ORDER BY r.scheduled_for ASC`,
                []
            );

            if (remindersResult.rows.length === 0) {
                console.log('✅ [REMINDER] No pending reminders');
                return;
            }

            console.log(`📬 [REMINDER] Found ${remindersResult.rows.length} pending reminder(s)`);

            for (const reminder of remindersResult.rows) {
                try {
                    if (reminder.reminder_type === 'reply_reminder') {
                        await this.sendReplyReminder(reminder);
                    } else if (reminder.reminder_type === 'follow_up') {
                        await this.sendFollowUp(reminder);
                    }
                } catch (error) {
                    console.error(`❌ [REMINDER] Error processing reminder ${reminder.id}:`, error);
                }
            }

        } catch (error) {
            console.error('❌ [REMINDER] Error processing reminders:', error);
        }
    }

    /**
     * Send reply reminder (after X hours/minutes)
     */
    async sendReplyReminder(reminder) {
        try {
            console.log(`📧 [REMINDER] Sending reply reminder for conversation ${reminder.conversation_id}`);

            // Check if already replied
            const replyCheck = await pool.query(
                'SELECT reply_sent FROM merchant_conversations WHERE id = $1',
                [reminder.conversation_id]
            );

            if (replyCheck.rows[0]?.reply_sent) {
                console.log('✅ [REMINDER] Already replied, skipping reminder');
                await pool.query(
                    'UPDATE merchant_reminders SET dismissed = true WHERE id = $1',
                    [reminder.id]
                );
                return;
            }

            const htmlBody = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .header { background-color: #dc3545; color: white; padding: 15px; border-radius: 5px; }
                        .content { padding: 20px; background-color: #fff3cd; margin-top: 10px; border-radius: 5px; border: 2px solid #ffc107; }
                        .email-preview { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
                        .action-btn { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>⏰ REMINDER: Reply Needed!</h2>
                    </div>
                    <div class="content">
                        <h3>⚠️ You haven't replied to this email yet</h3>
                        <p><strong>Merchant Account:</strong> ${reminder.merchant_name} (${reminder.merchant_email})</p>
                        <p><strong>From:</strong> ${reminder.from_email}</p>
                        <p><strong>Subject:</strong> ${reminder.subject}</p>
                        
                        <div class="email-preview">
                            <strong>Email Content Preview:</strong>
                            <p>${reminder.body_text?.substring(0, 300)}...</p>
                        </div>

                        <p>⚠️ <strong>Action Required:</strong> Please reply to this email soon to avoid delays in your payment gateway application!</p>
                        
                        <a href="mailto:${reminder.from_email}?subject=Re: ${encodeURIComponent(reminder.subject)}" class="action-btn">
                            📧 Reply Now
                        </a>
                    </div>
                </body>
                </html>
            `;

            // Use SendGrid (Railway blocks SMTP ports)
            await sendgridHelper.sendEmail({
                to: reminder.notification_email,
                from: {
                    email: 'support@lacewingtech.in',
                    name: 'Lacewing Reminder System'
                },
                subject: `⏰ REMINDER: Reply needed for ${reminder.merchant_name}`,
                html: htmlBody
            });

            // Mark as sent
            await pool.query(
                'UPDATE merchant_reminders SET sent = true, sent_at = CURRENT_TIMESTAMP WHERE id = $1',
                [reminder.id]
            );

            console.log('✅ [REMINDER] Reply reminder sent successfully via SendGrid');

        } catch (error) {
            console.error('❌ [REMINDER] Error sending reply reminder:', error);
            throw error;
        }
    }

    /**
     * Send auto follow-up (after X hours)
     */
    async sendFollowUp(reminder) {
        try {
            console.log(`📧 [REMINDER] Sending auto follow-up for conversation ${reminder.conversation_id}`);

            // Check if they already responded
            const responseCheck = await pool.query(
                `SELECT * FROM merchant_conversations 
                 WHERE merchant_account_id = $1 
                 AND from_email = $2
                 AND email_received_at > (
                     SELECT email_sent_at FROM merchant_conversations WHERE id = $3
                 )
                 LIMIT 1`,
                [reminder.merchant_account_id, reminder.from_email, reminder.conversation_id]
            );

            if (responseCheck.rows.length > 0) {
                console.log('✅ [REMINDER] They already responded, skipping follow-up');
                await pool.query(
                    'UPDATE merchant_reminders SET dismissed = true WHERE id = $1',
                    [reminder.id]
                );
                return;
            }

            const followUpText = `Hi,

I hope this email finds you well. I wanted to follow up on my previous email regarding the payment gateway application.

Could you please provide an update on the status? I'd appreciate any information you can share.

Looking forward to hearing from you.

Best regards`;

            // Use SendGrid (Railway blocks SMTP ports)
            await sendgridHelper.sendEmail({
                to: reminder.from_email,
                from: {
                    email: 'support@lacewingtech.in',
                    name: reminder.merchant_name
                },
                subject: `Re: ${reminder.subject}`,
                html: followUpText.replace(/\n/g, '<br>')
            });

            // Mark as sent
            await pool.query(
                'UPDATE merchant_reminders SET sent = true, sent_at = CURRENT_TIMESTAMP WHERE id = $1',
                [reminder.id]
            );

            // Update conversation
            await pool.query(
                'UPDATE merchant_conversations SET follow_up_sent = true, follow_up_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
                [reminder.conversation_id]
            );

            console.log('✅ [REMINDER] Auto follow-up sent successfully via SendGrid');

        } catch (error) {
            console.error('❌ [REMINDER] Error sending follow-up:', error);
            throw error;
        }
    }

    /**
     * Create follow-up reminder with custom timing
     * @param {number} conversationId - Conversation ID
     * @param {number} minutes - Minutes from now (default 18 hours = 1080 minutes)
     */
    async createFollowUpReminder(conversationId, minutes = 1080) {
        try {
            const followUpTime = new Date();
            followUpTime.setMinutes(followUpTime.getMinutes() + minutes);

            await pool.query(
                `INSERT INTO merchant_reminders (conversation_id, reminder_type, scheduled_for)
                 VALUES ($1, 'follow_up', $2)`,
                [conversationId, followUpTime]
            );

            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

            console.log(`⏰ [REMINDER] Follow-up reminder scheduled for: ${followUpTime.toLocaleString()} (in ${timeStr})`);

        } catch (error) {
            console.error('❌ [REMINDER] Error creating follow-up reminder:', error);
        }
    }

    /**
     * Create reply reminder with custom timing
     * @param {number} conversationId - Conversation ID
     * @param {number} minutes - Minutes from now (default 6 hours = 360 minutes)
     */
    async createReplyReminder(conversationId, minutes = 360) {
        try {
            const reminderTime = new Date();
            reminderTime.setMinutes(reminderTime.getMinutes() + minutes);

            await pool.query(
                `INSERT INTO merchant_reminders (conversation_id, reminder_type, scheduled_for)
                 VALUES ($1, 'reply_reminder', $2)`,
                [conversationId, reminderTime]
            );

            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

            console.log(`⏰ [REMINDER] Reply reminder scheduled for: ${reminderTime.toLocaleString()} (in ${timeStr})`);

        } catch (error) {
            console.error('❌ [REMINDER] Error creating reply reminder:', error);
        }
    }

    /**
     * Update existing reminder time
     * @param {number} reminderId - Reminder ID
     * @param {number} minutes - Minutes from now
     */
    async updateReminderTime(reminderId, minutes) {
        try {
            const newTime = new Date();
            newTime.setMinutes(newTime.getMinutes() + minutes);

            await pool.query(
                `UPDATE merchant_reminders 
                 SET scheduled_for = $1, snoozed_until = NULL 
                 WHERE id = $2`,
                [newTime, reminderId]
            );

            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

            console.log(`⏰ [REMINDER] Updated reminder ${reminderId} to: ${newTime.toLocaleString()} (in ${timeStr})`);

        } catch (error) {
            console.error('❌ [REMINDER] Error updating reminder time:', error);
        }
    }
}

module.exports = new MerchantReminderService();