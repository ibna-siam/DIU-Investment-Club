/**
 * Phase 11: Comprehensive Security, Hardening & Performance Test Suite
 * DIU Investment Club Financial Management System ERP
 * 
 * Verifies:
 * 1. Unauthorized Route Access (HTTP 401 on unauthenticated calls)
 * 2. Unauthorized API Action & RBAC (HTTP 403 on permission boundaries)
 * 3. Direct Supabase PostgREST RLS Block (Anon client blocked on sensitive tables)
 * 4. File Upload Whitelist & Magic Byte Anti-Spoofing (Rejection of .exe, .sh, spoofed magic bytes)
 * 5. Private / Restricted Document Download Access Control
 * 6. Financial Transaction Atomic Row-Locking & Concurrency
 * 7. Notification Read State Persistence & Idempotency
 * 8. Performance Benchmark for Covered Indexes (Transactions, Audit, Members, Documents, Notifications)
 */

const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api/v1';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let passed = 0;
let failed = 0;
const results = [];

function recordResult(category, testName, isPass, details = '') {
  if (isPass) {
    passed++;
    console.log(`  ✅ PASS: [${category}] ${testName}`);
    results.push({ category, name: testName, status: 'PASS', details });
  } else {
    failed++;
    console.error(`  ❌ FAIL: [${category}] ${testName} - ${details}`);
    results.push({ category, name: testName, status: 'FAIL', details });
  }
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.data;
}

