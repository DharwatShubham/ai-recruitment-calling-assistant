const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function runMigrations() {
    try {
        console.log('Starting Database Migration...');
        const sqlPath = path.join(__dirname, '../migrations/schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        console.log('Successfully executed migrations and created all tables!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runMigrations();
