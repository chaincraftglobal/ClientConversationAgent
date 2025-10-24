-- Add scheduled reply time and status to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS scheduled_reply_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS reply_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS urgency_level INTEGER,
ADD COLUMN IF NOT EXISTS emotional_tone VARCHAR(50);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_reply ON emails(scheduled_reply_time);
CREATE INDEX IF NOT EXISTS idx_emails_reply_status ON emails(reply_status);

COMMENT ON COLUMN emails.scheduled_reply_time IS 'When the agent plans to send the reply';
COMMENT ON COLUMN emails.reply_status IS 'Status: analyzing, scheduled, sending, sent';
COMMENT ON COLUMN emails.urgency_level IS 'Message urgency from 1-10';
COMMENT ON COLUMN emails.emotional_tone IS 'Client emotional tone detected';

-- Update existing emails to have default status
UPDATE emails SET reply_status = 'sent' WHERE response_sent = true AND reply_status IS NULL;
UPDATE emails SET reply_status = 'received' WHERE response_sent = false AND reply_status IS NULL;