import fs from 'fs';
import path from 'path';
import { queryDatabase } from '../src/database/db';
import { isSupabaseConfigured, supabaseClient } from '../src/config/supabase';

async function runPerformanceIndexes() {
  console.log('====================================================');
  console.log('⚡ Applying Phase 11 Database Performance Indexes');
  console.log('====================================================\n');

  const sqlPath = path.resolve(__dirname, '../src/db/phase11_performance_indexes.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  let appliedCount = 0;
  let skippedCount = 0;

  for (const stmt of statements) {
    // Skip empty lines or pure comments
    if (!stmt || stmt.startsWith('--')) continue;

    try {
      await queryDatabase(stmt + ';');
      appliedCount++;
      const match = stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/i);
      const idxName = match ? match[1] : 'Index / Security Stmt';
      console.log(`  ✅ Applied: ${idxName}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Statement notice (${err.message?.slice(0, 80)}): ${stmt.slice(0, 60)}...`);
      skippedCount++;
    }
  }

  console.log(`\n====================================================`);
  console.log(`📊 Index Migration Summary: ${appliedCount} statements executed.`);
  console.log(`====================================================`);
}

runPerformanceIndexes().catch((err) => {
  console.error('Migration error:', err);
});
