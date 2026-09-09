export {};

const BASE_URL = 'http://localhost:5000/api/v1';

async function req(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(json?.message || json?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    err.response = { status: res.status, data: json };
    throw err;
  }
  return { status: res.status, data: json };
}

async function runPhase9Verification() {
  console.log('=============================================================================');
  console.log('🚀 DIU INVESTMENT CLUB - PHASE 9 AUTOMATION & SMART WORKFLOW TEST SUITE');
  console.log('=============================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  }

  try {
    // 1. Authenticate as Super Admin
    console.log('[1/9] Authenticating Admin user (admin@diu.edu.bd)...');
    const loginRes = await req('POST', '/auth/login', {
      email: 'admin@diu.edu.bd',
      password: 'Admin12345!',
    });

    assert(loginRes.status === 200 && !!loginRes.data.data.token, 'Super Admin login successful');
    const token = loginRes.data.data.token;
    console.log(`   Admin authenticated: ${loginRes.data.data.user.full_name}\n`);

    // 2. Health check
    console.log('[2/9] Checking API health & system phase...');
    const healthRes = await req('GET', '/health');
    assert(
      healthRes.status === 200 && healthRes.data.phase.includes('Phase 9'),
      'API confirms running Phase 9: Advanced Automation & Smart Workflow System'
    );

    // 3. Automation Metrics
    console.log('\n[3/9] Testing Automation Dashboard Metrics...');
    const metricsRes = await req('GET', '/automation/metrics', undefined, token);
    assert(
      metricsRes.status === 200 && metricsRes.data.data.total_rules_count >= 5,
      `Retrieved automation metrics (${metricsRes.data.data.active_rules_count} active rules, ${metricsRes.data.data.total_rules_count} total)`
    );

    // 4. Automation Rules Management (Create, Pause, Reactivate)
    console.log('\n[4/9] Testing Automation Rules Management (CRUD & State Transitions)...');
    const rulesRes = await req('GET', '/automation/rules', undefined, token);
    assert(rulesRes.status === 200 && Array.isArray(rulesRes.data.data), 'Retrieved seeded automation rules');

    // Create a new rule
    const newRuleRes = await req(
      'POST',
      '/automation/rules',
      {
        name: 'Automated Test Warning Rule',
        description: 'Testing rule creation and condition evaluation',
        trigger_type: 'TASK_DUE_SOON',
        conditions: [{ field: 'days_before_due', operator: 'LESS_THAN_OR_EQUAL', value: 3 }],
        actions: [{ type: 'CREATE_NOTIFICATION', target: 'ROLE:Treasurer', message: 'Test notification' }],
        status: 'ACTIVE',
      },
      token
    );
    assert(newRuleRes.status === 201 && newRuleRes.data.data.id, 'Created new custom automation rule');
    const testRuleId = newRuleRes.data.data.id;

    // Pause rule
    const pauseRes = await req(
      'PATCH',
      `/automation/rules/${testRuleId}/status`,
      { status: 'PAUSED' },
      token
    );
    assert(pauseRes.data.data.status === 'PAUSED', 'Successfully paused automation rule');

    // Reactivate rule
    const activateRes = await req(
      'PATCH',
      `/automation/rules/${testRuleId}/status`,
      { status: 'ACTIVE' },
      token
    );
    assert(activateRes.data.data.status === 'ACTIVE', 'Successfully reactivated automation rule');

    // 5. Execute Automation Runner & Audit Logs
    console.log('\n[5/9] Testing Server Automation Runner & Audit Logging...');
    const runnerRes = await req('POST', '/automation/execute-runner', {}, token);
    assert(
      runnerRes.status === 200 && runnerRes.data.data.rules !== undefined,
      `Executed automation runner cycle (${runnerRes.data.data.rules.evaluated} rules evaluated, ${runnerRes.data.data.rules.executed} actions executed)`
    );

    const logsRes = await req('GET', '/automation/logs', undefined, token);
    assert(
      logsRes.status === 200 && Array.isArray(logsRes.data.data),
      `Retrieved automation execution logs (${logsRes.data.data.length} logs recorded)`
    );

    // 6. Recurring Transactions & Financial Safety Gates
    console.log('\n[6/9] Testing Recurring Operations & Strict Financial Safety Gates...');
    const accountsRes = await req('GET', '/accounts?status=ACTIVE', undefined, token);
    const sourceAccount = accountsRes.data.data[0];

    const expCategoriesRes = await req('GET', '/expense-categories?limit=1', undefined, token);
    const expCategoryId = expCategoriesRes.data.data[0]?.id;

    const recurringTxRes = await req(
      'POST',
      '/recurring-operations/transactions',
      {
        name: 'Monthly Cloud Infrastructure Hosting Fee',
        transaction_type: 'EXPENSE',
        amount: 2500,
        category_id: expCategoryId,
        source_account_id: sourceAccount.id,
        frequency: 'MONTHLY',
        start_date: new Date().toISOString().split('T')[0],
        next_execution_date: new Date().toISOString().split('T')[0],
        auto_submit_for_approval: true,
        description: 'Automated recurring server maintenance bill',
      },
      token
    );
    assert(recurringTxRes.status === 201 && recurringTxRes.data.data.id, 'Created recurring expense transaction template');

    // Process due transactions
    const processTxRes = await req('POST', '/recurring-operations/transactions/process-due', {}, token);
    assert(
      processTxRes.status === 200 && processTxRes.data.data.generated >= 1,
      `Generated ${processTxRes.data.data.generated} recurring transaction(s)`
    );

    // STRICT SAFETY CHECK: Verify expense was created with status = 'PENDING_APPROVAL'
    const pendingExpensesRes = await req('GET', '/expenses?status=PENDING_APPROVAL', undefined, token);
    const generatedExpense = (pendingExpensesRes.data.data || []).find((e: any) =>
      e.description && e.description.includes('Monthly Cloud Infrastructure Hosting Fee')
    );
    assert(
      !!generatedExpense && generatedExpense.status === 'PENDING_APPROVAL',
      'STRICT SAFETY GATE VERIFIED: Recurring transaction generated strictly in PENDING_APPROVAL status (NOT posted to GL, NOT auto-approved)'
    );

    // 7. Recurring Operational Tasks
    console.log('\n[7/9] Testing Recurring Operational Tasks Template & Generation...');
    const recurringTaskRes = await req(
      'POST',
      '/recurring-operations/tasks',
      {
        title: 'Weekly Cash Vault Reconciliation',
        description: 'Physical cash balance verification against digital ledger balance',
        priority: 'HIGH',
        frequency: 'WEEKLY',
        due_date_days_offset: 3,
        start_date: new Date().toISOString().split('T')[0],
        next_execution_date: new Date().toISOString().split('T')[0],
      },
      token
    );
    assert(recurringTaskRes.status === 201 && recurringTaskRes.data.data.id, 'Created recurring task template');

    const processTasksRes = await req('POST', '/recurring-operations/tasks/process-due', {}, token);
    assert(
      processTasksRes.status === 200 && processTasksRes.data.data.generated >= 1,
      `Generated ${processTasksRes.data.data.generated} task(s) from recurring template`
    );

    // 8. Smart Reminders & Overdue Detection
    console.log('\n[8/9] Testing Smart Reminders & Overdue Sweeps...');
    const newReminderRes = await req(
      'POST',
      '/reminders',
      {
        title: 'Month-End Financial Audit Preparation',
        reminder_type: 'PERIOD_CLOSING',
        target_date: new Date().toISOString().split('T')[0],
        schedule_offset_days: 0,
        scheduled_at: new Date(Date.now() - 1000).toISOString(),
        recipient_role: 'Treasurer',
        message: 'Please review all pending vouchers before period closure.',
      },
      token
    );
    assert(newReminderRes.status === 201 && newReminderRes.data.data.id, 'Created smart reminder');

    const processDueRemRes = await req('POST', '/reminders/process-due', {}, token);
    assert(
      processDueRemRes.status === 200 && processDueRemRes.data.data.sent >= 1,
      `Processed and dispatched ${processDueRemRes.data.data.sent} due reminder(s)`
    );

    const overdueSweepRes = await req('POST', '/reminders/overdue-sweep', {}, token);
    assert(
      overdueSweepRes.status === 200 && overdueSweepRes.data.data.alerts_created !== undefined,
      `Executed overdue sweep (Overdue tasks: ${overdueSweepRes.data.data.overdue_tasks}, Dues: ${overdueSweepRes.data.data.overdue_dues}, Escalations: ${overdueSweepRes.data.data.pending_escalations})`
    );

    // 9. Month-End Closing Workflow & Auto-Verification
    console.log('\n[9/9] Testing Month-End Closing Workflow & Multi-Point Auto-Verification...');
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthEndRes = await req('GET', `/month-end/current?month_year=${currentMonth}`, undefined, token);
    assert(
      monthEndRes.status === 200 && monthEndRes.data.data.items.length === 8,
      `Loaded Month-End Checklist for ${currentMonth} with all 8 standard verification items`
    );
    const checklistId = monthEndRes.data.data.id;

    // Run auto-verification routine
    const verifyChecklistRes = await req('POST', `/month-end/${checklistId}/verify`, {}, token);
    assert(
      verifyChecklistRes.status === 200 && Array.isArray(verifyChecklistRes.data.data),
      'Executed Month-End automated multi-point verification routines across database'
    );

    // Toggle checklist item
    const firstItem = verifyChecklistRes.data.data[0];
    const toggleItemRes = await req(
      'PATCH',
      `/month-end/${checklistId}/items/${firstItem.id}`,
      { is_completed: true, notes: 'Verified by Super Admin' },
      token
    );
    assert(
      toggleItemRes.status === 200 && toggleItemRes.data.data.is_completed === true,
      'Signed off checklist item successfully'
    );

    // Cleanup test rule
    await req('DELETE', `/automation/rules/${testRuleId}`, undefined, token);
    console.log('   Cleaned up test automation rule.\n');

    console.log('=============================================================================');
    console.log(`🎉 PHASE 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Test execution failure:', err.response?.data || err.message);
    process.exit(1);
  }
}

runPhase9Verification();
