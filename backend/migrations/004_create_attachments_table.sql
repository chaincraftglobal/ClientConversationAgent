-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES agent_client_assignments(id) ON DELETE CASCADE,
    original_filename VARCHAR(500) NOT NULL,
    saved_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_assignment_id ON attachments(assignment_id);

COMMENT ON TABLE attachments IS 'Stores metadata about email attachments';
COMMENT ON COLUMN attachments.original_filename IS 'Original name of the file from email';
COMMENT ON COLUMN attachments.saved_filename IS 'Unique name saved on server';
COMMENT ON COLUMN attachments.file_path IS 'Full path where file is stored';