-- ============================================
-- AUTO THANK YOU EMAIL MANAGER - DATABASE
-- ============================================

-- Table: welcome_email_config
-- Stores configuration for the welcome email system
CREATE TABLE IF NOT EXISTS welcome_email_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT true,
    schedule_interval_hours INTEGER DEFAULT 6,
    email_template TEXT,
    subject_template VARCHAR(255) DEFAULT '✅ Payment Received - Thank You!',
    from_email VARCHAR(255) DEFAULT 'sales@lacewingtech.in',
    from_name VARCHAR(255) DEFAULT 'Lacewing Technologies',
    cc_email VARCHAR(255) DEFAULT 'lacewinginfo@gmail.com',
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: welcome_email_logs
-- Tracks every welcome email sent
CREATE TABLE IF NOT EXISTS welcome_email_logs (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255),
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    amount VARCHAR(50),
    email_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_welcome_logs_transaction ON welcome_email_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_welcome_logs_status ON welcome_email_logs(email_status);
CREATE INDEX IF NOT EXISTS idx_welcome_logs_created ON welcome_email_logs(created_at DESC);

-- Insert default configuration
INSERT INTO welcome_email_config (
    is_enabled, 
    schedule_interval_hours, 
    email_template,
    subject_template,
    from_email,
    from_name,
    cc_email
) VALUES (
    true,
    6,
    'default',
    '✅ Payment Received - Thank You!',
    'sales@lacewingtech.in',
    'Lacewing Technologies',
    'lacewinginfo@gmail.com'
) ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE welcome_email_config IS 'Configuration for auto thank you email system';
COMMENT ON TABLE welcome_email_logs IS 'Log of all welcome emails sent to customers';
COMMENT ON COLUMN welcome_email_config.is_enabled IS 'Enable/disable the entire system';
COMMENT ON COLUMN welcome_email_config.schedule_interval_hours IS 'How often to check for new transactions (in hours)';
COMMENT ON COLUMN welcome_email_logs.email_status IS 'Status: pending, sent, failed';