-- Merchant email accounts table
CREATE TABLE IF NOT EXISTS merchant_accounts (
    id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_password_encrypted TEXT NOT NULL,
    imap_host VARCHAR(255) DEFAULT 'imap.gmail.com',
    imap_port INTEGER DEFAULT 993,
    smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
    smtp_port INTEGER DEFAULT 587,
    notification_email VARCHAR(255) NOT NULL,  -- Your main email to receive notifications
    status VARCHAR(50) DEFAULT 'active',
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merchant conversations tracking
CREATE TABLE IF NOT EXISTS merchant_conversations (
    id SERIAL PRIMARY KEY,
    merchant_account_id INTEGER REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    message_id VARCHAR(500) UNIQUE NOT NULL,
    thread_id VARCHAR(500),
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    direction VARCHAR(50), -- 'inbound' (from payment gateway) or 'outbound' (your reply)
    email_received_at TIMESTAMP,
    email_sent_at TIMESTAMP,
    reply_required BOOLEAN DEFAULT false,
    reply_sent BOOLEAN DEFAULT false,
    reply_sent_at TIMESTAMP,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_sent BOOLEAN DEFAULT false,
    follow_up_sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'replied', 'awaiting_response', 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reminder queue
CREATE TABLE IF NOT EXISTS merchant_reminders (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES merchant_conversations(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'reply_reminder' (6hrs) or 'follow_up' (18hrs)
    scheduled_for TIMESTAMP NOT NULL,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    snoozed_until TIMESTAMP,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_merchant_accounts_email ON merchant_accounts(email);
CREATE INDEX IF NOT EXISTS idx_merchant_conversations_message_id ON merchant_conversations(message_id);
CREATE INDEX IF NOT EXISTS idx_merchant_conversations_status ON merchant_conversations(status);
CREATE INDEX IF NOT EXISTS idx_merchant_conversations_merchant_id ON merchant_conversations(merchant_account_id);
CREATE INDEX IF NOT EXISTS idx_merchant_reminders_scheduled ON merchant_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_merchant_reminders_sent ON merchant_reminders(sent);

-- Comments
COMMENT ON TABLE merchant_accounts IS 'Merchant email accounts for payment gateway applications';
COMMENT ON TABLE merchant_conversations IS 'All email conversations for merchant accounts';
COMMENT ON TABLE merchant_reminders IS 'Queue for sending reminders';

COMMENT ON COLUMN merchant_conversations.direction IS 'inbound = from payment gateway, outbound = your reply';
COMMENT ON COLUMN merchant_conversations.reply_required IS 'Does this email need a reply from you?';
COMMENT ON COLUMN merchant_conversations.follow_up_required IS 'Do you need to follow up with them?';
COMMENT ON COLUMN merchant_reminders.reminder_type IS 'reply_reminder = remind you to reply (6hrs), follow_up = auto follow up (18hrs)';