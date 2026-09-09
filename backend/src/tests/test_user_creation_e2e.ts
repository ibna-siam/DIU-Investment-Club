import { getDbAdmin } from '../config/supabase';

async function runUserCreationE2ETests() {
  console.log('=== STARTING COMPLETE USER CREATION E2E TEST SUITE ===');
  const API_BASE = 'http://localhost:5000/api/v1';
  const supabase = getDbAdmin();

  // 0. Authenticate as Super Admin
  console.log('\n[AUTH] Logging in as Super Admin (admin@diu.edu.bd)...');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@diu.edu.bd', password: 'Password123!' })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.data?.token) {
    throw new Error('Super Admin login failed: ' + JSON.stringify(adminLoginData));
  }
  const adminToken = adminLoginData.data.token;
  console.log('✓ Super Admin authenticated.');

  // Fetch available roles to get a target role (e.g. TREASURER or GENERAL_SECRETARY)
  const rolesRes = await fetch(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const rolesData = await rolesRes.json();
  const targetRole = rolesData.data.find((r: any) => r.slug === 'GENERAL_SECRETARY') || rolesData.data[0];
  console.log(`✓ Target role selected for test: ${targetRole.name} (${targetRole.id})`);

  const testEmail = `new_club_officer_${Date.now()}@diu.edu.bd`;
  const testPassword = 'SecureOfficerPass123!';
  const testStudentId = `STU-OFFICER-${Date.now().toString().slice(-5)}`;
  const testFullName = 'Executive Officer Tanvir';
  const testPhone = '01711889900';

  let createdUserId = '';

  // TEST 1: Admin clicks Add User / submits valid user
  console.log('\n--- TEST 1: Create New User via API (POST /api/v1/users) ---');
  const createRes = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: testFullName,
      email: testEmail,
      password: testPassword,
      student_id: testStudentId,
      phone: testPhone,
      role_id: targetRole.id,
      status: 'active'
    })
  });
  const createData = await createRes.json();
  console.log('Create response status:', createRes.status);
  console.log('Create response body:', JSON.stringify(createData, null, 2));

  if (!createRes.ok || !createData.success || !createData.data?.id) {
    throw new Error('TEST 1 FAILED: User creation returned error: ' + JSON.stringify(createData));
  }
  createdUserId = createData.data.id;
  console.log(`✓ TEST 1 PASS: User created with ID: ${createdUserId}`);

  // TEST 2: Verify Supabase Auth user exists
  console.log('\n--- TEST 2: Verify Supabase Auth user exists in auth.users ---');
  const { data: authUser, error: authErr } = await supabase
    .from('profiles') // Check DB connection first
    .select('*')
    .eq('id', createdUserId);

  const authCheckRes = await supabase.rpc('get_user_by_id', { p_user_id: createdUserId });
  console.log('User from get_user_by_id RPC:', authCheckRes.data?.email);

  if (authCheckRes.data?.email !== testEmail.toLowerCase()) {
    throw new Error(`TEST 2 FAILED: Expected email ${testEmail}, got ${authCheckRes.data?.email}`);
  }
  console.log('✓ TEST 2 PASS: Supabase Auth user confirmed.');

  // TEST 3: Verify Application profile record exists
  console.log('\n--- TEST 3: Verify application profile record exists in public.profiles ---');
  const profile = authCheckRes.data;
  if (!profile || profile.full_name !== testFullName || profile.student_id !== testStudentId) {
    throw new Error('TEST 3 FAILED: Profile fields mismatch: ' + JSON.stringify(profile));
  }
  console.log(`✓ TEST 3 PASS: Profile exists with Name="${profile.full_name}", StudentID="${profile.student_id}", Status="${profile.status}".`);

  // TEST 4: Verify correct role assigned
  console.log('\n--- TEST 4: Verify correct role assigned in user_roles ---');
  const assignedRoles = profile.roles || [];
  const hasTargetRole = assignedRoles.some((r: any) => r.id === targetRole.id || r.slug === targetRole.slug);
  if (!hasTargetRole) {
    throw new Error(`TEST 4 FAILED: Target role ${targetRole.slug} was not assigned. Roles found: ${JSON.stringify(assignedRoles)}`);
  }
  console.log(`✓ TEST 4 PASS: Role ${targetRole.name} successfully assigned.`);

  // TEST 5: Verify new user appears in User Management list
  console.log('\n--- TEST 5: Verify new user appears in User Management list (GET /api/v1/users) ---');
  const listRes = await fetch(`${API_BASE}/users?search=${encodeURIComponent(testEmail)}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const listData = await listRes.json();
  const foundInList = listData.data.find((u: any) => u.id === createdUserId);
  if (!foundInList) {
    throw new Error('TEST 5 FAILED: New user does not appear in user list.');
  }
  console.log(`✓ TEST 5 PASS: User found in User Management list (Total users in list: ${listData.total})`);

  // TEST 6: Verify new user can activate / login with credentials
  console.log('\n--- TEST 6: Verify new user can login (POST /api/v1/auth/login) ---');
  const userLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const userLoginData = await userLoginRes.json();
  if (!userLoginRes.ok || !userLoginData.data?.token) {
    throw new Error('TEST 6 FAILED: New user login failed: ' + JSON.stringify(userLoginData));
  }
  console.log('✓ TEST 6 PASS: New user successfully logged in! JWT token issued.');
  console.log(`   User permissions granted: ${userLoginData.data.user.permissions?.length} permissions`);

  // TEST 7: Attempt duplicate email
  console.log('\n--- TEST 7: Attempt duplicate email creation ---');
  const dupRes = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: 'Duplicate Officer',
      email: testEmail, // same email
      password: 'SomePassword123!',
    })
  });
  const dupData = await dupRes.json();
  console.log('Duplicate test response status:', dupRes.status);
  console.log('Duplicate test error message:', dupData.error?.message);
  if (dupRes.status !== 400 || !dupData.error?.message?.includes('already exists')) {
    throw new Error('TEST 7 FAILED: Duplicate email was not properly rejected: ' + JSON.stringify(dupData));
  }
  console.log('✓ TEST 7 PASS: Duplicate email rejected with clear error message.');

  // TEST 8: Unauthorized user attempts user creation
  console.log('\n--- TEST 8: Unauthorized user attempts user creation ---');
  // Use the newly created user's token (General Secretary does not have users.create permission)
  const newUserToken = userLoginData.data.token;
  const unauthRes = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${newUserToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: 'Illegal User Creation',
      email: 'illegal@diu.edu.bd',
      password: 'SomePassword123!',
    })
  });
  const unauthData = await unauthRes.json();
  console.log('Unauthorized test status:', unauthRes.status);
  console.log('Unauthorized error code:', unauthData.error?.code);
  if (unauthRes.status !== 403) {
    throw new Error('TEST 8 FAILED: Unauthorized user creation was not blocked with 403 Forbidden.');
  }
  console.log('✓ TEST 8 PASS: Unauthorized user blocked with 403 Forbidden (PERMISSION_DENIED).');

  // CLEANUP: Clean up test user so system remains production clean
  console.log('\n[CLEANUP] Removing test officer user...');
  await supabase.rpc('admin_delete_user', { p_user_id: createdUserId });
  console.log('✓ Test user cleaned up.');

  console.log('\n=====================================================');
  console.log('ALL 8 END-TO-END VERIFICATION TESTS PASSED (100% PASS)');
  console.log('=====================================================');
}

runUserCreationE2ETests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ E2E TEST FAILED:', err.message);
    process.exit(1);
  });
