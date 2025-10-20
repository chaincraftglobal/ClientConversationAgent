const cron = require('node-cron');
const pool = require('../config/database');
const { processNewEmails } = require('../utils/emailDedup');

// Cron job: every 3 minutes
cron.schedule('*/3 * * * *', async () => {
  console.log('\n⏰ Cron job triggered - polling emails');
  console.log('🔄 Starting email polling cycle...');
  
  try {
    // Try to get active agents - handle both cases (with and without "active" column)
    let result;
    try {
      result = await pool.query('SELECT id FROM agents WHERE active = true LIMIT 10');
    } catch (error) {
      if (error.code === '42703') {
        // Column "active" doesn't exist, just get all agents
        console.log('ℹ️  Column "active" not found, fetching all agents');
        result = await pool.query('SELECT id FROM agents LIMIT 10');
      } else {
        throw error;
      }
    }
    
    console.log(`📋 Polling ${result.rows.length} agent(s)`);
    
    for (const agent of result.rows) {
      await processNewEmails(agent.id);
    }
    
    console.log('✅ Polling cycle complete\n');
  } catch (error) {
    console.error('Cron job error:', error.message);
  }
});

module.exports = cron;
