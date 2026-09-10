const path = require('path');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'DIU Investment Club <noreply@invesmentclub.top>';
const RESEND_TEST_RECIPIENT = process.env.RESEND_TEST_RECIPIENT || 'siamibna75@gmail.com';
const JWT_SECRET = process.env.JWT_SECRET || 'diu_investment_club_super_secure_secret_token_2026_key';
const API_BASE = 'http://localhost:5000/api/v1';

console.log('========================================================================');
console.log('📧 RESEND EMAIL INTEGRATION END-TO-END VERIFICATION');
console.log('========================================================================\n');

async function runVerification() {
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

  // 1. Check API Key presence
  console.log('[Step 1] API Key Security & Configuration Check');
  assert(Boolean(RESEND_API_KEY), 'RESEND_API_KEY is present in environment');
  assert(RESEND_API_KEY.startsWith('re_'), 'RESEND_API_KEY has valid prefix ("re_...")');
  assert(!RESEND_API_KEY.includes(' '), 'RESEND_API_KEY contains no spaces');

  // 2. Direct Resend SDK Test
  console.log('\n[Step 2] Direct Resend SDK Transmission');
  const resend = new Resend(RESEND_API_KEY);

  let messageId = null;
  let resendError = null;

  try {
    console.log(`  Attempting to send email via Resend:`);
    console.log(`  • From: ${RESEND_FROM_EMAIL}`);
    console.log(`  • To:   ${RESEND_TEST_RECIPIENT}`);

    const result = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [RESEND_TEST_RECIPIENT],
      subject: 'DIU Investment Club - Resend Integration Test Verification ✅',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0f172a; color: #e2e8f0; border-radius: 10px;">
          <h2 style="color: #10b981; margin-top: 0;">DIU Investment Club - ERP & Financial Management</h2>
          <p>This is a real end-to-end verification test sent via the official <strong>Resend Node.js SDK</strong>.</p>
          <hr style="border: 1px solid #1e293b; margin: 16px 0;" />
          <ul style="line-height: 1.8;">
            <li><strong>Service:</strong> Resend API</li>
            <li><strong>From:</strong> ${RESEND_FROM_EMAIL}</li>
            <li><strong>To:</strong> ${RESEND_TEST_RECIPIENT}</li>
            <li><strong>Status:</strong> Initial Integration Completed</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">Daffodil International University • DIU Investment Club</p>
        </div>
      `,
      text: `DIU Investment Club - Resend Integration Test Verification\n\nThis is a real end-to-end verification test sent via the official Resend Node.js SDK.\nTimestamp: ${new Date().toISOString()}`,
    });

    if (result.error) {
      resendError = result.error;
      console.error('  Resend returned error:', result.error);
    } else if (result.data) {
      messageId = result.data.id;
      console.log(`  Resend transmission successful! Message ID: ${messageId}`);
    }
  } catch (err) {
    resendError = err;
    console.error('  Exception while calling Resend:', err.message);
  }

  assert(Boolean(messageId) && !resendError, `Test email dispatched successfully through Resend API (Message ID: ${messageId || 'None'})`, resendError ? JSON.stringify(resendError) : '');

  // 3. Test Live Backend Endpoint: /api/v1/email/status
  console.log('\n[Step 3] Live Backend API Endpoint Verification');
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

  // Status check
  try {
    const statusRes = await fetch(`${API_BASE}/email/status`, { headers: authHeaders });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, 'GET /api/v1/email/status returns 200 OK');
    assert(statusData.data?.configured === true, 'GET /api/v1/email/status confirms Resend is configured');
    assert(!statusData.data?.apiKey && !JSON.stringify(statusData).includes(RESEND_API_KEY), 'Security: RESEND_API_KEY is NOT exposed in status response');
  } catch (err) {
    assert(false, 'GET /api/v1/email/status', err.message);
  }

  // Live Test dispatch via endpoint
  try {
    const testEndpointRes = await fetch(`${API_BASE}/email/test`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        to: RESEND_TEST_RECIPIENT,
        notes: 'Verification test triggered via backend REST endpoint',
      }),
    });
    const testEndpointData = await testEndpointRes.json();
    assert(testEndpointRes.status === 200, `POST /api/v1/email/test returns 200 OK (Message ID: ${testEndpointData.data?.messageId})`, testEndpointData.error?.message || '');
    assert(Boolean(testEndpointData.data?.messageId), 'POST /api/v1/email/test returned valid Resend messageId');
  } catch (err) {
    assert(false, 'POST /api/v1/email/test', err.message);
  }

  // 4. Test Invalid Recipient Validation
  console.log('\n[Step 4] Error Handling Validation');
  try {
    const badRes = await fetch(`${API_BASE}/email/test`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        to: 'not-an-email',
      }),
    });
    assert(badRes.status === 400, 'Invalid email recipient rejected with 400 Bad Request');
  } catch (err) {
    assert(false, 'Invalid email validation', err.message);
  }

  console.log('\n========================================================================');
  console.log(`📊 FINAL RESULT: ${passed} / ${passed + failed} TESTS PASSED`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL RESEND EMAIL INTEGRATION TESTS COMPLETED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error('Fatal Verification Error:', e);
  process.exit(1);
});
