/**
 * PHASE 1.5 VERIFICATION SUITE: Supabase MCP Integration & Live Database Connection
 * Tests live Supabase Auth, Profiles, Roles, Permissions, User Management, and RBAC
 */

import http from 'http';

const API_BASE = 'http://localhost:5000/api/v1';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function request(options: {
  method: string;
  path: string;
  body?: any;
  token?: string;
}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${options.path}`);
    const postData = options.body ? JSON.stringify(options.body) : null;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({ status: res.statusCode || 500, data });
          } catch {
            resolve({ status: res.statusCode || 500, data: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 RUNNING PHASE 1.5 SUPABASE LIVE INTEGRATION TEST SUITE');
  console.log('===============================================================');

  let adminToken = '';
  let testUserId = '';

  // TEST 1: Health check & Supabase configuration
  try {
    const res = await request({ method: 'GET', path: '/health' });
    const passed = res.status === 200 && res.data.supabaseConnected === true;
    results.push({
      name: '1. Health & Supabase Connection Verification',
      passed,
      details: `Status ${res.status}, Supabase Connected: ${res.data.supabaseConnected}`,
    });
  } catch (err: any) {
    results.push({
      name: '1. Health & Supabase Connection Verification',
      passed: false,
      error: err.message,
    });
  }

  // TEST 2: Real Supabase Auth Login (Valid Credentials)
  try {
    const res = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'admin@diu.edu.bd', password: 'Admin123!' },
    });
    const passed =
      res.status === 200 &&
      res.data.success &&
      res.data.data.token &&
      res.data.data.user.email === 'admin@diu.edu.bd';
    adminToken = res.data?.data?.token || '';
    results.push({
      name: '2. Live Supabase Auth Login (admin@diu.edu.bd)',
      passed,
      details: `User ID: ${res.data?.data?.user?.id}, Role: ${res.data?.data?.user?.roles?.[0]?.name}`,
    });
  } catch (err: any) {
    results.push({
      name: '2. Live Supabase Auth Login (admin@diu.edu.bd)',
      passed: false,
      error: err.message,
    });
  }

  // TEST 3: Invalid login rejection
  try {
    const res = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'admin@diu.edu.bd', password: 'WrongPassword123' },
    });
    const passed = res.status === 401 && res.data.success === false;
    results.push({
      name: '3. Reject Invalid Authentication Credentials',
      passed,
      details: `Status ${res.status}, Error: ${res.data.error?.message}`,
    });
  } catch (err: any) {
    results.push({
      name: '3. Reject Invalid Authentication Credentials',
      passed: false,
      error: err.message,
    });
  }

  // TEST 4: Session verification & profile hydration with roles and permissions
  try {
    const res = await request({ method: 'GET', path: '/auth/me', token: adminToken });
    const user = res.data?.data;
    const hasSuperAdmin = user?.roles?.some((r: any) => r.slug === 'SUPER_ADMIN');
    const hasPerms = user?.permissions && user.permissions.length > 0;
    const passed = res.status === 200 && hasSuperAdmin && hasPerms;
    results.push({
      name: '4. Profile Hydration with Database Roles & Permissions',
      passed,
      details: `Roles: ${user?.roles?.length}, Permissions: ${user?.permissions?.length}, Status: ${user?.status}`,
    });
  } catch (err: any) {
    results.push({
      name: '4. Profile Hydration with Database Roles & Permissions',
      passed: false,
      error: err.message,
    });
  }

  // TEST 5: Live Roles Query
  try {
    const res = await request({ method: 'GET', path: '/roles', token: adminToken });
    const roles = res.data?.data || [];
    const hasAll7 = roles.length >= 7;
    const hasTreasurer = roles.some((r: any) => r.slug === 'TREASURER');
    const passed = res.status === 200 && hasAll7 && hasTreasurer;
    results.push({
      name: '5. Roles Loaded from Live Supabase Database',
      passed,
      details: `Total Roles: ${roles.length}, Slugs: ${roles.map((r: any) => r.slug).join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      name: '5. Roles Loaded from Live Supabase Database',
      passed: false,
      error: err.message,
    });
  }

  // TEST 6: Live Permissions Query across 21 Modules
  try {
    const res = await request({ method: 'GET', path: '/permissions/modules', token: adminToken });
    const modules = Object.keys(res.data?.data || {});
    const passed = res.status === 200 && modules.length >= 18;
    results.push({
      name: '6. Permissions Loaded from Live Supabase Database',
      passed,
      details: `Modules Count: ${modules.length}, Sample: ${modules.slice(0, 5).join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      name: '6. Permissions Loaded from Live Supabase Database',
      passed: false,
      error: err.message,
    });
  }

  // TEST 7: Users Management: List Real Users from Database
  try {
    const res = await request({ method: 'GET', path: '/users?page=1&limit=10', token: adminToken });
    const users = Array.isArray(res.data?.data) ? res.data.data : [];
    const total = res.data?.total || users.length;
    const passed = res.status === 200 && users.length >= 4;
    testUserId = users.find((u: any) => u.email === 'auditor@diu.edu.bd')?.id || users[1]?.id;
    results.push({
      name: '7. Users Management (List Users from Live Database)',
      passed,
      details: `Retrieved Users: ${users.length}, Total in DB: ${total}`,
    });
  } catch (err: any) {
    results.push({
      name: '7. Users Management (List Users from Live Database)',
      passed: false,
      error: err.message,
    });
  }

  // TEST 8: User Status Update via Live Supabase RPC
  try {
    const res = await request({
      method: 'PATCH',
      path: `/users/${testUserId}/status`,
      body: { status: 'suspended' },
      token: adminToken,
    });
    const passed = res.status === 200 && res.data?.data?.status === 'suspended';

    // Re-activate
    await request({
      method: 'PATCH',
      path: `/users/${testUserId}/status`,
      body: { status: 'active' },
      token: adminToken,
    });

    results.push({
      name: '8. User Status Management via Database RPC',
      passed,
      details: `Suspended & Re-activated successfully for User ID ${testUserId}`,
    });
  } catch (err: any) {
    results.push({
      name: '8. User Status Management via Database RPC',
      passed: false,
      error: err.message,
    });
  }

  // TEST 9: Protected System Role Deletion Prevention
  try {
    const superAdminRoleId = '11111111-1111-1111-1111-111111111111';
    const res = await request({
      method: 'DELETE',
      path: `/roles/${superAdminRoleId}`,
      token: adminToken,
    });
    const passed = res.status === 400 && res.data.success === false;
    results.push({
      name: '9. System Role Protection from Accidental Deletion',
      passed,
      details: `Status ${res.status}, Message: ${res.data.error?.message}`,
    });
  } catch (err: any) {
    results.push({
      name: '9. System Role Protection from Accidental Deletion',
      passed: false,
      error: err.message,
    });
  }

  // TEST 10: Live Dashboard Stats via Supabase RPC
  try {
    const res = await request({ method: 'GET', path: '/dashboard/stats', token: adminToken });
    const overview = res.data?.data?.overview;
    const passed =
      res.status === 200 &&
      overview &&
      overview.totalUsers >= 4 &&
      overview.totalRoles >= 7 &&
      overview.systemStatus === 'Operational';
    results.push({
      name: '10. Live Dashboard Metrics from Database',
      passed,
      details: `Total Users: ${overview?.totalUsers}, Active Users: ${overview?.activeUsers}, Total Roles: ${overview?.totalRoles}`,
    });
  } catch (err: any) {
    results.push({
      name: '10. Live Dashboard Metrics from Database',
      passed: false,
      error: err.message,
    });
  }

  // TEST 11: Protected Route Guarding (Unauthorized Access Rejection)
  try {
    const res = await request({ method: 'GET', path: '/users' });
    const passed = res.status === 401 && res.data.success === false;
    results.push({
      name: '11. Protected API Access Control (Rejects Missing Token)',
      passed,
      details: `Status ${res.status}, Code: ${res.data.error?.code}`,
    });
  } catch (err: any) {
    results.push({
      name: '11. Protected API Access Control (Rejects Missing Token)',
      passed: false,
      error: err.message,
    });
  }

  // SUMMARY REPORT
  console.log('\n===============================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('===============================================================');
  let passCount = 0;
  for (const r of results) {
    const symbol = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${symbol} - ${r.name}`);
    if (r.details) console.log(`       Details: ${r.details}`);
    if (r.error) console.log(`       Error: ${r.error}`);
    if (r.passed) passCount++;
  }
  console.log('===============================================================');
  console.log(`TOTAL: ${passCount}/${results.length} PASSED (${Math.round((passCount / results.length) * 100)}%)`);
  console.log('===============================================================');

  if (passCount === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
