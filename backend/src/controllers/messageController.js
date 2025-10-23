const pool = require('../config/database');
const { sendEmail } = require('../services/emailService');

// Send message (Agent sends email to Client)
const sendMessage = async (req, res) => {
    try {
        const { assignment_id, subject, body_text, body_html } = req.body;

        // Validate required fields
        if (!assignment_id || !subject || !body_text) {
            return res.status(400).json({
                success: false,
                message: 'Assignment ID, subject, and body are required'
            });
        }

        // Get assignment details
        const assignmentResult = await pool.query(
            `SELECT 
        a.id, a.agent_id, a.client_id,
        ag.name as agent_name, ag.email as agent_email,
        c.name as client_name, c.email as client_email
       FROM agent_client_assignments a
       JOIN agents ag ON a.agent_id = ag.id
       JOIN clients c ON a.client_id = c.id
       WHERE a.id = $1`,
            [assignment_id]
        );

        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        const assignment = assignmentResult.rows[0];

        // Send email via SMTP
        const emailResult = await sendEmail(
            assignment.agent_id,
            assignment.client_email,
            subject,
            body_text,
            body_html
        );

        // Store message in database
        const messageResult = await pool.query(
            `INSERT INTO messages (
        assignment_id, message_id, subject, sender_email, recipient_email,
        sender_type, body_text, body_html, email_sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *`,
            [
                assignment_id,
                emailResult.messageId,
                subject,
                assignment.agent_email,
                assignment.client_email,
                'agent',
                body_text,
                body_html
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Email sent successfully',
            data: {
                message: messageResult.rows[0],
                emailInfo: {
                    messageId: emailResult.messageId,
                    from: assignment.agent_email,
                    to: assignment.client_email
                }
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send email',
            error: error.message
        });
    }
};

// Get all messages for an assignment
const getMessagesByAssignment = async (req, res) => {
    try {
        const { assignment_id } = req.params;

        const result = await pool.query(
            `SELECT * FROM messages
       WHERE assignment_id = $1
       ORDER BY created_at ASC`,
            [assignment_id]
        );

        res.status(200).json({
            success: true,
            data: {
                messages: result.rows,
                count: result.rows.length
            }
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching messages'
        });
    }
};

// Get single message
const getMessageById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM messages WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                message: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching message'
        });
    }
};


// Get pending reply status for assignments
const getPendingReplies = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                m.id as message_id,
                m.assignment_id,
                m.scheduled_reply_time,
                m.reply_status,
                m.urgency_level,
                m.emotional_tone,
                m.subject,
                m.sender_email,
                a.project_name,
                ag.name as agent_name,
                c.name as client_name,
                EXTRACT(EPOCH FROM (m.scheduled_reply_time - NOW())) as seconds_until_reply
            FROM messages m
            JOIN agent_client_assignments a ON m.assignment_id = a.id
            JOIN agents ag ON a.agent_id = ag.id
            JOIN clients c ON a.client_id = c.id
            WHERE m.reply_status IN ('analyzing', 'scheduled', 'sending')
            AND m.sender_type = 'client'
            ORDER BY m.scheduled_reply_time ASC`,
            []
        );

        res.status(200).json({
            success: true,
            data: {
                pendingReplies: result.rows.map(row => ({
                    ...row,
                    seconds_until_reply: Math.max(0, Math.round(row.seconds_until_reply)),
                    minutes_until_reply: Math.max(0, Math.round(row.seconds_until_reply / 60))
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching pending replies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending replies',
            error: error.message
        });
    }
};

// Get reply status for specific assignment
const getReplyStatusByAssignment = async (req, res) => {
    try {
        const { assignment_id } = req.params;

        const result = await pool.query(
            `SELECT 
                m.id as message_id,
                m.assignment_id,
                m.scheduled_reply_time,
                m.reply_status,
                m.urgency_level,
                m.emotional_tone,
                m.subject,
                EXTRACT(EPOCH FROM (m.scheduled_reply_time - NOW())) as seconds_until_reply
            FROM messages m
            WHERE m.assignment_id = $1
            AND m.reply_status IN ('analyzing', 'scheduled', 'sending')
            AND m.sender_type = 'client'
            ORDER BY m.scheduled_reply_time DESC
            LIMIT 1`,
            [assignment_id]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    hasReplyPending: false
                }
            });
        }

        const reply = result.rows[0];

        res.status(200).json({
            success: true,
            data: {
                hasReplyPending: true,
                replyStatus: {
                    ...reply,
                    seconds_until_reply: Math.max(0, Math.round(reply.seconds_until_reply)),
                    minutes_until_reply: Math.max(0, Math.round(reply.seconds_until_reply / 60))
                }
            }
        });
    } catch (error) {
        console.error('Error fetching reply status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reply status',
            error: error.message
        });
    }
};
module.exports = {
    sendMessage,
    getMessagesByAssignment,
    getMessageById,
    getPendingReplies,              // ✅ ADD THIS
    getReplyStatusByAssignment      // ✅ ADD THIS
};