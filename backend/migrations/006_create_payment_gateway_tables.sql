-- Gateway credentials table
CREATE TABLE IF NOT EXISTS payment_gateway_credentials (
    id SERIAL PRIMARY KEY,
    gateway_name VARCHAR(100) DEFAULT 'eVirtualPay',
    login_url TEXT NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check schedule settings
CREATE TABLE IF NOT EXISTS payment_gateway_schedule (
    id SERIAL PRIMARY KEY,
    check_interval_hours INTEGER NOT NULL DEFAULT 3,
    admin_email VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE,
    transaction_date TIMESTAMP,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50), -- 'success', 'failed', 'pending'
    payment_method VARCHAR(100),
    transaction_details TEXT, -- JSON string with all details
    screenshot_path TEXT,
    thank_you_email_sent BOOLEAN DEFAULT false,
    thank_you_email_sent_at TIMESTAMP,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screenshots table
CREATE TABLE IF NOT EXISTS payment_screenshots (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES payment_transactions(id) ON DELETE CASCADE,
    screenshot_type VARCHAR(50), -- 'transaction_list', 'transaction_details', 'failed_summary'
    file_path TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check history/logs
CREATE TABLE IF NOT EXISTS payment_check_logs (
    id SERIAL PRIMARY KEY,
    check_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_completed_at TIMESTAMP,
    total_transactions_found INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    new_transactions_count INTEGER DEFAULT 0,
    status VARCHAR(50), -- 'success', 'failed', 'partial'
    error_message TEXT,
    screenshot_path TEXT,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_email ON payment_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_check_logs_date ON payment_check_logs(check_started_at);

-- Comments
COMMENT ON TABLE payment_gateway_credentials IS 'Stores login credentials for payment gateway';
COMMENT ON TABLE payment_gateway_schedule IS 'Configuration for automated checks';
COMMENT ON TABLE payment_transactions IS 'All transactions scraped from payment gateway';
COMMENT ON TABLE payment_screenshots IS 'Screenshots of transactions';
COMMENT ON TABLE payment_check_logs IS 'History of automated checks';

-- Insert default schedule settings
INSERT INTO payment_gateway_schedule (check_interval_hours, admin_email, is_enabled)
VALUES (3, 'admin@example.com', false)
ON CONFLICT DO NOTHING;