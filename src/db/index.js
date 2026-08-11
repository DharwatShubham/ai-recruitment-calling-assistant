const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL Database via Supabase Pool');
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
