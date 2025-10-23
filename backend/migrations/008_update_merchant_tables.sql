-- Add new columns to merchant_accounts table
ALTER TABLE merchant_accounts 
ADD COLUMN IF NOT EXISTS reminder_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS selected_gateways TEXT[], -- Array of payment gateway names
ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS working_days VARCHAR(50)[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'],
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Add new columns to merchant_conversations for AI follow-up
ALTER TABLE merchant_conversations 
ADD COLUMN IF NOT EXISTS gateway_name VARCHAR(100), -- Which payment gateway (evirtualpay, fiserv, etc)
ADD COLUMN IF NOT EXISTS is_gateway_email BOOLEAN DEFAULT false, -- Is this from a payment gateway?
ADD COLUMN IF NOT EXISTS ai_followup_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_followup_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_email_from VARCHAR(50); -- 'you' or 'them'

-- Update merchant_reminders to support AI follow-ups
ALTER TABLE merchant_reminders 
ADD COLUMN IF NOT EXISTS reminder_email VARCHAR(255); -- Different email for reminders

-- Add comments
COMMENT ON COLUMN merchant_accounts.reminder_email IS 'Separate email for reminder notifications';
COMMENT ON COLUMN merchant_accounts.selected_gateways IS 'Array of payment gateway names to monitor (evirtualpay, fiserv, payu, razorpay, etc)';
COMMENT ON COLUMN merchant_accounts.working_hours_start IS 'Start of working hours';
COMMENT ON COLUMN merchant_accounts.working_hours_end IS 'End of working hours';
COMMENT ON COLUMN merchant_accounts.working_days IS 'Array of working days';
COMMENT ON COLUMN merchant_conversations.gateway_name IS 'Detected payment gateway name';
COMMENT ON COLUMN merchant_conversations.is_gateway_email IS 'True if email is from a payment gateway';
COMMENT ON COLUMN merchant_conversations.ai_followup_sent IS 'True if AI follow-up was sent to gateway';
COMMENT ON COLUMN merchant_conversations.last_email_from IS 'Track who sent last email: you or them';