const BASE_URL = 'http://localhost:5000/api/v1';

interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: Headers;
}

async function apiRequest<T = any>(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    status: res.status,
    data,
    headers: res.headers,
  };
}

async function runRbacVerification() {
  console.log('\n=============================================================');
  console.log('🛡️  STARTING ENTERPRISE RBAC & ADMIN CONTROL VERIFICATION SUITE');
  console.log('=============================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failCount++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Super Admin Access & Control
    // -------------------------------------------------------------
    console.log('📋 SECTION 1: SUPER ADMIN PERMISSIONS & OPERATIONAL DATA CONTROL');
    const adminLogin = await apiRequest('/auth/login', 'POST', {
      email: 'admin@diu.edu.bd',
      password: 'Admin12345!',
    });
    const adminToken = adminLogin.data?.data?.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    assert(adminLogin.status === 200 && !!adminToken, 'Super Admin logs in successfully');

    // 1.1 Users Management
    const adminUsers = await apiRequest('/users', 'GET', undefined, adminHeaders);
    assert(adminUsers.status === 200 && adminUsers.data.success, 'Super Admin can access User Management (/users)');

    // 1.2 Roles & Permissions Management
    const adminRoles = await apiRequest('/roles', 'GET', undefined, adminHeaders);
    assert(adminRoles.status === 200 && adminRoles.data.success, 'Super Admin can access Roles & Permissions (/roles)');

    // 1.3 System Settings Read
    const settingsRes = await apiRequest('/settings', 'GET', undefined, adminHeaders);
    assert(settingsRes.status === 200 && settingsRes.data.success, 'Super Admin can read System Settings (/settings)');

    // 1.4 System Settings Update (Operational Data in DB)
    const updateSettingsRes = await apiRequest(
      '/settings',
      'PATCH',
      {
        club_name: 'DIU Investment Club (Verified)',
        single_approval_threshold: 7500,
      },
      adminHeaders
    );
    assert(
      updateSettingsRes.status === 200 && updateSettingsRes.data.success,
      'Super Admin can update operational configurations without modifying code'
    );

    // Verify change persisted
    const verifySettings = await apiRequest('/settings?format=flat', 'GET', undefined, adminHeaders);
    console.log('    [DEBUG] verifySettings payload:', JSON.stringify(verifySettings.data?.data));
    assert(
      verifySettings.data?.data?.club_name === 'DIU Investment Club (Verified)' &&
        (verifySettings.data?.data?.single_approval_threshold === 7500 ||
         verifySettings.data?.data?.single_approval_threshold === '7500' ||
         Number(verifySettings.data?.data?.single_approval_threshold) === 7500),
      'Updated configuration persisted to public.system_settings in Supabase'
    );

    // Reset back
    await apiRequest(
      '/settings',
      'PATCH',
      {
        club_name: 'DIU Investment Club',
        single_approval_threshold: 5000,
      },
      adminHeaders
    );

    // -------------------------------------------------------------
    // TEST 2: Treasurer Role Comprehensive Audit & "Record Expense" Fix
    // -------------------------------------------------------------
    console.log('\n📋 SECTION 2: TREASURER ROLE OPERATIONS & ACCESS ENFORCEMENT');
    const treasurerLogin = await apiRequest('/auth/login', 'POST', {
      email: 'treasurer@diu.edu.bd',
      password: 'Admin12345!',
    });
    const treasurerToken = treasurerLogin.data?.data?.token;
    const treasurerUser = treasurerLogin.data?.data?.user;
    const treasurerHeaders = { Authorization: `Bearer ${treasurerToken}` };

    assert(treasurerLogin.status === 200 && !!treasurerToken, 'Treasurer logs in successfully');
    assert(
      treasurerUser?.roles?.some((r: any) => r.slug === 'TREASURER'),
      'Treasurer has verified TREASURER role'
    );

    // 2.1 Verify Treasurer has expenses.create permission in permission set
    const hasExpenseCreate =
      treasurerUser?.permissions?.includes('expenses.create') ||
      treasurerUser?.permissions?.includes('expense.create') ||
      treasurerUser?.permissions?.includes('expenses.manage');
    assert(hasExpenseCreate, "Treasurer permission set contains 'expenses.create'");

    // 2.2 Verify Treasurer can GET /expenses (previously failing with 403!)
    const treasurerExpenses = await apiRequest('/expenses', 'GET', undefined, treasurerHeaders);
    assert(
      treasurerExpenses.status === 200 && treasurerExpenses.data.success,
      'Treasurer can view Expense Records (/expenses) - 403 Bug Resolved'
    );

    // 2.3 Verify Treasurer Financial Accounts & Transactions access
    const treasurerAccounts = await apiRequest('/accounts', 'GET', undefined, treasurerHeaders);
    assert(treasurerAccounts.status === 200, 'Treasurer can access Financial Accounts (/accounts)');

    const treasurerCategories = await apiRequest('/expense-categories', 'GET', undefined, treasurerHeaders);
    const validAccountId = treasurerAccounts.data?.data?.[0]?.id || treasurerAccounts.data?.[0]?.id;
    const validCatId = treasurerCategories.data?.data?.[0]?.id || treasurerCategories.data?.[0]?.id;

    // 2.4 Verify Treasurer can POST /expenses (Record Expense authorization)
    const newExpense = {
      expense_date: new Date().toISOString().split('T')[0],
      category_id: validCatId,
      amount: 1500,
      paid_to: 'Authorized Campus Vendor Ltd',
      financial_account_id: validAccountId,
      description: 'Audit test expense to verify Treasurer create permission',
      payment_method: 'CASH',
    };
    const createExpenseRes = await apiRequest('/expenses', 'POST', newExpense, treasurerHeaders);
    assert(
      createExpenseRes.status === 201 && createExpenseRes.data.success,
      'Treasurer can create new Expense Record (Record Expense button & backend authorized)'
    );

    const treasurerTransactions = await apiRequest('/transactions', 'GET', undefined, treasurerHeaders);
    assert(treasurerTransactions.status === 200, 'Treasurer can access Transactions Ledger (/transactions)');

    const treasurerCashFlow = await apiRequest('/cash-flow', 'GET', undefined, treasurerHeaders);
    assert(treasurerCashFlow.status === 200, 'Treasurer can access Cash Flow (/cash-flow)');

    // 2.5 Verify Treasurer CANNOT access restricted Super Admin endpoints (Least Privilege)
    const treasurerUsers = await apiRequest('/users', 'GET', undefined, treasurerHeaders);
    assert(treasurerUsers.status === 403, 'Treasurer is BLOCKED (403 Forbidden) from accessing User Management');

    const treasurerRoles = await apiRequest('/roles', 'GET', undefined, treasurerHeaders);
    assert(treasurerRoles.status === 403, 'Treasurer is BLOCKED (403 Forbidden) from accessing Role Management');

    const treasurerSettings = await apiRequest('/settings', 'PATCH', { club_name: 'Hacked Club Name' }, treasurerHeaders);
    assert(treasurerSettings.status === 403, 'Treasurer is BLOCKED (403 Forbidden) from modifying System Settings');

    // -------------------------------------------------------------
    // TEST 3: Auditor Role (Finance Read-Only)
    // -------------------------------------------------------------
    console.log('\n📋 SECTION 3: AUDITOR ROLE (LEAST PRIVILEGE READ-ONLY)');
    const auditorLogin = await apiRequest('/auth/login', 'POST', {
      email: 'auditor@diu.edu.bd',
      password: 'Admin12345!',
    });
    const auditorToken = auditorLogin.data?.data?.token;
    const auditorHeaders = { Authorization: `Bearer ${auditorToken}` };

    assert(auditorLogin.status === 200 && !!auditorToken, 'Auditor logs in successfully');

    // Auditor can view accounts and audit logs
    const auditorAccounts = await apiRequest('/accounts', 'GET', undefined, auditorHeaders);
    assert(auditorAccounts.status === 200, 'Auditor can read Financial Accounts');

    const auditorAuditLogs = await apiRequest('/audit-logs', 'GET', undefined, auditorHeaders);
    assert(auditorAuditLogs.status === 200, 'Auditor can read Audit Trail (/audit-logs)');

    // Auditor cannot create expenses
    const auditorExpenseCreate = await apiRequest(
      '/expenses',
      'POST',
      { title: 'Illegal Expense', amount: 500, expense_date: '2026-09-07' },
      auditorHeaders
    );
    assert(auditorExpenseCreate.status === 403, 'Auditor is BLOCKED (403 Forbidden) from creating Expenses');

    // -------------------------------------------------------------
    // TEST 4: User-Specific Permission Overrides (Section 13)
    // -------------------------------------------------------------
    console.log('\n📋 SECTION 4: USER-SPECIFIC PERMISSION OVERRIDES (DATABASE BACKED)');
    // Find a permission to grant (e.g. audit.export or reports.export)
    const permsRes = await apiRequest('/permissions', 'GET', undefined, adminHeaders);
    const allPerms = permsRes.data?.data || [];
    const auditExportPerm = allPerms.find((p: any) => p.module === 'audit' && p.action === 'export') || allPerms[0];

    if (auditExportPerm && treasurerUser?.id) {
      // Super Admin grants override to treasurerUser.id
      const grantRes = await apiRequest(
        `/users/${treasurerUser.id}/permissions`,
        'POST',
        { permission_id: auditExportPerm.id },
        adminHeaders
      );
      assert(grantRes.status === 200 && grantRes.data.success, 'Super Admin granted user-specific permission override');

      // Check user permissions endpoint
      const checkUserPerms = await apiRequest(`/users/${treasurerUser.id}/permissions`, 'GET', undefined, adminHeaders);
      const hasDirect = checkUserPerms.data?.data?.direct?.some((p: any) => p.id === auditExportPerm.id);
      assert(hasDirect, 'User-specific override appears in direct user permissions');

      // Clean up override
      const revokeRes = await apiRequest(
        `/users/${treasurerUser.id}/permissions/${auditExportPerm.id}`,
        'DELETE',
        undefined,
        adminHeaders
      );
      assert(revokeRes.status === 200 && revokeRes.data.success, 'Super Admin revoked user-specific permission override');
    }

    console.log('\n=============================================================');
    console.log(`🎉 RBAC & ADMIN CONTROL VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('=============================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err.message);
    process.exit(1);
  }
}

runRbacVerification();
