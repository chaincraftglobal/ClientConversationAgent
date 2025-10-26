-- Add thank you email tracking to payment transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS thank_you_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS thank_you_email_sent_at TIMESTAMP;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_email_sent ON payment_transactions(thank_you_email_sent);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);

-- Add comments
COMMENT ON COLUMN payment_transactions.customer_email IS 'Customer email address for thank you email';
COMMENT ON COLUMN payment_transactions.customer_name IS 'Customer name for personalization';
COMMENT ON COLUMN payment_transactions.thank_you_email_sent IS 'Whether thank you email was sent';
COMMENT ON COLUMN payment_transactions.thank_you_email_sent_at IS 'When thank you email was sent';