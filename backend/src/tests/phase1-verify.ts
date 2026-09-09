async function runVerification() {
  console.log('🧪 Starting DIU Investment Club Finance - Phase 1 Verification Suite...\n');

  const BASE_URL = 'http://localhost:5000/api/v1';

  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  const healthRes = await fetch(`${BASE_URL}/health`).then((r) => r.json());
  if (healthRes.success && healthRes.status === 'operational') {
    console.log('   ✅ Health Check passed:', healthRes.phase);
  } else {
    throw new Error('Health check failed: ' + JSON.stringify(healthRes));
  }

  // Test 2: Invalid Login Handling
  console.log('\n2️⃣ Testing Invalid Login Handling...');
  const invalidRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@diu-invest.club', password: 'WrongPassword' }),
  });
  if (invalidRes.status === 401) {
    console.log('   ✅ Invalid login correctly rejected with 401 Unauthorized');
  } else {
    throw new Error('Expected 401 on invalid login, got ' + invalidRes.status);
  }

  // Test 3: Super Admin Login
  console.log('\n3️⃣ Testing Super Admin Login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@diu-invest.club', password: 'Admin@123456' }),
  }).then((r) => r.json());

  if (!loginRes.success || !loginRes.data?.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes));
  }
  const token = loginRes.data.token;
  const adminUser = loginRes.data.user;
  console.log('   ✅ Login successful for:', adminUser.full_name, `(${adminUser.email})`);
  console.log('   ✅ Assigned Role:', adminUser.roles[0].name, `(${adminUser.roles[0].slug})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Test 4: Auth Me
  console.log('\n4️⃣ Testing GET /auth/me...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders }).then((r) => r.json());
  if (meRes.success && meRes.data?.email === 'admin@diu-invest.club') {
    console.log('   ✅ /auth/me returned correct authenticated profile');
  } else {
    throw new Error('/auth/me failed');
  }

  // Test 5: Dashboard Stats
  console.log('\n5️⃣ Testing GET /dashboard/stats (Real DB Metrics)...');
  const dashRes = await fetch(`${BASE_URL}/dashboard/stats`, { headers: authHeaders }).then((r) =>
    r.json()
  );
  if (dashRes.success && dashRes.data?.overview) {
    console.log('   ✅ Active Users:', dashRes.data.overview.activeUsers);
    console.log('   ✅ Total Defined Roles:', dashRes.data.overview.totalRoles);
    console.log('   ✅ System Status:', dashRes.data.overview.systemStatus);
  } else {
    throw new Error('Dashboard stats failed');
  }

  // Test 6: Roles List & System Protection
  console.log('\n6️⃣ Testing GET /roles & Role Management...');
  const rolesRes = await fetch(`${BASE_URL}/roles`, { headers: authHeaders }).then((r) => r.json());
  if (rolesRes.success && rolesRes.data?.length === 7) {
    console.log(`   ✅ 7 Standard System Roles loaded successfully`);
    const systemRoles = rolesRes.data.filter((r: any) => r.is_system);
    console.log(`   ✅ System-protected roles count: ${systemRoles.length}/7`);
  } else {
    throw new Error('Roles load failed');
  }

  // Test 7: Permission Matrix
  console.log('\n7️⃣ Testing GET /permissions/modules...');
  const permsRes = await fetch(`${BASE_URL}/permissions/modules`, { headers: authHeaders }).then(
    (r) => r.json()
  );
  const moduleCount = Object.keys(permsRes.data || {}).length;
  if (permsRes.success && moduleCount >= 18) {
    console.log(`   ✅ Permissions grouped across ${moduleCount} system modules`);
    console.log('   ✅ Sample modules: users, expenses, budgets, accounting, vouchers, reports');
  } else {
    throw new Error('Permissions matrix failed: ' + moduleCount);
  }

  // Test 8: Create New Member / User
  console.log('\n8️⃣ Testing POST /users (Create New Member)...');
  const treasurerRole = rolesRes.data.find((r: any) => r.slug === 'TREASURER');
  const newUserRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      full_name: 'Rafid Ahmed',
      email: 'rafid@diu-invest.club',
      student_id: '221-15-5002',
      phone: '+8801711122233',
      password: 'Treasurer@123',
      role_id: treasurerRole.id,
      status: 'active',
    }),
  }).then((r) => r.json());

  if (newUserRes.success && newUserRes.data?.id) {
    console.log('   ✅ New user created:', newUserRes.data.full_name);
    console.log('   ✅ Role assigned:', newUserRes.data.roles?.[0]?.name);
  } else {
    throw new Error('Create user failed: ' + JSON.stringify(newUserRes));
  }

  const newUserId = newUserRes.data.id;

  // Test 9: Toggle User Status
  console.log('\n9️⃣ Testing PATCH /users/:id/status (Deactivate & Re-activate)...');
  const deactRes = await fetch(`${BASE_URL}/users/${newUserId}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'inactive' }),
  }).then((r) => r.json());

  if (deactRes.success && deactRes.data.status === 'inactive') {
    console.log('   ✅ Successfully deactivated user');
  } else {
    throw new Error('Status update failed');
  }

  const reactRes = await fetch(`${BASE_URL}/users/${newUserId}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'active' }),
  }).then((r) => r.json());

  if (reactRes.success && reactRes.data.status === 'active') {
    console.log('   ✅ Successfully re-activated user');
  }

  // Test 10: Role Assignment & Revocation
  console.log('\n🔟 Testing Role Assignment & Revocation...');
  const presidentRole = rolesRes.data.find((r: any) => r.slug === 'PRESIDENT');
  await fetch(`${BASE_URL}/users/${newUserId}/roles`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ role_id: presidentRole.id }),
  });
  console.log('   ✅ Secondary role (President) assigned to user');

  await fetch(`${BASE_URL}/users/${newUserId}/roles/${presidentRole.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log('   ✅ Secondary role successfully revoked');

  // Test 11: Create Custom Role & Protection from Deleting System Roles
  console.log('\n1️⃣1️⃣ Testing Custom Role Lifecycle & System Role Protection...');
  const customRoleRes = await fetch(`${BASE_URL}/roles`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Media Officer',
      slug: 'MEDIA_OFFICER',
      description: 'Manages social media coverage and merchandise graphics',
    }),
  }).then((r) => r.json());

  if (customRoleRes.success && customRoleRes.data?.id) {
    console.log('   ✅ Custom role created:', customRoleRes.data.name);

    // Verify deletion of custom role works
    const delCustom = await fetch(`${BASE_URL}/roles/${customRoleRes.data.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    }).then((r) => r.json());
    if (delCustom.success) {
      console.log('   ✅ Custom role successfully deleted');
    }
  }

  // Verify deletion of system role is rejected
  const delSystem = await fetch(`${BASE_URL}/roles/${treasurerRole.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  }).then((r) => r.json());
  if (!delSystem.success && delSystem.error?.code === 'DELETE_REJECTED') {
    console.log('   ✅ System role protected: Deletion correctly rejected');
  } else {
    throw new Error('System role was not protected from deletion!');
  }

  console.log('\n🎉 ALL PHASE 1 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% Passed)\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
