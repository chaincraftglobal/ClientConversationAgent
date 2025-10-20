const nodemailer = require('nodemailer');
const pool = require('../config/database');
const crypto = require('crypto');
const { createEmailTemplate } = require('../utils/emailTemplates');

// Encryption (same as agent controller)
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

// Send email function
const sendEmail = async (agentId, toEmail, subject, bodyText, bodyHtml = null) => {
    try {
        // Get agent details
        const agentResult = await pool.query(
            'SELECT * FROM agents WHERE id = $1',
            [agentId]
        );

        if (agentResult.rows.length === 0) {
            throw new Error('Agent not found');
        }

        const agent = agentResult.rows[0];
        const decryptedPassword = decrypt(agent.email_password);

        // Create transporter based on email provider
        let transporter;
        let smtpConfig = {};

        if (agent.email_provider === 'gmail') {
            smtpConfig = {
                host: agent.smtp_host || 'smtp.gmail.com',
                port: agent.smtp_port || 587,
                secure: false,
                auth: {
                    user: agent.email,
                    pass: decryptedPassword
                }
            };
        } else if (agent.email_provider === 'outlook') {
            smtpConfig = {
                host: agent.smtp_host || 'smtp.office365.com',
                port: agent.smtp_port || 587,
                secure: false,
                auth: {
                    user: agent.email,
                    pass: decryptedPassword
                }
            };
        } else if (agent.email_provider === 'yahoo') {
            smtpConfig = {
                host: agent.smtp_host || 'smtp.mail.yahoo.com',
                port: agent.smtp_port || 587,
                secure: false,
                auth: {
                    user: agent.email,
                    pass: decryptedPassword
                }
            };
        } else {
            // Custom SMTP
            smtpConfig = {
                host: agent.smtp_host,
                port: agent.smtp_port || 587,
                secure: agent.smtp_port === 465,
                auth: {
                    user: agent.email,
                    pass: decryptedPassword
                }
            };
        }

        transporter = nodemailer.createTransport(smtpConfig);

        // Create HTML email if bodyHtml not provided
        // Create HTML email if bodyHtml not provided
        const htmlContent = bodyHtml || createEmailTemplate(agent, bodyText);

        // Send email
        const info = await transporter.sendMail({
            from: `"${agent.name}" <${agent.email}>`,
            to: toEmail,
            subject: subject,
            text: bodyText,
            html: htmlContent
        });

        return {
            success: true,
            messageId: info.messageId,
            info: info
        };

    } catch (error) {
        console.error('Send email error:', error);
        throw error;
    }
};

module.exports = {
    sendEmail
};