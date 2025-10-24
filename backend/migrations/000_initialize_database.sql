-- ==========================================
-- COMPLETE DATABASE INITIALIZATION
-- ==========================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- 3. Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_password_encrypted TEXT NOT NULL,
    smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
    smtp_port INTEGER DEFAULT 587,
    imap_host VARCHAR(255) DEFAULT 'imap.gmail.com',
    imap_port INTEGER DEFAULT 993,
    status VARCHAR(50) DEFAULT 'active',
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 4. Client Agent Assignments Table
CREATE TABLE IF NOT EXISTS client_agent_assignments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    auto_reply_enabled BOOLEAN DEFAULT TRUE,
    reply_delay_hours INTEGER DEFAULT 0,
    working_hours_start TIME,
    working_hours_end TIME,
    working_days VARCHAR(50)[],
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON client_agent_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_agent ON client_agent_assignments(agent_id);

COMMENT ON TABLE users IS 'System users with authentication';
COMMENT ON TABLE clients IS 'Client contact information';
COMMENT ON TABLE agents IS 'Email agents for client communication';
COMMENT ON TABLE client_agent_assignments IS 'Client-Agent relationships with auto-reply settings';