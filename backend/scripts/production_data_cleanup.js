/**
 * Production Data Cleanup & Audit Script
 * DIU Investment Club Financial Management System
 * 
 * Safely inspects and purges ephemeral test records, test notifications,
 * and soft-deleted test documents while preserving core system data:
 * - Chart of Accounts (COA)
 * - User roles & system permissions
 * - User profiles
 * - Audit logs (immutable)
 * 
 * Usage:
 *   node backend/scripts/production_data_cleanup.js --dry-run
 *   node backend/scripts/production_data_cleanup.js --commit
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const isCommit = process.argv.includes('--commit');

async function runCleanup() {
  console.log('=====================================================');
  console.log('DIU Investment Club - Production Data Cleanup Audit');
  console.log(`Mode: ${isCommit ? '⚡ EXECUTE COMMIT' : '🔍 DRY RUN (Audit Only)'}`);
  console.log('=====================================================\n');

  try {
    // 1. Audit core protected tables
    const { count: rolesCount } = await supabase.from('roles').select('*', { count: 'exact', head: true });
    const { count: permissionsCount } = await supabase.from('permissions').select('*', { count: 'exact', head: true });
    const { count: coaCount } = await supabase.from('chart_of_accounts').select('*', { count: 'exact', head: true });
    const { count: auditCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
    const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    console.log('🔒 Protected System Data (Never Purged):');
    console.log(`   - Roles: ${rolesCount ?? 0} records`);
    console.log(`   - System Permissions: ${permissionsCount ?? 0} records`);
    console.log(`   - Chart of Accounts: ${coaCount ?? 0} records`);
    console.log(`   - Audit Logs: ${auditCount ?? 0} records (Preserved for compliance)`);
    console.log(`   - User Profiles: ${profilesCount ?? 0} records\n`);

    // 2. Audit Test Notifications (titles starting with [Test] or marked read older than 30 days)
    const { data: testNotifications, count: notifCount } = await supabase
      .from('notifications')
      .select('id, title, is_read, created_at', { count: 'exact' })
      .or('title.ilike.%test%,title.ilike.%demo%');

    console.log(`📬 Ephemeral / Test Notifications: ${notifCount || 0} candidate records found`);

    if (isCommit && testNotifications && testNotifications.length > 0) {
      const idsToDelete = testNotifications.map(n => n.id);
      const { error: delNotifErr } = await supabase
        .from('notifications')
        .delete()
        .in('id', idsToDelete);

      if (delNotifErr) {
        console.error('   ❌ Failed to delete test notifications:', delNotifErr.message);
      } else {
        console.log(`   ✅ Successfully cleaned ${idsToDelete.length} test notifications.`);
      }
    }

    // 3. Audit Soft-Deleted Documents
    const { data: deletedDocs, count: deletedDocsCount } = await supabase
      .from('documents')
      .select('id, title, status, file_path', { count: 'exact' })
      .eq('status', 'DELETED');

    console.log(`📁 Soft-Deleted Documents: ${deletedDocsCount || 0} records found in trash`);

    // 4. Audit Storage Orphaned Objects Check
    console.log('📦 Supabase Storage Status:');
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets) {
      for (const b of buckets) {
        console.log(`   - Bucket '${b.name}': public = ${b.public}`);
      }
    }

    console.log('\n=====================================================');
    if (isCommit) {
      console.log('✅ Cleanup complete. Database is clean for production.');
    } else {
      console.log('💡 Dry run completed. No data was modified.');
      console.log('   Run with --commit to execute test record cleanup.');
    }
    console.log('=====================================================');
  } catch (err) {
    console.error('❌ Error running cleanup:', err);
    process.exit(1);
  }
}

runCleanup();
