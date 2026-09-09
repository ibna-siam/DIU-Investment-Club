import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ROLE_IDS = {
  SUPER_ADMIN: '11111111-1111-1111-1111-111111111111',
  TREASURER: '22222222-2222-2222-2222-222222222222',
  PRESIDENT: '33333333-3333-3333-3333-333333333333',
  GENERAL_SECRETARY: '44444444-4444-4444-4444-444444444444',
  EVENT_MANAGER: '55555555-5555-5555-5555-555555555555',
  EXECUTIVE_MEMBER: '66666666-6666-6666-6666-666666666666',
  AUDITOR: '77777777-7777-7777-7777-777777777777',
  GENERAL_MEMBER: '88888888-8888-8888-8888-888888888888',
};

async function syncRolePermissions() {
  console.log('====================================================');
  console.log('  SYNCING RBAC ROLE PERMISSIONS IN SUPABASE POSTGRES ');
  console.log('====================================================\n');

  // 1. Fetch all permissions
  const { data: allPerms, error: pErr } = await supabase
    .from('permissions')
    .select('id, module, action, name');

  if (pErr || !allPerms) {
    console.error('Failed to fetch permissions:', pErr?.message);
    process.exit(1);
  }

  console.log(`✓ Loaded ${allPerms.length} total permissions from database.`);

  const permById = new Map(allPerms.map(p => [p.id, p]));
  const permBySlug = new Map(allPerms.map(p => [`${p.module}.${p.action}`, p]));
  const permByName = new Map(allPerms.map(p => [p.name.toLowerCase().trim(), p]));

  // Helper to find permission
  const findPerm = (slugOrName: string) => {
    return permBySlug.get(slugOrName) || permByName.get(slugOrName.toLowerCase().trim());
  };

  // 2. Fetch existing permissions for PRESIDENT, GENERAL_SECRETARY, EXECUTIVE_MEMBER
  for (const roleKey of ['PRESIDENT', 'GENERAL_SECRETARY', 'EXECUTIVE_MEMBER'] as const) {
    const roleId = ROLE_IDS[roleKey];
    const { data: existingRps } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    const existingPermIds = new Set((existingRps || []).map(r => r.permission_id));
    const existingPermObjects = Array.from(existingPermIds).map(id => permById.get(id)!).filter(Boolean);

    console.log(`\n====================================================`);
    console.log(`Role: ${roleKey} (${roleId})`);
    console.log(`Current assigned permissions count: ${existingPermObjects.length}`);

    let updatedPermObjects = [...existingPermObjects];

    if (roleKey === 'PRESIDENT') {
      // PRESIDENT ACCESS REQUIREMENTS:
      // ACCOUNTING SECTION: Show ONLY Accounting Dashboard (`accounting.read`) and Vouchers (`vouchers.read`, `vouchers.approve`)
      // Strip: chart_of_accounts, journal_entries, general_ledger, subsidiary_ledger, trial_balance, financial_years
      // MEMBERS SECTION: Show ONLY Member Directory (`members.read`)
      // Strip: membership_types, dues, member_payments, receipts, member_financials, archive members, etc.
      // AUTOMATION & WORK: Show ONLY Smart Reminders (`reminders.read`, `reminders.manage`)
      // Strip: automation.*, recurring_operations.*, month_end.*, accounting.manage
      // COMPLETELY HIDE: Audit & Compliance, Integrations & API
      // Strip: audit.*, reconciliation.*, internal_controls.*, compliance.*, exceptions.*, risk_flags.*,
      //        integrations.*, webhooks.*, communication_templates.*

      const modulesToExcludeCompletely = [
        'audit',
        'reconciliation',
        'internal_controls',
        'compliance',
        'exceptions',
        'risk_flags',
        'integrations',
        'webhooks',
        'communication_templates',
        'automation',
        'recurring_operations',
        'month_end',
        'chart_of_accounts',
        'journal_entries',
        'general_ledger',
        'subsidiary_ledger',
        'trial_balance',
        'financial_years',
        'membership_types',
        'dues',
        'member_payments',
        'receipts',
        'member_financials',
      ];

      updatedPermObjects = updatedPermObjects.filter(p => {
        // Exclude listed modules
        if (modulesToExcludeCompletely.includes(p.module)) {
          return false;
        }

        // For accounting module: keep only read/approve vouchers/accounting, remove manage (month-end)
        if (p.module === 'accounting' && (p.action === 'manage' || p.action === 'admin')) {
          return false;
        }

        // For members module: keep ONLY members.read! Remove create, update, delete, archive, manage, approve, etc.
        if (p.module === 'members' && p.action !== 'read') {
          return false;
        }
        if (p.module === 'memberships') {
          return false;
        }

        return true;
      });

      // Ensure Smart Reminders permissions are present
      const rRead = findPerm('reminders.read');
      const rManage = findPerm('reminders.manage');
      if (rRead && !updatedPermObjects.some(p => p.id === rRead.id)) updatedPermObjects.push(rRead);
      if (rManage && !updatedPermObjects.some(p => p.id === rManage.id)) updatedPermObjects.push(rManage);

      // Ensure Accounting read & Vouchers read are present
      const accRead = findPerm('accounting.read');
      const vRead = findPerm('vouchers.read');
      const vApprove = findPerm('vouchers.approve');
      const mRead = findPerm('members.read');
      if (accRead && !updatedPermObjects.some(p => p.id === accRead.id)) updatedPermObjects.push(accRead);
      if (vRead && !updatedPermObjects.some(p => p.id === vRead.id)) updatedPermObjects.push(vRead);
      if (vApprove && !updatedPermObjects.some(p => p.id === vApprove.id)) updatedPermObjects.push(vApprove);
      if (mRead && !updatedPermObjects.some(p => p.id === mRead.id)) updatedPermObjects.push(mRead);
    }

    if (roleKey === 'GENERAL_SECRETARY') {
      // GENERAL_SECRETARY REQUIREMENTS:
      // AUTOMATION & WORK SECTION: Show ONLY Smart Reminders
      // Grant required permission to access and use Smart Reminders: reminders.read, reminders.manage
      // Hide other Automation pages: strip automation.*, recurring_operations.*, month_end.*
      updatedPermObjects = updatedPermObjects.filter(p => {
        if (p.module === 'automation' || p.module === 'recurring_operations' || p.module === 'month_end') {
          return false;
        }
        if (p.module === 'accounting' && p.action === 'manage') {
          return false;
        }
        return true;
      });

      // Ensure Smart Reminders permissions are present
      const rRead = findPerm('reminders.read');
      const rManage = findPerm('reminders.manage');
      if (rRead && !updatedPermObjects.some(p => p.id === rRead.id)) updatedPermObjects.push(rRead);
      if (rManage && !updatedPermObjects.some(p => p.id === rManage.id)) updatedPermObjects.push(rManage);
    }

    if (roleKey === 'EXECUTIVE_MEMBER') {
      // EXECUTIVE_MEMBER REQUIREMENTS:
      // Grant Smart Reminders permission according to the existing RBAC system (reminders.read, reminders.manage)
      // Show Smart Reminders only if user has required permission
      // Do not expose other restricted Automation pages
      updatedPermObjects = updatedPermObjects.filter(p => {
        if (p.module === 'automation' || p.module === 'recurring_operations' || p.module === 'month_end') {
          return false;
        }
        return true;
      });

      const rRead = findPerm('reminders.read');
      const rManage = findPerm('reminders.manage');
      if (rRead && !updatedPermObjects.some(p => p.id === rRead.id)) updatedPermObjects.push(rRead);
      if (rManage && !updatedPermObjects.some(p => p.id === rManage.id)) updatedPermObjects.push(rManage);
    }

    console.log(`New target permissions count for ${roleKey}: ${updatedPermObjects.length}`);

    // Update in Supabase role_permissions
    // First delete existing role permissions
    const { error: delErr } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (delErr) {
      console.error(`❌ Error clearing role_permissions for ${roleKey}:`, delErr.message);
      continue;
    }

    // Insert new role permissions
    const newRows = updatedPermObjects.map(p => ({
      role_id: roleId,
      permission_id: p.id,
    }));

    const { error: insErr } = await supabase
      .from('role_permissions')
      .insert(newRows);

    if (insErr) {
      console.error(`❌ Error inserting role_permissions for ${roleKey}:`, insErr.message);
      continue;
    }

    console.log(`✓ Successfully updated ${roleKey} permissions (${newRows.length} permissions assigned).`);
  }

  console.log('\n====================================================');
  console.log('   RBAC ROLE PERMISSIONS SYNC COMPLETE!            ');
  console.log('====================================================\n');
}

syncRolePermissions().catch(console.error);
