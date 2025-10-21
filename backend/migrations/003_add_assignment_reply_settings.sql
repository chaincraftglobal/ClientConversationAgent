-- Add reply behavior settings to agent_client_assignments table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='agent_client_assignments' AND column_name='ai_instructions') THEN
        ALTER TABLE agent_client_assignments ADD COLUMN ai_instructions TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='agent_client_assignments' AND column_name='reply_tone_preference') THEN
        ALTER TABLE agent_client_assignments ADD COLUMN reply_tone_preference VARCHAR(50) DEFAULT 'professional';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='agent_client_assignments' AND column_name='enable_smart_timing') THEN
        ALTER TABLE agent_client_assignments ADD COLUMN enable_smart_timing BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='agent_client_assignments' AND column_name='min_reply_delay_minutes') THEN
        ALTER TABLE agent_client_assignments ADD COLUMN min_reply_delay_minutes INTEGER DEFAULT 15;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='agent_client_assignments' AND column_name='max_reply_delay_minutes') THEN
        ALTER TABLE agent_client_assignments ADD COLUMN max_reply_delay_minutes INTEGER DEFAULT 90;
    END IF;
END $$;

COMMENT ON COLUMN agent_client_assignments.ai_instructions IS 'Instructions for AI on how to handle this client';
COMMENT ON COLUMN agent_client_assignments.reply_tone_preference IS 'Preferred tone: professional, friendly, casual, empathetic';
COMMENT ON COLUMN agent_client_assignments.enable_smart_timing IS 'Use AI to determine optimal reply timing';
COMMENT ON COLUMN agent_client_assignments.min_reply_delay_minutes IS 'Minimum delay before replying (for smart timing)';
COMMENT ON COLUMN agent_client_assignments.max_reply_delay_minutes IS 'Maximum delay before replying (for smart timing)';