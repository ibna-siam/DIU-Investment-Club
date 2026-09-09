require('dotenv').config();
const { queryDatabase } = require('../dist/database/db');

async function testPg() {
  try {
    const res = await queryDatabase('SELECT tablename FROM pg_tables WHERE schemaname = $1', ['storage']);
    console.log('Storage tables:', res ? res.rows : 'null');

    // Check buckets in storage.buckets
    const bRes = await queryDatabase('SELECT * FROM storage.buckets');
    console.log('Existing storage buckets in DB:', bRes ? bRes.rows : 'null');
  } catch (err) {
    console.error('PG Error:', err.message);
  }
}

testPg();
