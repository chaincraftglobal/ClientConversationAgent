const Imap = require('imap');
const { simpleParser } = require('mailparser');
const pool = require('../config/database');
const crypto = require('crypto');
const { generateResponse } = require('./aiService');
const { sendEmail } = require('./emailService');
const messageAnalyzerService = require('./messageAnalyzerService');
// Encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const ALGORITHM = 'aes-256-cbc';
const attachmentService = require('./attachmentService');
// Global processing lock
const processingMessages = new Set();
let isPolling = false;

const decrypt = (text) => {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

// Helper function to generate email hash for deduplication
const generateEmailHash = (fromEmail, toEmail, subject, body) => {
    const content = `${fromEmail}|${toEmail}|${subject}|${body}`;
    return crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');
};

// Poll inbox for a specific agent
const pollAgentInbox = async (agentId) => {
    try {
        console.log(`📧 Polling inbox for agent ID: ${agentId}`);

        const agentResult = await pool.query(
            'SELECT * FROM agents WHERE id = $1 AND status = $2',
            [agentId, 'active']
        );

        if (agentResult.rows.length === 0) {
            console.log(`❌ Agent ${agentId} not found or inactive`);
            return;
        }

        const agent = agentResult.rows[0];
        const decryptedPassword = decrypt(agent.email_password);

        const imapConfig = {
            user: agent.email,
            password: decryptedPassword,
            host: agent.imap_host || 'imap.gmail.com',
            port: agent.imap_port || 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        };

        const imap = new Imap(imapConfig);

        return new Promise((resolve, reject) => {
            imap.once('ready', () => {
                imap.openBox('INBOX', false, async (err, box) => {
                    if (err) {
                        console.error('❌ Error opening inbox:', err);
                        imap.end();
                        return reject(err);
                    }

                    imap.search(['UNSEEN'], async (err, results) => {
                        if (err) {
                            console.error('❌ Error searching emails:', err);
                            imap.end();
                            return reject(err);
                        }

                        if (!results || results.length === 0) {
                            console.log(`✅ No new emails for agent ${agentId}`);
                            imap.end();
                            return resolve({ newEmails: 0 });
                        }

                        console.log(`📬 Found ${results.length} new email(s) for agent ${agentId}`);

                        const fetch = imap.fetch(results, { bodies: '', markSeen: true });
                        const emails = [];
                        let parseCount = 0;
                        let messageCount = 0;

                        fetch.on('message', (msg) => {
                            messageCount++;
                            msg.on('body', (stream) => {
                                simpleParser(stream, async (err, parsed) => {
                                    if (err) {
                                        console.error('❌ Error parsing email:', err);
                                        parseCount++;
                                        return;
                                    }
                                    emails.push(parsed);
                                    parseCount++;

                                    // If all emails have been parsed, process them
                                    if (parseCount === messageCount) {
                                        await processEmailBatch(agent, emails);
                                        imap.end();
                                        resolve({ newEmails: emails.length });
                                    }
                                });
                            });
                        });

                        fetch.once('error', (err) => {
                            console.error('❌ Fetch error:', err);
                            imap.end();
                            reject(err);
                        });

                        fetch.once('end', async () => {
                            console.log('✅ Done fetching emails');
                            // Wait a bit for parsing to complete
                            setTimeout(() => {
                                if (parseCount === messageCount && messageCount > 0) {
                                    // All parsed, process them
                                } else if (messageCount === 0) {
                                    imap.end();
                                    resolve({ newEmails: 0 });
                                }
                            }, 1000);
                        });
                    });
                });
            });

            imap.once('error', (err) => {
                console.error('❌ IMAP connection error:', err);
                reject(err);
            });

            imap.connect();
        });

    } catch (error) {
        console.error('❌ Poll inbox error:', error);
        throw error;
    }
};

// Process batch of emails
const processEmailBatch = async (agent, emails) => {
    for (const email of emails) {
        try {
            await processIncomingEmail(agent, email);
        } catch (error) {
            console.error('❌ Error processing email:', error);
        }
    }
};

// Process incoming email
const processIncomingEmail = async (agent, parsedEmail) => {
    const messageId = parsedEmail.messageId;

    try {
        // Double lock: in-memory + database
        if (processingMessages.has(messageId)) {
            console.log(`⚠️ Already processing (memory lock): ${messageId}`);
            return;
        }

        processingMessages.add(messageId);

        console.log(`📨 Processing email from: ${parsedEmail.from.text}`);

        const clientEmail = parsedEmail.from.value[0].address;
        const subject = parsedEmail.subject;
        const bodyText = parsedEmail.text;

        // ============================================
        // Check our deduplication emails table
        // ============================================
        const emailHash = generateEmailHash(clientEmail, agent.email, subject, bodyText);
        const dedupCheck = await pool.query(
            'SELECT id FROM emails WHERE message_id = $1 OR email_hash = $2 LIMIT 1',
            [messageId, emailHash]
        );

        if (dedupCheck.rows.length > 0) {
            console.log(`⚠️ Email already in deduplication table: ${messageId}`);
            processingMessages.delete(messageId);
            return;
        }

        // Store in deduplication table (before processing)
        try {
            await pool.query(
                `INSERT INTO emails 
                 (agent_id, message_id, from_email, to_email, subject, body, email_hash, processed)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, false)
                 ON CONFLICT (message_id) DO NOTHING`,
                [agent.id, messageId, clientEmail, agent.email, subject, bodyText, emailHash]
            );
            console.log(`✅ Email stored in deduplication table: ${messageId}`);
        } catch (error) {
            console.error('Error storing email in dedup table:', error);
        }
        // ============================================

        // Check database FIRST before any processing
        const existingMessage = await pool.query(
            'SELECT id FROM messages WHERE message_id = $1',
            [messageId]
        );

        if (existingMessage.rows.length > 0) {
            console.log(`⚠️ Message already in database: ${messageId}`);
            return;
        }

        // Find assignment
        const assignmentResult = await pool.query(
            `SELECT a.*, c.email as client_email, c.name as client_name
             FROM agent_client_assignments a
             JOIN clients c ON a.client_id = c.id
             WHERE a.agent_id = $1 AND c.email = $2 AND a.status = 'active'`,
            [agent.id, clientEmail]
        );

        if (assignmentResult.rows.length === 0) {
            console.log(`⚠️ No active assignment found for ${clientEmail}`);
            return;
        }

        const assignment = assignmentResult.rows[0];

        // Store incoming message
        const messageResult = await pool.query(
            `INSERT INTO messages (
                assignment_id, message_id, subject, sender_email, recipient_email,
                sender_type, body_text, email_received_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            RETURNING *`,
            [assignment.id, messageId, subject, clientEmail, agent.email, 'client', bodyText]
        );

        console.log(`✅ Stored client message ID: ${messageResult.rows[0].id}`);

        // ============================================
        // 📎 SAVE ATTACHMENTS IF ANY
        // ============================================
        if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
            console.log(`📎 Found ${parsedEmail.attachments.length} attachment(s)`);
            try {
                const savedAttachments = await attachmentService.saveAttachments(
                    parsedEmail.attachments,
                    messageResult.rows[0].id,
                    assignment.id
                );
                console.log(`✅ Saved ${savedAttachments.length} attachment(s)`);
            } catch (error) {
                console.error('❌ Error saving attachments:', error);
            }
        } else {
            console.log('📭 No attachments in this email');
        }
        // ============================================


        // Get conversation history
        // Get conversation history
        // Get FULL conversation history (no limit)
        const historyResult = await pool.query(
            `SELECT 
        m.*,
        COUNT(a.id) as attachment_count
     FROM messages m
     LEFT JOIN attachments a ON m.id = a.message_id
     WHERE m.assignment_id = $1
     GROUP BY m.id
     ORDER BY m.created_at ASC`,
            [assignment.id]
        );

        console.log(`📚 Loaded ${historyResult.rows.length} messages from full conversation history`);

        // ============================================
        // 🧠 SMART MESSAGE ANALYSIS
        // ============================================
        console.log('🧠 Analyzing message for smart reply timing...');

        // Get client timezone and working hours
        const clientResult = await pool.query(
            'SELECT timezone, working_hours_start, working_hours_end FROM clients WHERE id = $1',
            [assignment.client_id]
        );
        const clientData = clientResult.rows[0] || {};

        // Analyze the message
        const messageAnalysis = await messageAnalyzerService.analyzeMessage({
            messageContent: bodyText,
            conversationHistory: historyResult.rows.map(msg => ({
                sender: msg.sender_type,
                content: msg.body_text,
                created_at: msg.created_at
            })),
            assignmentSettings: {
                min_reply_delay_minutes: assignment.min_reply_delay_minutes || 15,
                max_reply_delay_minutes: assignment.max_reply_delay_minutes || 90,
                enable_smart_timing: assignment.enable_smart_timing !== false
            },
            clientTimezone: clientData.timezone || 'UTC'
        });

        console.log(`📊 Message Analysis:
- Urgency: ${messageAnalysis.urgencyLevel}/10
- Tone: ${messageAnalysis.emotionalTone}
- Suggested Delay: ${messageAnalysis.suggestedDelay} minutes
- Reasoning: ${messageAnalysis.reasoning}`);

        // Calculate scheduled reply time considering working hours
        const scheduledReplyTime = messageAnalyzerService.calculateScheduledReplyTime(
            messageAnalysis.suggestedDelay,
            clientData.timezone || 'UTC',
            clientData.working_hours_start || '09:00',
            clientData.working_hours_end || '18:00',
            messageAnalysis.shouldReplyDuringWorkingHours
        );

        const delayMs = scheduledReplyTime.getTime() - Date.now();
        const delayMinutes = Math.round(delayMs / 60000);

        console.log(`⏰ Will reply in ${delayMinutes} minutes (at ${scheduledReplyTime.toISOString()})`);
        // ============================================

        // Build complete context for AI
        // Get list of attachments shared in this conversation
        const attachmentsResult = await pool.query(
            'SELECT original_filename, mime_type, created_at FROM attachments WHERE assignment_id = $1 ORDER BY created_at DESC',
            [assignment.id]
        );

        const attachmentsList = attachmentsResult.rows.length > 0
            ? attachmentsResult.rows.map(att => `- ${att.original_filename} (${new Date(att.created_at).toLocaleDateString()})`).join('\n')
            : 'No files shared yet';

        // Build complete context for AI with strict boundaries
        const projectContext = `
═══════════════════════════════════════════════════════════
PROJECT CONTEXT - YOU MUST ONLY DISCUSS THIS PROJECT
═══════════════════════════════════════════════════════════

PROJECT DETAILS:
- Project Name: ${assignment.project_name || 'Not specified'}
- Budget: ${assignment.budget || 'Not specified'}
- Deadline: ${assignment.deadline || 'Not specified'}
- Client: ${assignment.client_name}

PROJECT BRIEF:
${assignment.project_brief || 'Not provided'}

CLIENT REQUIREMENTS:
${assignment.client_requirements || 'Not provided'}

FILES SHARED IN THIS PROJECT:
${attachmentsList}

CONVERSATION INSTRUCTIONS:
${assignment.conversation_instructions || 'Be professional and helpful'}

KEY POINTS TO REMEMBER:
${assignment.key_points || 'None specified'}

═══════════════════════════════════════════════════════════
CRITICAL INSTRUCTIONS:
═══════════════════════════════════════════════════════════
1. ONLY discuss topics related to THIS PROJECT ABOVE
2. If client asks about unrelated topics, politely redirect to the project
3. Always reference the project details when answering
4. Remember all attachments/files that were shared
5. Stay professional and focused on project delivery
6. Do NOT answer general questions unrelated to this project
7. If you don't know something about the project, say so - don't make it up

Example redirect: "I appreciate your question, but let's keep our focus on the [project name] project. Regarding the project, [relevant response]..."
═══════════════════════════════════════════════════════════
`;

        // Generate AI response with full context
        // Generate AI response with full context and tone
        console.log('🤖 Generating AI response with project context and smart tone...');
        const aiResponse = await generateResponse(
            agent.persona_description,
            agent.system_prompt,
            historyResult.rows,
            bodyText,
            projectContext,
            {
                tonePreference: assignment.reply_tone_preference || 'professional',
                clientEmotionalTone: messageAnalysis.emotionalTone,
                urgencyLevel: messageAnalysis.urgencyLevel
            }
        );

        console.log(`✅ AI response generated with tone: ${assignment.reply_tone_preference || 'professional'}, client emotion: ${messageAnalysis.emotionalTone}`);

        if (!aiResponse.success) {
            console.error('❌ AI generation failed:', aiResponse.error);
            return;
        }

        console.log('✅ AI response generated');

        // Delay to appear human
        // Smart delay based on message analysis
        console.log(`⏳ Waiting ${delayMinutes} minutes before replying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        console.log('✅ Delay complete, sending reply now...');

        // Send reply
        console.log('📤 Sending AI reply...');
        const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

        await sendEmail(agent.id, clientEmail, replySubject, aiResponse.response);

        // Store AI response
        await pool.query(
            `INSERT INTO messages (
                assignment_id, subject, sender_email, recipient_email,
                sender_type, body_text, email_sent_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [assignment.id, replySubject, agent.email, clientEmail, 'agent', aiResponse.response]
        );

        console.log('✅ AI reply sent and stored');

        // Store analysis metadata (for debugging/monitoring)
        console.log(`📝 Analysis metadata: Urgency=${messageAnalysis.urgencyLevel}, Tone=${messageAnalysis.emotionalTone}, Delay=${delayMinutes}min`);
        // ============================================
        // Mark as processed in deduplication table
        // ============================================
        try {
            await pool.query(
                'UPDATE emails SET processed = true, response_sent = true, updated_at = CURRENT_TIMESTAMP WHERE message_id = $1',
                [messageId]
            );
            console.log(`✅ Email marked as processed in dedup table: ${messageId}`);
        } catch (error) {
            console.error('Error updating dedup table:', error);
        }
        // ============================================

    } catch (error) {
        console.error('❌ Process email error:', error);
    } finally {
        if (messageId) {
            processingMessages.delete(messageId);
        }
    }
};

// Poll all active agents
const pollAllAgents = async () => {
    // Prevent overlapping polls
    if (isPolling) {
        console.log('⚠️ Already polling, skipping this cycle');
        return;
    }

    isPolling = true;

    try {
        console.log('\n🔄 Starting email polling cycle...');

        const result = await pool.query('SELECT id FROM agents WHERE status = $1', ['active']);

        if (result.rows.length === 0) {
            console.log('⚠️ No active agents to poll');
            return;
        }

        console.log(`📋 Polling ${result.rows.length} active agent(s)`);

        for (const agent of result.rows) {
            await pollAgentInbox(agent.id);
        }

        console.log('✅ Polling cycle complete\n');

    } catch (error) {
        console.error('❌ Poll all agents error:', error);
    } finally {
        isPolling = false;
    }
};

module.exports = {
    pollAgentInbox,
    pollAllAgents
};