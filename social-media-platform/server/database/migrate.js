const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigrations(direction = 'up') {
  const client = await pool.connect();
  try {
    const migrationFile = path.join(__dirname, '../../database/migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Database migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

const direction = process.argv[2] || 'up';
runMigrations(direction).then(() => process.exit(0));
