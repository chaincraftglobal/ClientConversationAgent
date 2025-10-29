const Imap = require('imap');
const { simpleParser } = require('mailparser');
const pool = require('../config/database');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

// Payment Gateway Domains to Monitor
const PAYMENT_GATEWAY_DOMAINS = [
    'fiserv.com',
    'payu.in',
    'payu.com',
    'razorpay.com',
    'cashfree.com',
    'paytm.com',
    'virtualpay.com',
    'evirtualpay.com',
    'stripe.com',
    'phonepe.com',
    'ccavenue.com',
    'instamojo.com',
    'billdesk.com',
    'paypal.com',
    'amazonpay.in'
];

// Global processing lock
const processingMessages = new Set();
let isPolling = false;

/**
 * Check if email is from payment gateway domain
 */
const isPaymentGatewayEmail = (fromEmail) => {
    const emailLower = fromEmail.toLowerCase();
    return PAYMENT_GATEWAY_DOMAINS.some(domain => emailLower.includes(`@${domain}`));
};

/**
 * Use AI to determine if email is important (not promotional)
 */
const isImportantEmail = async (subject, bodyText) => {
    try {
        const prompt = `Analyze this email and determine if it's IMPORTANT for a payment gateway application or just promotional/spam.

Email Subject: ${subject}
Email Content: ${bodyText.substring(0, 1000)}

IMPORTANT emails include:
- Application status updates
- Document/KYC requests
- Account approval/rejection
- Integration instructions
- Follow-up on application
- Verification needed
- Important notifications

SKIP (promotional) emails include:
- Marketing offers
- Product announcements
- Newsletters
- General updates
- Promotional content
- Event invitations

Respond with ONLY one word: "IMPORTANT" or "SKIP"`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 10,
            temperature: 0.3
        });

        const result = response.choices[0].message.content.trim().toUpperCase();
        return result === 'IMPORTANT';

    } catch (error) {
        console.error('❌ [AI] Error analyzing email:', error.message);
        // If AI fails, allow email through (fail-safe)
        return true;
    }
};

// Poll inbox for a specific merchant account
const pollMerchantInbox = async (merchantId) => {
    try {
        console.log(`📧 [MERCHANT] Polling inbox for merchant ID: ${merchantId}`);

        const merchantResult = await pool.query(
            'SELECT * FROM merchant_accounts WHERE id = $1 AND status = $2',
            [merchantId, 'active']
        );

        if (merchantResult.rows.length === 0) {
            console.log(`❌ [MERCHANT] Merchant ${merchantId} not found or inactive`);
            return;
        }

        const merchant = merchantResult.rows[0];
        const decryptedPassword = decrypt(merchant.email_password_encrypted);

        const imapConfig = {
            user: merchant.email,
            password: decryptedPassword,
            host: merchant.imap_host || 'imap.gmail.com',
            port: merchant.imap_port || 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        };

        const imap = new Imap(imapConfig);

        return new Promise((resolve, reject) => {
            imap.once('ready', () => {
                imap.openBox('INBOX', false, async (err, box) => {
                    if (err) {
                        console.error('❌ [MERCHANT] Error opening inbox:', err);
                        imap.end();
                        return reject(err);
                    }

                    imap.search(['UNSEEN'], async (err, results) => {
                        if (err) {
                            console.error('❌ [MERCHANT] Error searching emails:', err);
                            imap.end();
                            return reject(err);
                        }

                        if (!results || results.length === 0) {
                            console.log(`✅ [MERCHANT] No new emails for merchant ${merchantId}`);
                            imap.end();
                            return resolve({ newEmails: 0 });
                        }

                        console.log(`📬 [MERCHANT] Found ${results.length} new email(s) for merchant ${merchantId}`);

                        const fetch = imap.fetch(results, { bodies: '', markSeen: false }); // Don't mark as seen yet
                        const emails = [];
                        let parseCount = 0;
                        let messageCount = 0;

                        fetch.on('message', (msg, seqno) => {
                            messageCount++;
                            msg.on('body', (stream) => {
                                simpleParser(stream, async (err, parsed) => {
                                    if (err) {
                                        console.error('❌ [MERCHANT] Error parsing email:', err);
                                        parseCount++;
                                        return;
                                    }
                                    emails.push({ parsed, seqno });
                                    parseCount++;

                                    if (parseCount === messageCount) {
                                        await processEmailBatch(merchant, emails, imap);
                                        imap.end();
                                        resolve({ newEmails: emails.length });
                                    }
                                });
                            });
                        });

                        fetch.once('error', (err) => {
                            console.error('❌ [MERCHANT] Fetch error:', err);
                            imap.end();
                            reject(err);
                        });

                        fetch.once('end', () => {
                            console.log('✅ [MERCHANT] Done fetching emails');
                        });
                    });
                });
            });

            imap.once('error', (err) => {
                console.error('❌ [MERCHANT] IMAP connection error:', err);
                reject(err);
            });

            imap.connect();
        });

    } catch (error) {
        console.error('❌ [MERCHANT] Poll inbox error:', error);
        throw error;
    }
};

