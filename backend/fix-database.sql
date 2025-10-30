-- Fix missing columns
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS email_provider VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- Fix missing table
CREATE TABLE IF NOT EXISTS agent_client_assignments (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES ai_agents(id),
    client_id INTEGER,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);