import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectRoles() {
  // 1. Get all roles
  const { data: roles } = await supabase.from('roles').select('id, name, slug').order('slug');
  console.log('=== ROLES ===');
  roles?.forEach(r => console.log(`${r.slug}: ${r.id} (${r.name})`));

  // 2. Get all permissions
  const { data: allPerms } = await supabase.from('permissions').select('id, name, module').order('name');
  console.log(`\n=== ALL PERMISSIONS (${allPerms?.length}) ===`);
  const permMap = new Map<string, string>();
  allPerms?.forEach(p => {
    permMap.set(p.id, p.name);
  });

  // Check reminders permissions specifically
  const reminderPerms = allPerms?.filter(p => p.name.includes('reminder') || p.name.includes('operation') || p.module === 'reminders');
  console.log('Reminder/Operation related permissions:', reminderPerms);

  // 3. Inspect permissions for PRESIDENT, GENERAL_SECRETARY, EXECUTIVE_MEMBER
  const targetRoles = ['PRESIDENT', 'GENERAL_SECRETARY', 'EXECUTIVE_MEMBER'];
  for (const slug of targetRoles) {
    const role = roles?.find(r => r.slug === slug);
    if (!role) continue;

    const { data: rp } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id);

    const names = (rp || []).map(r => permMap.get(r.permission_id) || r.permission_id).sort();
    console.log(`\n=== [${slug}] Permissions (${names.length}) ===`);
    console.log(names.join(', '));
  }
}

inspectRoles();
