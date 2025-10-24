const { Pool } = require('pg');

// Database configuration
const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

// If DATABASE_URL is not available (local development), use individual variables
if (!process.env.DATABASE_URL) {
  config.host = process.env.DB_HOST || 'localhost';
  config.port = process.env.DB_PORT || 5432;
  config.database = process.env.DB_NAME || 'client_conversation_db';
  config.user = process.env.DB_USER || 'dipakbhosale';
  config.password = process.env.DB_PASSWORD || '';
  delete config.connectionString;
}

const pool = new Pool(config);

// Connection event handlers
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection test failed:', err);
  } else {
    console.log('✅ Database connection test successful:', res.rows[0].now);
  }
});

module.exports = pool;