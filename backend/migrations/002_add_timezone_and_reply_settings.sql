-- Add timezone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clients' AND column_name='timezone') THEN
        ALTER TABLE clients ADD COLUMN timezone VARCHAR(100) DEFAULT 'UTC';
    END IF;
END $$;

-- Add working hours columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clients' AND column_name='working_hours_start') THEN
        ALTER TABLE clients ADD COLUMN working_hours_start TIME DEFAULT '09:00:00';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clients' AND column_name='working_hours_end') THEN
        ALTER TABLE clients ADD COLUMN working_hours_end TIME DEFAULT '18:00:00';
    END IF;
END $$;

-- Update existing clients to have default timezone
UPDATE clients SET timezone = 'UTC' WHERE timezone IS NULL OR timezone = '';