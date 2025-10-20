const nodemailer = require('nodemailer');
const Imap = require('imap');
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

// Test SMTP connection
const testSMTPConnection = async (req, res) => {
    try {
        const { email, password, provider, smtp_host, smtp_port } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Determine SMTP settings based on provider
        let smtpConfig = {};

        if (provider === 'gmail') {
            smtpConfig = {
                host: smtp_host || 'smtp.gmail.com',
                port: smtp_port || 587,
                secure: false,
                auth: { user: email, pass: password }
            };
        } else if (provider === 'outlook') {
            smtpConfig = {
                host: smtp_host || 'smtp.office365.com',
                port: smtp_port || 587,
                secure: false,
                auth: { user: email, pass: password }
            };
        } else if (provider === 'yahoo') {
            smtpConfig = {
                host: smtp_host || 'smtp.mail.yahoo.com',
                port: smtp_port || 587,
                secure: false,
                auth: { user: email, pass: password }
            };
        } else {
            smtpConfig = {
                host: smtp_host,
                port: smtp_port || 587,
                secure: smtp_port === 465,
                auth: { user: email, pass: password }
            };
        }

        const transporter = nodemailer.createTransport(smtpConfig);

        // Verify connection
        await transporter.verify();

        res.status(200).json({
            success: true,
            message: '✅ SMTP connection successful! Email sending is working.'
        });

    } catch (error) {
        console.error('SMTP test error:', error);
        res.status(400).json({
            success: false,
            message: `❌ SMTP connection failed: ${error.message}`
        });
    }
};

// Test IMAP connection
const testIMAPConnection = async (req, res) => {
    try {
        const { email, password, provider, imap_host, imap_port } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Determine IMAP settings based on provider
        let imapConfig = {};

        if (provider === 'gmail') {
            imapConfig = {
                user: email,
                password: password,
                host: imap_host || 'imap.gmail.com',
                port: imap_port || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            };
        } else if (provider === 'outlook') {
            imapConfig = {
                user: email,
                password: password,
                host: imap_host || 'outlook.office365.com',
                port: imap_port || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            };
        } else if (provider === 'yahoo') {
            imapConfig = {
                user: email,
                password: password,
                host: imap_host || 'imap.mail.yahoo.com',
                port: imap_port || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            };
        } else {
            imapConfig = {
                user: email,
                password: password,
                host: imap_host,
                port: imap_port || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            };
        }

        const imap = new Imap(imapConfig);

        return new Promise((resolve, reject) => {
            imap.once('ready', () => {
                imap.end();
                resolve(res.status(200).json({
                    success: true,
                    message: '✅ IMAP connection successful! Email receiving is working.'
                }));
            });

            imap.once('error', (err) => {
                reject(res.status(400).json({
                    success: false,
                    message: `❌ IMAP connection failed: ${err.message}`
                }));
            });

            imap.connect();
        });

    } catch (error) {
        console.error('IMAP test error:', error);
        res.status(400).json({
            success: false,
            message: `❌ IMAP connection failed: ${error.message}`
        });
    }
};

// Test both SMTP and IMAP
const testFullConnection = async (req, res) => {
    try {
        const { email, password, provider, smtp_host, smtp_port, imap_host, imap_port } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const results = {
            smtp: { success: false, message: '' },
            imap: { success: false, message: '' }
        };

        // Test SMTP
        try {
            let smtpConfig = {};

            if (provider === 'gmail') {
                smtpConfig = {
                    host: smtp_host || 'smtp.gmail.com',
                    port: smtp_port || 587,
                    secure: false,
                    auth: { user: email, pass: password }
                };
            } else if (provider === 'outlook') {
                smtpConfig = {
                    host: smtp_host || 'smtp.office365.com',
                    port: smtp_port || 587,
                    secure: false,
                    auth: { user: email, pass: password }
                };
            } else if (provider === 'yahoo') {
                smtpConfig = {
                    host: smtp_host || 'smtp.mail.yahoo.com',
                    port: smtp_port || 587,
                    secure: false,
                    auth: { user: email, pass: password }
                };
            } else {
                smtpConfig = {
                    host: smtp_host,
                    port: smtp_port || 587,
                    secure: smtp_port === 465,
                    auth: { user: email, pass: password }
                };
            }

            const transporter = nodemailer.createTransport(smtpConfig);
            await transporter.verify();
            results.smtp = { success: true, message: '✅ SMTP working' };
        } catch (error) {
            results.smtp = { success: false, message: `❌ SMTP failed: ${error.message}` };
        }

        // Test IMAP
        try {
            let imapConfig = {};

            if (provider === 'gmail') {
                imapConfig = {
                    user: email,
                    password: password,
                    host: imap_host || 'imap.gmail.com',
                    port: imap_port || 993,
                    tls: true,
                    tlsOptions: { rejectUnauthorized: false }
                };
            } else if (provider === 'outlook') {
                imapConfig = {
                    user: email,
                    password: password,
                    host: imap_host || 'outlook.office365.com',
                    port: imap_port || 993,
                    tls: true,
                    tlsOptions: { rejectUnauthorized: false }
                };
            } else if (provider === 'yahoo') {
                imapConfig = {
                    user: email,
                    password: password,
                    host: imap_host || 'imap.mail.yahoo.com',
                    port: imap_port || 993,
                    tls: true,
                    tlsOptions: { rejectUnauthorized: false }
                };
            } else {
                imapConfig = {
                    user: email,
                    password: password,
                    host: imap_host,
                    port: imap_port || 993,
                    tls: true,
                    tlsOptions: { rejectUnauthorized: false }
                };
            }

            const imap = new Imap(imapConfig);

            await new Promise((resolve, reject) => {
                imap.once('ready', () => {
                    imap.end();
                    resolve();
                });

                imap.once('error', (err) => {
                    reject(err);
                });

                imap.connect();
            });

            results.imap = { success: true, message: '✅ IMAP working' };
        } catch (error) {
            results.imap = { success: false, message: `❌ IMAP failed: ${error.message}` };
        }

        // Overall status
        const allSuccess = results.smtp.success && results.imap.success;

        res.status(allSuccess ? 200 : 400).json({
            success: allSuccess,
            message: allSuccess ? '✅ All connections successful!' : '⚠️ Some connections failed',
            results: results
        });

    } catch (error) {
        console.error('Full test error:', error);
        res.status(500).json({
            success: false,
            message: `❌ Test failed: ${error.message}`
        });
    }
};

module.exports = {
    testSMTPConnection,
    testIMAPConnection,
    testFullConnection
};