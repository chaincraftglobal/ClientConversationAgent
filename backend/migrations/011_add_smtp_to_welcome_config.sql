-- Add SMTP configuration fields to welcome_email_config
ALTER TABLE welcome_email_config
ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255) DEFAULT 'smtp.hostinger.com',
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 465,
ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
ADD COLUMN IF NOT EXISTS smtp_password TEXT,
ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN welcome_email_config.smtp_host IS 'SMTP server host';
COMMENT ON COLUMN welcome_email_config.smtp_port IS 'SMTP server port';
COMMENT ON COLUMN welcome_email_config.smtp_user IS 'SMTP username/email';
COMMENT ON COLUMN welcome_email_config.smtp_password IS 'SMTP password';
COMMENT ON COLUMN welcome_email_config.smtp_secure IS 'Use SSL/TLS';