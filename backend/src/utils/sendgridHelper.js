const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid initialized');
} else {
    console.warn('⚠️ SendGrid API key not found - emails will fail');
}

/**
 * Send email using SendGrid API
 */
async function sendEmail({ to, cc, from, subject, html }) {
    try {
        const msg = {
            to: to,
            from: from || {
                email: process.env.SMTP_USER || 'support@lacewingtech.in',
                name: 'Lacewing Technologies'
            },
            subject: subject,
            html: html
        };

        // Add CC if provided
        if (cc) {
            msg.cc = cc;
        }

        const response = await sgMail.send(msg);
        
        console.log(`✅ Email sent via SendGrid to ${to}`);
        return { success: true, messageId: response[0].headers['x-message-id'] };
        
    } catch (error) {
        console.error('❌ SendGrid error:', error.response?.body || error.message);
        throw error;
    }
}

module.exports = {
    sendEmail
};