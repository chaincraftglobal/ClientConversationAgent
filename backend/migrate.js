const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

async function runMigrations() {
    try {
        console.log('🔄 Starting migrations...');
        
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        
        console.log(`Found ${files.length} migration files`);
        
        for (const file of files) {
            console.log(`\n📄 Running: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await pool.query(sql);
            console.log(`✅ ${file} completed`);
        }
        
        console.log('\n🎉 All migrations completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
