import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { usersRepository } from '../src/modules/users/users.repository';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const DEMO_PASSWORD = 'Password123!';

export interface DemoUserDefinition {
  roleSlug: string;
  roleId: string;
  roleName: string;
  email: string;
  fullName: string;
  studentId: string;
  phone: string;
  description: string;
}

export const DEMO_USERS: DemoUserDefinition[] = [
  {
    roleSlug: 'SUPER_ADMIN',
    roleId: '11111111-1111-1111-1111-111111111111',
    roleName: 'Super Admin',
    email: 'demo.superadmin@diu.edu.bd',
    fullName: 'Demo Super Admin',
    studentId: 'DEMO-SA-001',
    phone: '+8801700000001',
    description: 'Full system administration authority and access across all modules',
  },
  {
    roleSlug: 'TREASURER',
    roleId: '22222222-2222-2222-2222-222222222222',
    roleName: 'Treasurer',
    email: 'demo.treasurer@diu.edu.bd',
    fullName: 'Demo Treasurer',
    studentId: 'DEMO-TR-002',
    phone: '+8801700000002',
    description: 'Financial management, banking accounts, income, expenses, ledgers & vouchers',
  },
  {
    roleSlug: 'PRESIDENT',
    roleId: '33333333-3333-3333-3333-333333333333',
    roleName: 'President',
    email: 'demo.president@diu.edu.bd',
    fullName: 'Demo President',
    studentId: 'DEMO-PR-003',
    phone: '+8801700000003',
    description: 'Club executive approvals for budgets, expenditures, events, and reports',
  },
  {
    roleSlug: 'GENERAL_SECRETARY',
    roleId: '44444444-4444-4444-4444-444444444444',
    roleName: 'General Secretary',
    email: 'demo.generalsecretary@diu.edu.bd',
    fullName: 'Demo General Secretary',
    studentId: 'DEMO-GS-004',
    phone: '+8801700000004',
    description: 'Event operations, club meetings, committee tasks, and budget proposals',
  },
  {
    roleSlug: 'EVENT_MANAGER',
    roleId: '55555555-5555-5555-5555-555555555555',
    roleName: 'Event Manager',
    email: 'demo.eventmanager@diu.edu.bd',
    fullName: 'Demo Event Manager',
    studentId: 'DEMO-EM-005',
    phone: '+8801700000005',
    description: 'Event organization, venue planning, event budgets, tickets & participants',
  },
  {
    roleSlug: 'EXECUTIVE_MEMBER',
    roleId: '66666666-6666-6666-6666-666666666666',
    roleName: 'Executive Member',
    email: 'demo.executive@diu.edu.bd',
    fullName: 'Demo Executive Member',
    studentId: 'DEMO-EX-006',
    phone: '+8801700000006',
    description: 'Executive committee member, project execution, and reimbursement claims',
  },
  {
    roleSlug: 'AUDITOR',
    roleId: '77777777-7777-7777-7777-777777777777',
    roleName: 'Auditor',
    email: 'demo.auditor@diu.edu.bd',
    fullName: 'Demo Auditor',
    studentId: 'DEMO-AU-007',
    phone: '+8801700000007',
    description: 'Audit reviews, compliance checking, trial balances, and financial oversight',
  },
  {
    roleSlug: 'GENERAL_MEMBER',
    roleId: '88888888-8888-8888-8888-888888888888',
    roleName: 'General Member',
    email: 'demo.member@diu.edu.bd',
    fullName: 'Demo General Member',
    studentId: 'DEMO-GM-008',
    phone: '+8801700000008',
    description: 'Standard member directory access, payment history, events, and personal profile',
  },
];

async function seedDemoUsers() {
  console.log('====================================================');
  console.log('   SEEDING DEMO TEST USERS FOR ALL 8 ROLES          ');
  console.log('   DIU Investment Club ERP & Financial System       ');
  console.log('====================================================\n');

  const results: Array<{
    role: string;
    email: string;
    status: string;
    userId: string;
    verifiedLogin: boolean;
  }> = [];

  for (const def of DEMO_USERS) {
    console.log(`▶ Processing role: [${def.roleName}] (${def.roleSlug})...`);

    // 1. Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, status, full_name')
      .eq('email', def.email.toLowerCase().trim())
      .maybeSingle();

    let userId = existingProfile?.id;

    if (!userId) {
      // Create user via admin_create_user RPC
      const { data: createRes, error: createErr } = await supabase.rpc('admin_create_user', {
        p_email: def.email.toLowerCase().trim(),
        p_password: DEMO_PASSWORD,
        p_full_name: def.fullName,
        p_phone: def.phone,
        p_student_id: def.studentId,
        p_role_id: def.roleId,
        p_status: 'active',
      });

      if (createErr) {
        console.error(`  ❌ Error creating ${def.email}:`, createErr.message);
        continue;
      }

      userId = createRes?.id;
      console.log(`  ✓ Created user account: ${def.email} (ID: ${userId})`);
    } else {
      console.log(`  ℹ User already exists: ${def.email} (ID: ${userId})`);
    }

    if (!userId) {
      console.error(`  ❌ Failed to obtain user ID for ${def.email}`);
      continue;
    }

    // 2. Configure exact role assignment
    // First, assign the target role
    await supabase.rpc('assign_role_to_user', {
      p_user_id: userId,
      p_role_id: def.roleId,
    });

    // Remove any conflicting unwanted roles (e.g. default EXECUTIVE_MEMBER if target is different)
    const { data: userRecord } = await supabase.rpc('get_user_by_id', {
      p_user_id: userId,
    });

    if (userRecord && Array.isArray(userRecord.roles)) {
      for (const r of userRecord.roles) {
        if (r.id !== def.roleId) {
          console.log(`  ↪ Removing non-matching role ${r.slug} from ${def.email}...`);
          await supabase.rpc('remove_role_from_user', {
            p_user_id: userId,
            p_role_id: r.id,
          });
        }
      }
    }

    // Ensure profile status is active
    await supabase
      .from('profiles')
      .update({
        status: 'active',
        full_name: def.fullName,
        phone: def.phone,
        student_id: def.studentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // 3. Verify authentication login
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: def.email,
      password: DEMO_PASSWORD,
    });

    let verifiedLogin = false;
    if (authErr) {
      console.error(`  ⚠️ Supabase auth verification failed for ${def.email}:`, authErr.message);
    } else if (authData.session?.access_token) {
      verifiedLogin = true;
      console.log(`  ✓ Verified login successful! Access token issued.`);
    }

    // 4. Verify RBAC profile via backend repository
    const backendProfile = await usersRepository.findByEmail(def.email);
    const assignedRoles = backendProfile?.roles?.map((r) => r.slug) || [];
    console.log(`  ✓ Active RBAC roles in backend: [${assignedRoles.join(', ')}]`);

    results.push({
      role: def.roleName,
      email: def.email,
      status: 'ACTIVE',
      userId,
      verifiedLogin,
    });

    console.log('');
  }

  console.log('====================================================');
  console.log('         DEMO USER PROVISIONING SUMMARY             ');
  console.log('====================================================');
  console.table(
    results.map((r) => ({
      Role: r.role,
      Email: r.email,
      Password: DEMO_PASSWORD,
      'Login Verified': r.verifiedLogin ? '✅ YES' : '❌ NO',
    }))
  );

  return results;
}

if (require.main === module) {
  seedDemoUsers()
    .then(() => {
      console.log('All 8 demo users successfully provisioned & ready for login testing.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error seeding demo users:', err);
      process.exit(1);
    });
}
