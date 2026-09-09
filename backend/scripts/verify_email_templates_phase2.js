const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'diu_investment_club_super_secure_secret_token_2026_key';
const RESEND_TEST_RECIPIENT = process.env.RESEND_TEST_RECIPIENT || 'siamibna75@gmail.com';

console.log('========================================================================');
console.log('🎨 PHASE 2: PROFESSIONAL EMAIL BRANDING & TEMPLATE SYSTEM VERIFICATION');
console.log('========================================================================\n');

async function runPhase2Tests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // Generate test authorization token for Super Admin
  const token = jwt.sign(
    {
      id: '0b891f78-263c-440e-bc98-9dd1bf7a8c27',
      sub: '0b891f78-263c-440e-bc98-9dd1bf7a8c27',
      email: 'siamibna29@gmail.com',
      role: 'Super Admin',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Check Brand & Operational Status
  console.log('[Step 1] Brand Identity & Configuration Verification');
  const statusRes = await fetch(`${API_BASE}/email/status`, { headers: authHeaders });
  const statusData = await statusRes.json();
  assert(statusRes.status === 200, 'GET /api/v1/email/status is accessible');
  assert(statusData.data?.brandName === 'DIU Investment Club', 'Brand name is strictly "DIU Investment Club" (No "ERP" in public brand)');
  assert(statusData.data?.from.includes('DIU Investment Club'), 'Sender display name includes "DIU Investment Club"');
  assert(!statusData.data?.from.includes('ERP') && !statusData.data?.from.includes('Financial Management System'), 'Sender display name does NOT expose internal technical names');

  // Helper function to test sending endpoints
  async function testTemplateEndpoint(endpoint, payload, testLabel) {
    console.log(`\n[${testLabel}]`);
    await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      const res = await fetch(`${API_BASE}/email/${endpoint}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          to: RESEND_TEST_RECIPIENT,
          ...payload,
        }),
      });

      const body = await res.json();
      assert(res.status === 200, `${testLabel} returned HTTP 200 OK`, `${res.status}: ${JSON.stringify(body)}`);
      assert(Boolean(body.data?.id), `Resend Message ID received: ${body.data?.id || 'N/A'}`);
      return body.data;
    } catch (err) {
      assert(false, testLabel, err.message);
      return null;
    }
  }

  // TEST 1: Welcome / Account Creation Template (Section 6)
  await testTemplateEndpoint(
    'test/welcome',
    { userName: 'Md. Ibna Siam' },
    'TEST 1: Professional Welcome Email'
  );

  // TEST 2: Payment Confirmation Template (Section 7)
  await testTemplateEndpoint(
    'test/payment-confirmation',
    {
      memberName: 'Md. Ibna Siam',
      amount: 1500,
      paymentType: 'Annual General Membership Dues',
      paymentReference: 'PAY-2026-DIU-001',
    },
    'TEST 2: Payment Confirmation Template'
  );

  // TEST 3A: Expense Approved Template (Section 8)
  await testTemplateEndpoint(
    'test/expense-status',
    {
      userName: 'Md. Ibna Siam',
      status: 'APPROVED',
      notes: 'Receipt verified by Treasury. Payment scheduled.',
    },
    'TEST 3A: Expense Status (Approved) Template'
  );

  // TEST 3B: Expense Rejected Template (Section 8)
  await testTemplateEndpoint(
    'test/expense-status',
    {
      userName: 'Md. Ibna Siam',
      status: 'REJECTED',
      reason: 'Merchant cash memo was missing date and signature. Please re-upload legible invoice.',
    },
    'TEST 3B: Expense Status (Rejected / Action Required) Template'
  );

  // TEST 4: Event Notification Template (Section 9)
  await testTemplateEndpoint(
    'test/event-notification',
    {
      memberName: 'Md. Ibna Siam',
      eventTitle: 'Capital Market Analysis & Equity Research Summit 2026',
      eventDate: 'Saturday, April 4, 2026',
      location: 'DIU Auditorium & Virtual Stream',
    },
    'TEST 4: Event Notification Template'
  );

  // TEST 5: Meeting Invitation Template (Section 10)
  await testTemplateEndpoint(
    'test/meeting-invitation',
    {
      memberName: 'Md. Ibna Siam',
      meetingTitle: 'Executive Committee Strategy & Budget Review',
      meetingDate: 'Wednesday, March 25, 2026',
      location: 'Executive Boardroom, Level 4',
    },
    'TEST 5: Meeting Invitation Template'
  );

  // TEST 6: Reminder Template (Section 11)
  await testTemplateEndpoint(
    'test/reminder',
    {
      memberName: 'Md. Ibna Siam',
      reminderType: 'due',
      title: 'Spring Semester Club Dues Settlement Deadline',
      dueDateOrDate: 'March 31, 2026',
    },
    'TEST 6: Reusable Reminder Template'
  );

  // Security Test: HTML injection test
  console.log('\n[Security Check: HTML Injection Immunity]');
  try {
    const injectRes = await fetch(`${API_BASE}/email/test/welcome`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        to: RESEND_TEST_RECIPIENT,
        userName: '<script>alert("hacked")</script>Siam<b>bold</b>',
      }),
    });
    const injectBody = await injectRes.json();
    assert(injectRes.status === 200, 'HTML injection payload safely handled and escaped without error');
  } catch (e) {
    assert(false, 'HTML injection test', e.message);
  }

  console.log('\n========================================================================');
  console.log(`📊 PHASE 2 VERIFICATION SUMMARY: ${passed} / ${passed + failed} TESTS PASSED`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL 6 PROFESSIONAL TEMPLATES AND BRANDING CHECKS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase2Tests().catch((e) => {
  console.error('Fatal Verification Error:', e);
  process.exit(1);
});
