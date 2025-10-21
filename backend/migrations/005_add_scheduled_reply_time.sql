-- Add scheduled reply time and status to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS scheduled_reply_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS reply_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS urgency_level INTEGER,
ADD COLUMN IF NOT EXISTS emotional_tone VARCHAR(50);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_reply ON messages(scheduled_reply_time);
CREATE INDEX IF NOT EXISTS idx_messages_reply_status ON messages(reply_status);

COMMENT ON COLUMN messages.scheduled_reply_time IS 'When the agent plans to send the reply';
COMMENT ON COLUMN messages.reply_status IS 'Status: analyzing, scheduled, sending, sent';
COMMENT ON COLUMN messages.urgency_level IS 'Message urgency from 1-10';
COMMENT ON COLUMN messages.emotional_tone IS 'Client emotional tone detected';

-- Update existing messages to have default status
UPDATE messages SET reply_status = 'sent' WHERE sender_type = 'agent' AND reply_status IS NULL;
UPDATE messages SET reply_status = 'received' WHERE sender_type = 'client' AND reply_status IS NULL;