// Process batch of emails
const processEmailBatch = async (merchant, emails, imap) => {
    for (const email of emails) {
        try {
            const shouldKeep = await processIncomingEmail(merchant, email.parsed);
            
            // Mark as seen only if we're keeping it (important)
            if (shouldKeep) {
                imap.addFlags(email.seqno, ['\\Seen'], (err) => {
                    if (err) console.error('Error marking as seen:', err);
                });
            }
        } catch (error) {
            console.error('❌ [MERCHANT] Error processing email:', error);
        }
    }
};

// Process incoming email with smart filtering
const processIncomingEmail = async (merchant, parsedEmail) => {
    const messageId = parsedEmail.messageId;

    try {
        if (processingMessages.has(messageId)) {
            console.log(`⚠️ [MERCHANT] Already processing: ${messageId}`);
            return false;
        }

        processingMessages.add(messageId);

        const fromEmail = parsedEmail.from.value[0].address;
        const subject = parsedEmail.subject;
        const bodyText = parsedEmail.text || '';

        console.log(`📨 [MERCHANT] Checking email from: ${fromEmail}`);
        console.log(`📋 [MERCHANT] Subject: ${subject}`);

        // FILTER 1: Check if from payment gateway domain
       // FILTER: Check if from payment gateway domain OR about payment gateways
const isFromGateway = isPaymentGatewayEmail(fromEmail);

if (!isFromGateway) {
    // Not from gateway domain, check if ABOUT payment gateways with AI
    console.log(`⚠️ [MERCHANT] Not from gateway domain, checking content with AI: ${fromEmail}`);
    console.log(`🤖 [MERCHANT] Analyzing email with AI...`);
    
    const isImportant = await isImportantEmail(subject, bodyText);
    
    if (!isImportant) {
        console.log(`⏭️ [MERCHANT] SKIPPED - AI marked as not important`);
        return false;
    }
    
    console.log(`✅ [MERCHANT] AI approved - Email is about payment gateways!`);
} else {
    console.log(`✅ [MERCHANT] Domain check passed: ${fromEmail}`);
    
    // Still check AI for promotional filter
    console.log(`🤖 [MERCHANT] Analyzing email with AI...`);
    const isImportant = await isImportantEmail(subject, bodyText);
    
    if (!isImportant) {
        console.log(`⏭️ [MERCHANT] SKIPPED - AI marked as promotional`);
        return false;
    }
}

        if (!isImportant) {
            console.log(`⏭️ [MERCHANT] SKIPPED - AI marked as promotional/unimportant`);
            return false; // Leave as unread
        }

        console.log(`✅ [MERCHANT] AI check passed - Email is IMPORTANT!`);

        // Check if already processed
        const existingMessage = await pool.query(
            'SELECT id FROM merchant_conversations WHERE message_id = $1',
            [messageId]
        );

        if (existingMessage.rows.length > 0) {
            console.log(`⚠️ [MERCHANT] Message already in database: ${messageId}`);
            processingMessages.delete(messageId);
            return true;
        }

        const bodyHtml = parsedEmail.html;

        // Store incoming message
        const messageResult = await pool.query(
            `INSERT INTO merchant_conversations (
                merchant_account_id, message_id, from_email, to_email,
                subject, body_text, body_html, direction, 
                email_received_at, reply_required, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, true, 'pending')
            RETURNING *`,
            [merchant.id, messageId, fromEmail, merchant.email, subject, bodyText, bodyHtml, 'inbound']
        );

        console.log(`✅ [MERCHANT] Stored conversation ID: ${messageResult.rows[0].id}`);

        // Instantly forward to notification email using merchant's Gmail SMTP
        console.log(`📤 [MERCHANT] Forwarding to notification email: ${merchant.notification_email}`);
        await forwardEmail(merchant, parsedEmail);

        // Create 6-hour reminder to reply
        const reminderTime = new Date();
        reminderTime.setHours(reminderTime.getHours() + 6);

        await pool.query(
            `INSERT INTO merchant_reminders (conversation_id, reminder_type, scheduled_for)
             VALUES ($1, 'reply_reminder', $2)`,
            [messageResult.rows[0].id, reminderTime]
        );

        console.log(`⏰ [MERCHANT] Reply reminder scheduled for: ${reminderTime.toLocaleString()}`);

        return true; // Email was saved and will be marked as read

    } catch (error) {
        console.error('❌ [MERCHANT] Process email error:', error);
        return false;
    } finally {
        if (messageId) {
            processingMessages.delete(messageId);
        }
    }
};

