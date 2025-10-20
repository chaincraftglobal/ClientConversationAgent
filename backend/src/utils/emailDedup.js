const crypto = require('crypto');
const { simpleParser } = require('mailparser');
const pool = require('../config/database');

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate hash from email content (for fallback deduplication)
function generateEmailHash(fromEmail, toEmail, subject, body) {
    const content = `${fromEmail}|${toEmail}|${subject}|${body}`;
    return crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');
}

// Extract Message-ID from email headers
async function extractMessageId(emailData) {
    try {
        const parsed = await simpleParser(emailData);
        const messageId = parsed.messageId || null;
        return messageId;
    } catch (error) {
        console.error('Error parsing email:', error);
        return null;
    }
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

// Check if email already exists (by Message-ID or hash)
async function isDuplicateEmail(messageId, emailHash) {
    try {
        // First check by Message-ID (most reliable)
        if (messageId) {
            const result = await pool.query(
                'SELECT id FROM emails WHERE message_id = $1 LIMIT 1',
                [messageId]
            );
            if (result.rows.length > 0) {
                console.log(`⚠️  Duplicate email found by Message-ID: ${messageId}`);
                return true;
            }
        }

        // Fallback check by email hash
        const hashResult = await pool.query(
            'SELECT id FROM emails WHERE email_hash = $1 LIMIT 1',
            [emailHash]
        );
        if (hashResult.rows.length > 0) {
            console.log(`⚠️  Duplicate email found by hash: ${emailHash}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Database error checking duplicates:', error);
        throw error;
    }
}

// Store email in database
async function storeEmail(agentId, messageId, fromEmail, toEmail, subject, body, emailHash) {
    try {
        const result = await pool.query(
            `INSERT INTO emails 
       (agent_id, message_id, from_email, to_email, subject, body, email_hash, processed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       ON CONFLICT (message_id) DO NOTHING
       RETURNING id`,
            [agentId, messageId, fromEmail, toEmail, subject, body, emailHash]
        );

        if (result.rows.length > 0) {
            console.log(`✅ Email stored with ID: ${result.rows[0].id}`);
            return result.rows[0].id;
        } else {
            console.log(`⚠️  Email already exists, skipping insert`);
            return null;
        }
    } catch (error) {
        console.error('Error storing email:', error);
        throw error;
    }
}

// Mark email as processed
async function markEmailAsProcessed(emailId) {
    try {
        await pool.query(
            'UPDATE emails SET processed = true, response_sent = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [emailId]
        );
        console.log(`✅ Email ${emailId} marked as processed`);
    } catch (error) {
        console.error('Error marking email as processed:', error);
        throw error;
    }
}

// ============================================
// MAIN EMAIL PROCESSING FUNCTION
// ============================================

async function processNewEmails(agentId) {
    console.log(`\n📧 Processing emails for agent ID: ${agentId}`);

    try {
        // Fetch unread emails from your email service
        const emails = await fetchUnreadEmails(agentId);

        if (!emails || emails.length === 0) {
            console.log('✅ No new emails');
            return;
        }

        console.log(`📬 Found ${emails.length} new email(s)`);

        for (const email of emails) {
            // Extract Message-ID and generate hash
            const messageId = email.messageId || null;
            const emailHash = generateEmailHash(
                email.from,
                email.to,
                email.subject,
                email.body
            );

            // Check for duplicates BEFORE processing
            const isDuplicate = await isDuplicateEmail(messageId, emailHash);

            if (isDuplicate) {
                console.log(`❌ Skipping duplicate email from ${email.from}`);
                continue;
            }

            // Store email
            const emailId = await storeEmail(
                agentId,
                messageId,
                email.from,
                email.to,
                email.subject,
                email.body,
                emailHash
            );

            if (emailId) {
                // Generate and send AI response
                console.log('🤖 Generating AI response...');
                const aiResponse = await generateAIResponse(email.body);

                console.log('📤 Sending AI reply...');
                await sendEmailReply(email.from, email.to, aiResponse);

                // Mark as processed
                await markEmailAsProcessed(emailId);
                console.log('✅ Email processed and response sent');
            }
        }
    } catch (error) {
        console.error('Error in email processing:', error);
    }
}

// ============================================
// PLACEHOLDER FUNCTIONS (implement these)
// ============================================

async function fetchUnreadEmails(agentId) {
    // NOTE: Email fetching is now integrated into emailPollingService.js
    // This function is kept for compatibility but emails are processed
    // through the IMAP polling in emailPollingService.js
    return [];
}

async function generateAIResponse(emailBody) {
    // TODO: Implement your AI response logic
    return 'Thank you for your email!';
}

async function sendEmailReply(toEmail, fromEmail, content) {
    // TODO: Implement sending reply via nodemailer or your email service
    console.log(`Sending reply to ${toEmail}`);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    generateEmailHash,
    extractMessageId,
    isDuplicateEmail,
    storeEmail,
    markEmailAsProcessed,
    processNewEmails,
    fetchUnreadEmails,
    generateAIResponse,
    sendEmailReply,
};