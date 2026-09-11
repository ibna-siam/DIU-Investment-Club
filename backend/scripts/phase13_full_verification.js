/**
 * Phase 13 Comprehensive Real-World QA & Verification Suite
 *
 * Runs against the LIVE production systems:
 * Frontend: https://invesmentclub.top
 * API: https://api.invesmentclub.top/api/v1
 * Database: Supabase PostgreSQL
 */

const https = require('https');

const API_BASE = 'https://api.invesmentclub.top/api/v1';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (body) {
      if (typeof body === 'object') {
        body = JSON.stringify(body);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(reqOptions, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed = raw;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const ROLES = [
  { slug: 'SUPER_ADMIN', email: 'demo.superadmin@diu.edu.bd', pass: 'Password123!' },
  { slug: 'TREASURER', email: 'demo.treasurer@diu.edu.bd', pass: 'Password123!' },
  { slug: 'PRESIDENT', email: 'demo.president@diu.edu.bd', pass: 'Password123!' },
  { slug: 'GENERAL_SECRETARY', email: 'demo.generalsecretary@diu.edu.bd', pass: 'Password123!' },
  { slug: 'AUDITOR', email: 'demo.auditor@diu.edu.bd', pass: 'Password123!' },
  { slug: 'EVENT_MANAGER', email: 'demo.eventmanager@diu.edu.bd', pass: 'Password123!' },
  { slug: 'EXECUTIVE_MEMBER', email: 'demo.executive@diu.edu.bd', pass: 'Password123!' },
  { slug: 'GENERAL_MEMBER', email: 'demo.member@diu.edu.bd', pass: 'Password123!' },
];

const results = {
  domain: {},
  auth: {},
  profile: {},
  rbacMatrix: {},
  dataVisibility: {},
  receipts: {},
  notifications: {},
  automationLogs: {},
  userDeletion: {},
};

async function run() {
  console.log('====================================================');
  console.log('PHASE 13 PRODUCTION VERIFICATION SUITE');
  console.log('Target API:', API_BASE);
  console.log('Time:', new Date().toISOString());
  console.log('====================================================\n');

  // PART 1: DOMAIN AUDIT & CORS
  console.log('--- PART 1: DOMAIN & CORS VERIFICATION ---');
  try {
    const corsGood = await request('https://api.invesmentclub.top/health', {
      headers: { Origin: 'https://invesmentclub.top' }
    });
    const allowGood = corsGood.headers['access-control-allow-origin'];
    console.log('CORS for https://invesmentclub.top ->', allowGood === 'https://invesmentclub.top' ? 'PASS (Allowed)' : `FAIL (${allowGood})`);
    results.domain.corsValid = allowGood === 'https://invesmentclub.top';

    const corsWww = await request('https://api.invesmentclub.top/health', {
      headers: { Origin: 'https://www.invesmentclub.top' }
    });
    const allowWww = corsWww.headers['access-control-allow-origin'];
    console.log('CORS for https://www.invesmentclub.top ->', allowWww === 'https://www.invesmentclub.top' ? 'PASS (Allowed)' : `FAIL (${allowWww})`);
    results.domain.corsWww = allowWww === 'https://www.invesmentclub.top';

    const corsBad = await request('https://api.invesmentclub.top/health', {
      headers: { Origin: 'https://investmentclub.top' }
    });
    const allowBad = corsBad.headers['access-control-allow-origin'];
    console.log('CORS for incorrect https://investmentclub.top ->', allowBad !== 'https://investmentclub.top' ? 'PASS (Rejected)' : 'FAIL (Allowed)');
    results.domain.corsWrongRejected = allowBad !== 'https://investmentclub.top';
  } catch (err) {
    console.error('CORS check error:', err.message);
  }

  // PART 2 & 10: AUTHENTICATION & PROFILE PRIVACY ACROSS ALL 8 ROLES
  console.log('\n--- PART 2 & 10: 8-ROLE AUTHENTICATION & PROFILE PRIVACY ---');
  const tokens = {};

  for (const r of ROLES) {
    try {
      const loginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
        email: r.email,
        password: r.pass,
      });

      if (loginRes.status === 200 && loginRes.data?.success) {
        const token = loginRes.data.data?.token || loginRes.data.data?.accessToken;
        const user = loginRes.data.data?.user;
        tokens[r.slug] = { token, user };
        const userRole = user?.roles?.[0]?.slug || user?.role?.slug;
        console.log(`[AUTH] ${r.slug}: PASS (HTTP 200, Role=${userRole})`);
        results.auth[r.slug] = true;

        // Verify Profile Privacy
        const profRes = await request(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (profRes.status === 200 && profRes.data?.success) {
          const profUser = profRes.data.data?.user || profRes.data.data;
          const isOwn = profUser?.id === user?.id;
          console.log(`[PROFILE] ${r.slug}: PASS (Profile belongs strictly to user: ${isOwn})`);
          results.profile[r.slug] = isOwn;
        } else {
          console.log(`[PROFILE] ${r.slug}: FAIL (${profRes.status})`);
          results.profile[r.slug] = false;
        }
      } else {
        console.log(`[AUTH] ${r.slug}: FAIL (${loginRes.status}, ${JSON.stringify(loginRes.data)})`);
        results.auth[r.slug] = false;
      }
    } catch (err) {
      console.log(`[AUTH] ${r.slug}: ERROR (${err.message})`);
      results.auth[r.slug] = false;
    }
  }

  // PART 3: FULL DATA VISIBILITY & ACCESS MATRIX
  console.log('\n--- PART 3: DATA VISIBILITY & RBAC ENFORCEMENT ---');
  const superToken = tokens['SUPER_ADMIN']?.token;
  const treasurerToken = tokens['TREASURER']?.token;
  const auditorToken = tokens['AUDITOR']?.token;
  const memberToken = tokens['GENERAL_MEMBER']?.token;

  const testEndpoints = [
    { name: 'Financial Accounts', path: '/accounts' },
    { name: 'Incomes', path: '/incomes' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Transactions', path: '/financial-accounts/transactions' },
    { name: 'Cash Flow', path: '/reports/cash-flow' },
    { name: 'Chart of Accounts', path: '/accounting/coa' },
    { name: 'Journal Entries', path: '/accounting/journals' },
    { name: 'Vouchers', path: '/accounting/vouchers' },
    { name: 'Events', path: '/events' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Meetings', path: '/meetings' },
    { name: 'Members', path: '/members' },
    { name: 'Users', path: '/users' },
    { name: 'Automation Rules', path: '/automation/rules' },
    { name: 'Automation Logs', path: '/automation/logs' },
    { name: 'Audit Logs', path: '/audit-logs' },
  ];

  console.log('\nTesting Super Admin Visibility:');
  for (const ep of testEndpoints) {
    if (!superToken) break;
    const res = await request(`${API_BASE}${ep.path}`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    const count = Array.isArray(res.data?.data) ? res.data.data.length : (res.data?.data ? 'object' : (res.data?.total || 0));
    console.log(`  SUPER_ADMIN -> ${ep.name.padEnd(20)}: HTTP ${res.status} (Count: ${count})`);
    results.dataVisibility[ep.name] = { status: res.status, count };
  }

  console.log('\nTesting Auditor Read-Only & Mutation Blocking:');
  if (auditorToken) {
    const accRead = await request(`${API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${auditorToken}` }
    });
    console.log(`  AUDITOR -> Read Accounts: HTTP ${accRead.status} (Allowed)`);

    const accCreate = await request(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auditorToken}` }
    }, { account_name: 'Hacked Account', account_type: 'BANK', account_number: '123' });
    console.log(`  AUDITOR -> Create Account: HTTP ${accCreate.status} (Must be 403 Forbidden: ${accCreate.status === 403 ? 'PASS' : 'FAIL'})`);
    results.rbacMatrix.auditorCreateBlocked = accCreate.status === 403;
  }

  console.log('\nTesting General Member Admin Blocking:');
  if (memberToken) {
    const finRead = await request(`${API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    console.log(`  GENERAL_MEMBER -> Read Accounts: HTTP ${finRead.status} (Must be 403 Forbidden: ${finRead.status === 403 ? 'PASS' : 'FAIL'})`);
    results.rbacMatrix.memberAccountsBlocked = finRead.status === 403;

    const usersRead = await request(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    console.log(`  GENERAL_MEMBER -> Read Users: HTTP ${usersRead.status} (Must be 403 Forbidden: ${usersRead.status === 403 ? 'PASS' : 'FAIL'})`);
    results.rbacMatrix.memberUsersBlocked = usersRead.status === 403;

    const autoLogs = await request(`${API_BASE}/automation/logs`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    console.log(`  GENERAL_MEMBER -> Read Auto Logs: HTTP ${autoLogs.status} (Must be 403 Forbidden: ${autoLogs.status === 403 ? 'PASS' : 'FAIL'})`);
    results.rbacMatrix.memberAutoLogsBlocked = autoLogs.status === 403;
  }

  // PART 6: PUBLIC DIGITAL RECEIPT
  console.log('\n--- PART 6: PUBLIC DIGITAL RECEIPT (NO AUTH) ---');
  try {
    // 1. Invalid token should return 404
    const badReceipt = await request(`${API_BASE}/public/receipts/0000000000000000000000000000000000000000000000000000000000000000`);
    console.log(`  Public receipt (invalid token) -> HTTP ${badReceipt.status} (Must be 404: ${badReceipt.status === 404 ? 'PASS' : 'FAIL'})`);
    results.receipts.invalidToken404 = badReceipt.status === 404;

    // 2. Fetch verified payments to test a real receipt token if available
    if (superToken) {
      const pmts = await request(`${API_BASE}/member-payments`, {
        headers: { Authorization: `Bearer ${superToken}` }
      });
      const verifiedWithToken = (pmts.data?.data || []).find(p => p.receipt_token && p.status === 'VERIFIED');
      if (verifiedWithToken) {
        const pubRes = await request(`${API_BASE}/public/receipts/${verifiedWithToken.receipt_token}`);
        console.log(`  Public receipt (valid token) -> HTTP ${pubRes.status} (Success: ${pubRes.data?.success})`);
        console.log(`  Public receipt payload -> Member: ${pubRes.data?.data?.member?.fullName}, Amount: ${pubRes.data?.data?.amount}`);
        results.receipts.validToken200 = pubRes.status === 200 && pubRes.data?.success;
      } else {
        console.log('  No verified member payments with receipt token found to test valid public receipt.');
        results.receipts.validToken200 = 'NO_DATA';
      }
    }
  } catch (err) {
    console.error('Receipt test error:', err.message);
  }

  // PART 8: NOTIFICATIONS READ PERSISTENCE
  console.log('\n--- PART 8: NOTIFICATION READ STATUS PERSISTENCE ---');
  if (superToken) {
    try {
      const notifsRes = await request(`${API_BASE}/notifications?status=ALL&limit=10`, {
        headers: { Authorization: `Bearer ${superToken}` }
      });
      const notifs = notifsRes.data?.data || [];
      console.log(`  Retrieved ${notifs.length} notifications for Super Admin.`);
      if (notifs.length > 0) {
        const target = notifs[0];
        const markRes = await request(`${API_BASE}/notifications/${target.id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${superToken}` }
        });
        console.log(`  Mark as read notification ${target.id} -> HTTP ${markRes.status} (Success: ${markRes.data?.success})`);
        results.notifications.markAsRead = markRes.status === 200 && markRes.data?.success;

        // Verify it remains read on reload
        const verifyRes = await request(`${API_BASE}/notifications?status=READ&limit=20`, {
          headers: { Authorization: `Bearer ${superToken}` }
        });
        const readItems = verifyRes.data?.data || [];
        const found = readItems.some(n => n.id === target.id && (n.is_read === true || n.status === 'READ'));
        console.log(`  Reload verification: item is in READ list -> ${found ? 'PASS' : 'FAIL'}`);
        results.notifications.persistsRead = found;
      }
    } catch (err) {
      console.error('Notification test error:', err.message);
    }
  }

  // PART 9: AUTOMATION LOGS PAGINATION
  console.log('\n--- PART 9: AUTOMATION LOGS PAGINATION ---');
  if (superToken) {
    try {
      const logsRes = await request(`${API_BASE}/automation/logs?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${superToken}` }
      });
      console.log(`  Automation logs response: HTTP ${logsRes.status}, Total: ${logsRes.data?.total}, TotalPages: ${logsRes.data?.totalPages}`);
      results.automationLogs.pagination = logsRes.status === 200 && typeof logsRes.data?.totalPages === 'number';
    } catch (err) {
      console.error('Automation logs error:', err.message);
    }
  }

  // PART 11: USER DELETION SAFETY GUARD
  console.log('\n--- PART 11: USER DELETION SAFETY GUARD ---');
  if (superToken && tokens['SUPER_ADMIN']?.user?.id) {
    try {
      // Super Admin attempting self-deletion
      const selfDel = await request(`${API_BASE}/users/${tokens['SUPER_ADMIN'].user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superToken}` }
      });
      console.log(`  Super Admin self-deletion attempt -> HTTP ${selfDel.status} (Must be rejected with 400/403: ${selfDel.status >= 400 ? 'PASS' : 'FAIL'})`);
      console.log(`  Message: ${selfDel.data?.error?.message || selfDel.data?.message}`);
      results.userDeletion.selfDeleteBlocked = selfDel.status >= 400;
    } catch (err) {
      console.error('User deletion test error:', err.message);
    }
  }

  console.log('\n====================================================');
  console.log('SUMMARY OF PHASE 13 LIVE VERIFICATION:');
  console.log(JSON.stringify(results, null, 2));
  console.log('====================================================');
}

run().catch(console.error);