// Forward email to notification email using merchant's Gmail SMTP (NO SendGrid!)
const forwardEmail = async (merchant, parsedEmail) => {
    try {
        const decryptedPassword = decrypt(merchant.email_password_encrypted);

        // Use merchant's own Gmail SMTP (works without SendGrid!)
        const transporter = nodemailer.createTransport({
            host: merchant.smtp_host || 'smtp.gmail.com',
            port: merchant.smtp_port || 587,
            secure: merchant.smtp_port === 465,
            auth: {
                user: merchant.email,
                pass: decryptedPassword
            }
        });

        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .header { background-color: #007bff; color: white; padding: 15px; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f8f9fa; margin-top: 10px; border-radius: 5px; }
                    .footer { margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>🔔 New IMPORTANT Email for: ${merchant.merchant_name}</h2>
                </div>
                <div class="content">
                    <p><strong>From:</strong> ${parsedEmail.from.text}</p>
                    <p><strong>To:</strong> ${merchant.email}</p>
                    <p><strong>Subject:</strong> ${parsedEmail.subject}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                    <hr>
                    <div>${parsedEmail.html || parsedEmail.text}</div>
                </div>
                <div class="footer">
                    <p>⏰ You have 6 hours to reply before getting a reminder</p>
                    <p>✅ This email was filtered by AI as IMPORTANT</p>
                    <p>This is an automated forward from your Merchant Email Manager</p>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: merchant.email,
            to: merchant.notification_email,
            subject: `🔔 [${merchant.merchant_name}] ${parsedEmail.subject}`,
            html: htmlBody
        });

        console.log(`✅ [MERCHANT] Email forwarded successfully via Gmail SMTP`);

    } catch (error) {
        console.error('❌ [MERCHANT] Forward email error:', error);
        throw error;
    }
};

// Poll all active merchants
const pollAllMerchants = async () => {
    if (isPolling) {
        console.log('⚠️ [MERCHANT] Already polling, skipping this cycle');
        return;
    }

    isPolling = true;

    try {
        console.log('\n🔄 [MERCHANT] Starting email polling cycle...');

        const result = await pool.query('SELECT id FROM merchant_accounts WHERE status = $1', ['active']);

        if (result.rows.length === 0) {
            console.log('⚠️ [MERCHANT] No active merchant accounts to poll');
            return;
        }

        console.log(`📋 [MERCHANT] Polling ${result.rows.length} active merchant(s)`);

        for (const merchant of result.rows) {
            await pollMerchantInbox(merchant.id);
        }

        console.log('✅ [MERCHANT] Polling cycle complete\n');

    } catch (error) {
        console.error('❌ [MERCHANT] Poll all merchants error:', error);
    } finally {
        isPolling = false;
    }
};

module.exports = {
    pollMerchantInbox,
    pollAllMerchants
};