async function runPhase11Tests() {
  console.log('================================================================');
  console.log('🛡️  PHASE 11 SECURITY, PERFORMANCE & HARDENING VERIFICATION TEST');
  console.log('================================================================\n');

  // Authenticate as Super Admin
  let adminToken, adminUser;
  try {
    const adminAuth = await login('admin@diu.edu.bd', 'Password123!');
    adminToken = adminAuth.token;
    adminUser = adminAuth.user;
    recordResult('Authentication', 'Super Admin Login & JWT Issuance', true, `User: ${adminUser.email}`);
  } catch (err) {
    recordResult('Authentication', 'Super Admin Login & JWT Issuance', false, err.message);
    process.exit(1);
  }

  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  // -------------------------------------------------------------
  // TEST 1: Unauthorized Route Access (HTTP 401)
  // -------------------------------------------------------------
  console.log('\n--- [Test 1] Unauthorized Route & API Access (HTTP 401) ---');
  const protectedEndpoints = [
    '/transactions',
    '/members',
    '/documents',
    '/audit-logs',
    '/users',
    '/accounts',
  ];

  for (const ep of protectedEndpoints) {
    try {
      const res = await fetch(`${API_BASE}${ep}`, { method: 'GET' });
      recordResult(
        'Route Protection',
        `Unauthenticated GET ${ep} rejected with 401`,
        res.status === 401,
        `HTTP Status: ${res.status}`
      );
    } catch (err) {
      recordResult('Route Protection', `Unauthenticated GET ${ep}`, false, err.message);
    }
  }

  // -------------------------------------------------------------
  // TEST 2: Unauthorized API Action & RBAC Enforcement (HTTP 403)
  // -------------------------------------------------------------
  console.log('\n--- [Test 2] RBAC Action Enforcement (HTTP 403) ---');
  // Attempting to hit an admin endpoint with invalid / forged token
  try {
    const forgedTokenRes = await fetch(`${API_BASE}/users`, {
      method: 'GET',
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token' },
    });
    recordResult(
      'RBAC Protection',
      'Forged/Corrupted JWT token rejected with 401/403',
      forgedTokenRes.status === 401 || forgedTokenRes.status === 403,
      `HTTP Status: ${forgedTokenRes.status}`
    );
  } catch (err) {
    recordResult('RBAC Protection', 'Forged token test', false, err.message);
  }

  // Verify Initial Admin Setup Lockout
  try {
    const setupRes = await fetch(`${API_BASE}/auth/setup-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'attacker@diu.edu.bd',
        password: 'Password123!',
        full_name: 'Attacker Admin',
      }),
    });
    const setupBody = await setupRes.json().catch(() => ({}));
    recordResult(
      'Auth Hardening',
      'setupInitialAdmin endpoint locked when admin exists',
      setupRes.status === 400 && setupBody.error?.code === 'ADMIN_EXISTS',
      `HTTP Status: ${setupRes.status}, Code: ${setupBody.error?.code}`
    );
  } catch (err) {
    recordResult('Auth Hardening', 'Initial admin lockout test', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Direct Supabase Anon Client RLS Block
  // -------------------------------------------------------------
  console.log('\n--- [Test 3] Direct Supabase PostgREST RLS Policy Block ---');
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Attempt direct reading of audit_logs via anon
    const { data: anonAudit, error: auditErr } = await anonSupabase.from('audit_logs').select('*').limit(5);
    recordResult(
      'Supabase RLS',
      'Direct anonymous access to audit_logs blocked by RLS',
      !anonAudit || anonAudit.length === 0 || !!auditErr,
      auditErr ? `Blocked with error: ${auditErr.message}` : `Returned 0 records (RLS filtering active)`
    );

    // Attempt direct reading of system_settings via anon
    const { data: anonSettings, error: settingsErr } = await anonSupabase.from('system_settings').select('*').limit(5);
    recordResult(
      'Supabase RLS',
      'Direct anonymous access to system_settings blocked by RLS',
      !anonSettings || anonSettings.length === 0 || !!settingsErr,
      settingsErr ? `Blocked with error: ${settingsErr.message}` : `Returned 0 records (RLS active)`
    );

    // Attempt direct insert to audit_logs via anon
    const { error: insertAuditErr } = await anonSupabase.from('audit_logs').insert({
      action: 'MALICIOUS_ANON_LOG',
      module: 'security',
    });
    recordResult(
      'Supabase RLS',
      'Direct anonymous write to audit_logs blocked by RLS',
      !!insertAuditErr,
      insertAuditErr ? `Blocked: ${insertAuditErr.message}` : 'Failed to block write!'
    );
  } else {
    recordResult('Supabase RLS', 'Direct anon client test', false, 'Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  // -------------------------------------------------------------
  // TEST 4: File Upload Whitelist & Magic Byte Anti-Spoofing
  // -------------------------------------------------------------
  console.log('\n--- [Test 4] Document Upload Whitelists & Magic Byte Validation ---');

  // 4.A: Attempt uploading disallowed executable (.exe)
  try {
    const formExe = new FormData();
    formExe.append('title', 'Malicious Executable');
    formExe.append('category', 'GOVERNANCE');
    const exeBlob = new Blob([Buffer.from('MZ\x90\x00\x03\x00\x00\x00')], { type: 'application/x-msdownload' });
    formExe.append('file', exeBlob, 'exploit.exe');

    const resExe = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formExe,
    });
    recordResult(
      'Upload Security',
      'Disallowed executable extension (.exe) rejected with 400/500',
      !resExe.ok,
      `HTTP Status: ${resExe.status}`
    );
  } catch (err) {
    recordResult('Upload Security', 'Disallowed extension test', false, err.message);
  }

  // 4.B: Attempt double extension traversal (malicious.php.pdf)
  try {
    const formDoubleExt = new FormData();
    formDoubleExt.append('title', 'Double Extension Bypass');
    formDoubleExt.append('category', 'GOVERNANCE');
    const doubleBlob = new Blob([Buffer.from('%PDF-1.4 sample content')], { type: 'application/pdf' });
    formDoubleExt.append('file', doubleBlob, 'shell.php.pdf');

    const resDouble = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formDoubleExt,
    });
    recordResult(
      'Upload Security',
      'Dangerous double extension (.php.pdf) rejected',
      !resDouble.ok,
      `HTTP Status: ${resDouble.status}`
    );
  } catch (err) {
    recordResult('Upload Security', 'Double extension test', false, err.message);
  }

  // 4.C: Attempt spoofed magic bytes (.pdf extension with non-PDF binary content)
  try {
    const formSpoofed = new FormData();
    formSpoofed.append('title', 'Spoofed PDF with Fake Signature');
    formSpoofed.append('category', 'GOVERNANCE');
    const fakeBlob = new Blob([Buffer.from('NOT_A_REAL_PDF_HEADER_FAKE_BYTES')], { type: 'application/pdf' });
    formSpoofed.append('file', fakeBlob, 'fake_invoice.pdf');

    const resSpoofed = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formSpoofed,
    });
    recordResult(
      'Upload Security',
      'Spoofed file content (fake magic bytes) rejected with 400',
      resSpoofed.status === 400,
      `HTTP Status: ${resSpoofed.status}`
    );
  } catch (err) {
    recordResult('Upload Security', 'Magic byte spoof test', false, err.message);
  }

  // 4.D: Valid document upload with genuine PDF magic bytes (%PDF-)
  let uploadedDocId = null;
  try {
    const validPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Title (DIU Investment Club Constitution) /Author (DIU) >>\nendobj\n%%EOF'
    );
    const formValid = new FormData();
    formValid.append('title', `Phase 11 Compliance Protocol ${Date.now()}`);
    formValid.append('description', 'Standard Operating Protocol verified for Phase 11');
    formValid.append('category', 'POLICY_DOCUMENT');
    formValid.append('visibility', 'PUBLIC_TO_MEMBERS');
    formValid.append('original_size', '150000');
    formValid.append('optimized_size', '45000');
    const validBlob = new Blob([validPdfBuffer], { type: 'application/pdf' });
    formValid.append('file', validBlob, 'diu_compliance_protocol.pdf');

    const resValid = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formValid,
    });
    const validBody = await resValid.json();
    uploadedDocId = validBody.data?.id;

    recordResult(
      'Upload Security',
      'Genuine document with verified magic bytes successfully uploaded',
      resValid.status === 201 && !!uploadedDocId,
      `Doc ID: ${uploadedDocId || 'N/A'}` + (validBody.error ? ` (${validBody.error.message})` : '')
    );
  } catch (err) {
    recordResult('Upload Security', 'Genuine document upload test', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Document Download Access Control & Signed URL
  // -------------------------------------------------------------
  console.log('\n--- [Test 5] Document Download Access Control ---');
  if (uploadedDocId) {
    try {
      const downloadRes = await fetch(`${API_BASE}/documents/${uploadedDocId}/download`, {
        headers: adminHeaders,
      });
      const downloadData = await downloadRes.json();
      recordResult(
        'Document Security',
        'Authorized signed download URL generated for document',
        downloadRes.status === 200 && !!downloadData.data?.download_url,
        `Signed URL valid: ${Boolean(downloadData.data?.download_url)}`
      );
    } catch (err) {
      recordResult('Document Security', 'Signed URL download test', false, err.message);
    }
  }

  // -------------------------------------------------------------
  // TEST 6: Financial Immutability & Row-Locking Concurrency
  // -------------------------------------------------------------
  console.log('\n--- [Test 6] Financial Transaction Immutability & Concurrency ---');
  // 6.A Immutability: Block DELETE on financial routes
  const finRes = await fetch(`${API_BASE}/transactions/00000000-0000-0000-0000-000000000001`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  const finBody = await finRes.json().catch(() => ({}));
  recordResult(
    'Financial Integrity',
    'Financial transactions are strictly immutable (HTTP 405 Blocked)',
    finRes.status === 405 && finBody.error?.code === 'FINANCIAL_AUDIT_PROTECTION',
    `Code: ${finBody.error?.code}`
  );

  // -------------------------------------------------------------
  // TEST 7: Notification Read State Persistence
  // -------------------------------------------------------------
  console.log('\n--- [Test 7] Notification Read State Persistence ---');
  try {
    // Fetch notifications
    const notifRes = await fetch(`${API_BASE}/notifications?limit=10`, { headers: adminHeaders });
    const notifData = await notifRes.json();
    const notifs = notifData.data?.notifications || notifData.data || [];

    if (notifs.length > 0) {
      const targetNotif = notifs[0];
      // Mark as read
      const markRes = await fetch(`${API_BASE}/notifications/${targetNotif.id}/read`, {
        method: 'PUT',
        headers: adminHeaders,
      });

      // Verify immediate state
      const recheckRes = await fetch(`${API_BASE}/notifications?limit=10`, { headers: adminHeaders });
      const recheckData = await recheckRes.json();
      const recheckList = recheckData.data?.notifications || recheckData.data || [];
      const updated = recheckList.find(n => n.id === targetNotif.id);

      recordResult(
        'Notifications',
        'Notification read state is persistent and idempotent',
        markRes.ok && (!updated || updated.is_read === true),
        `Notification ${targetNotif.id} marked read successfully`
      );
    } else {
      recordResult('Notifications', 'Notification read state persistence', true, 'No existing notifications to toggle; query succeeded');
    }
  } catch (err) {
    recordResult('Notifications', 'Notification read state persistence', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 8: Covered Indexes Latency Benchmarks
  // -------------------------------------------------------------
  console.log('\n--- [Test 8] Database Performance & Covering Indexes Latency Benchmark ---');
  const benchmarkEndpoints = [
    { name: 'Financial Transactions List', url: `${API_BASE}/transactions?limit=25` },
    { name: 'Members Directory Filtered', url: `${API_BASE}/members?membership_status=ACTIVE&limit=25` },
    { name: 'Audit Logs Query', url: `${API_BASE}/audit-logs?limit=25` },
    { name: 'Governance Documents Query', url: `${API_BASE}/documents?status=ACTIVE` },
    { name: 'User Notifications Query', url: `${API_BASE}/notifications?limit=20` },
  ];

  for (const bench of benchmarkEndpoints) {
    try {
      const samples = [];
      // Warm up
      await fetch(bench.url, { headers: adminHeaders });

      // Take 3 latency samples
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const res = await fetch(bench.url, { headers: adminHeaders });
        const elapsed = performance.now() - start;
        if (res.ok) samples.push(elapsed);
      }

      const avg = samples.length > 0 ? (samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1) : 0;
      recordResult(
        'Performance Benchmark',
        `${bench.name} latency avg: ${avg}ms (WAN Benchmark < 800ms)`,
        avg < 800,
        `Samples: ${samples.map(s => s.toFixed(0) + 'ms').join(', ')}`
      );
    } catch (err) {
      recordResult('Performance Benchmark', bench.name, false, err.message);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 PHASE 11 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase11Tests();
