import path from 'path';
import dotenv from 'dotenv';
import { getDbAdmin } from '../src/config/supabase';
import { store } from '../src/database/db';
import { invalidateAuthCache } from '../src/middleware/auth.middleware';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEMO_EMAILS = [
  'demo.superadmin@diu.edu.bd',
  'demo.treasurer@diu.edu.bd',
  'demo.president@diu.edu.bd',
  'demo.generalsecretary@diu.edu.bd',
  'demo.eventmanager@diu.edu.bd',
  'demo.executive@diu.edu.bd',
  'demo.auditor@diu.edu.bd',
  'demo.member@diu.edu.bd',
  'test_probe@diu.edu.bd',
];

async function cleanupDemoUsers() {
  console.log('====================================================');
  console.log('       CLEANING UP DEMO TEST USERS                  ');
  console.log('====================================================\n');

  const supabase = getDbAdmin();

  // Find all demo profiles (by explicit list or demo. prefix)
  const { data: allProfiles, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  if (fetchErr) {
    console.error('❌ Error fetching profiles:', fetchErr.message);
    process.exit(1);
  }

  const demoProfiles = (allProfiles || []).filter(p => {
    const email = (p.email || '').toLowerCase().trim();
    return DEMO_EMAILS.includes(email) || email.startsWith('demo.') || email.includes('test_probe');
  });

  console.log(`Found ${demoProfiles.length} demo profiles to purge:`);
  demoProfiles.forEach(p => console.log(` - [${p.id}] ${p.email} (${p.full_name})`));

  for (const profile of demoProfiles) {
    const email = profile.email;
    const userId = profile.id;
    console.log(`\n▶ Purging demo user: ${email} [${userId}]...`);

    // 1. Delete refresh tokens or sessions
    try {
      await supabase.from('refresh_tokens').delete().eq('user_id', userId);
    } catch (e) {}

    // 2. Delete user_roles
    const { error: rErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (rErr) console.warn(`  ⚠️ user_roles delete notice:`, rErr.message);
    else console.log(`  ✓ Cleared user_roles`);

    // 3. Delete user_permissions
    const { error: pErr } = await supabase.from('user_permissions').delete().eq('user_id', userId);
    if (pErr) console.warn(`  ⚠️ user_permissions delete notice:`, pErr.message);
    else console.log(`  ✓ Cleared user_permissions`);

    // 4. Delete notifications targeting this user
    try {
      await supabase.from('notifications').delete().eq('user_id', userId);
    } catch (e) {}

    // 5. Delete profile record
    const { error: delErr } = await supabase.from('profiles').delete().eq('id', userId);
    if (delErr) {
      console.error(`  ❌ Failed to delete profile for ${email}:`, delErr.message);
    } else {
      console.log(`  ✓ Successfully deleted profile for: ${email}`);
    }

    // 6. Clear in-memory store
    store.profiles.delete(userId);
    invalidateAuthCache(userId);
  }

  console.log('\n====================================================');
  console.log('✓ Demo test user cleanup finished.');
  console.log('====================================================');

  // Verify remaining profiles
  const { data: remaining } = await supabase.from('profiles').select('id, email, full_name');
  console.log(`Remaining profiles count: ${remaining?.length}`);
  remaining?.forEach(p => console.log(`- ${p.email} (${p.full_name})`));
}

cleanupDemoUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error cleaning up demo users:', err);
    process.exit(1);
  });
