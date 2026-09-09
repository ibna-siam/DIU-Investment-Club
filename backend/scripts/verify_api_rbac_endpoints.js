const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'diu_investment_club_super_secure_secret_token_2026_key';

// Helper to create test token
function generateToken(userId, email, role) {
  return jwt.sign(
    {
      id: userId,
      sub: userId,
      email,
      role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runApiTests() {
  console.log('========================================================================');
  console.log('🌐 DIU INVESTMENT CLUB: LIVE BACKEND API ENDPOINT RBAC ENFORCEMENT');
  console.log('========================================================================\n');

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

  // 1. Health check
  try {
    const healthRes = await fetch(`${API_BASE}/health`);
    assert(healthRes.ok, 'Backend API health check responds with 200 OK');
  } catch (err) {
    console.error('Backend server is not reachable on port 5000:', err.message);
    process.exit(1);
  }

  // 2. Unauthenticated requests to protected endpoints return 401
  const unauthRes = await fetch(`${API_BASE}/accounts`);
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/v1/accounts returns 401 UNAUTHORIZED');

  const unauthExpenses = await fetch(`${API_BASE}/expenses`);
  assert(unauthExpenses.status === 401, 'Unauthenticated GET /api/v1/expenses returns 401 UNAUTHORIZED');

  // 3. Test with Treasurer (Real User ID: 872cd4c3-ffde-46b2-81b4-5d3564eabb34)
  const treasurerToken = generateToken('872cd4c3-ffde-46b2-81b4-5d3564eabb34', '252-58-083@diu.edu.bd', 'Treasurer');
  const treasurerHeaders = {
    Authorization: `Bearer ${treasurerToken}`,
    'Content-Type': 'application/json',
  };

  // Treasurer CAN READ accounts
  const trReadAccounts = await fetch(`${API_BASE}/accounts`, { headers: treasurerHeaders });
  assert(trReadAccounts.status === 200, 'Treasurer can READ financial accounts (200 OK)');

  // Treasurer CAN READ expenses
  const trReadExpenses = await fetch(`${API_BASE}/expenses`, { headers: treasurerHeaders });
  assert(trReadExpenses.status === 200, 'Treasurer can READ expenses (200 OK)');

  // Treasurer CANNOT manage system roles (restricted to Super Admin)
  const trRoles = await fetch(`${API_BASE}/roles`, { headers: treasurerHeaders });
  assert(trRoles.status === 403 || trRoles.status === 401, 'Treasurer access to /api/v1/roles restricted (403 Forbidden)');

  // 4. Test with Super Admin (Real User ID: 0b891f78-263c-440e-bc98-9dd1bf7a8c27)
  const adminToken = generateToken('0b891f78-263c-440e-bc98-9dd1bf7a8c27', 'siamibna29@gmail.com', 'Super Admin');
  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  const adminReadUsers = await fetch(`${API_BASE}/users`, { headers: adminHeaders });
  assert(adminReadUsers.status === 200, 'Super Admin can access /api/v1/users (200 OK)');

  const adminReadRoles = await fetch(`${API_BASE}/roles`, { headers: adminHeaders });
  assert(adminReadRoles.status === 200, 'Super Admin can access /api/v1/roles (200 OK)');

  // 5. Test with President (Real User ID: a1111111-1111-1111-1111-111111111111)
  const presidentToken = generateToken('a1111111-1111-1111-1111-111111111111', 'admin@diu.edu.bd', 'President');
  const presidentHeaders = {
    Authorization: `Bearer ${presidentToken}`,
    'Content-Type': 'application/json',
  };

  const presReadApprovals = await fetch(`${API_BASE}/approvals`, { headers: presidentHeaders });
  const presBody = await presReadApprovals.json();
  assert(presReadApprovals.status === 200, 'President can access /api/v1/approvals (200 OK)', `${presReadApprovals.status}: ${JSON.stringify(presBody)}`);

  console.log('\n========================================================================');
  console.log(`📊 LIVE API RBAC RESULTS: ${passed} / ${passed + failed} TESTS PASSED`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('🎉 LIVE API RBAC SECURITY VERIFICATION PASSED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runApiTests().catch((e) => {
  console.error('API Verification error:', e);
  process.exit(1);
});
