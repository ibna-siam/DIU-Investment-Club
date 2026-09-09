import { supabaseClient } from '../config/supabase';

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
  return { status: res.status, data: json, ok: res.ok };
}

async function runPhase10Verification() {
  console.log('====================================================');
  console.log('PHASE 10: AUDIT, COMPLIANCE & INTEGRATIONS TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, details || '');
      failed++;
    }
  }

  try {
    // 0. Authenticate as Super Admin
    console.log('Step 0: Authenticating as Super Admin...');
    const loginRes = await req('POST', '/auth/login', {
      email: 'admin@diu.edu.bd',
      password: 'Admin12345!',
    });
    const token = loginRes.data?.data?.token;
    assert(!!token, 'Super Admin Login & JWT Issuance');

    // 1. Verify 13 Database Tables Exist
    console.log('\nStep 1: Database Schema Verification...');
    const tables = [
      'cash_reconciliations',
      'bank_reconciliations',
      'bank_reconciliation_items',
      'internal_control_rules',
      'compliance_checklists',
      'compliance_requirements',
      'financial_exceptions',
      'risk_flags',
      'communication_templates',
      'integration_configs',
      'integration_logs',
      'webhooks',
      'webhook_logs',
    ];

    for (const tbl of tables) {
      const { data, error } = await supabaseClient!.from(tbl).select('*').limit(1);
      assert(!error, `Table "public.${tbl}" exists and is accessible`);
    }

    // 2. Verify Permissions Seeded
    console.log('\nStep 2: Checking Phase 10 Permissions...');
    const { data: perms } = await supabaseClient!
      .from('permissions')
      .select('module, action')
      .in('module', ['audit', 'reconciliation', 'internal_controls', 'compliance', 'exceptions', 'risk_flags', 'communication_templates', 'integrations', 'webhooks']);
    assert((perms?.length || 0) >= 18, `Phase 10 Permissions Seeded (Found: ${perms?.length})`);

    // 3. Audit Logs API & Stats
    console.log('\nStep 3: Testing Audit Logs & Statistics API...');
    const logsRes = await req('GET', '/audit-logs?limit=5', undefined, token);
    assert(logsRes.status === 200 && Array.isArray(logsRes.data?.data), 'GET /api/v1/audit-logs returns log array');

    const statsRes = await req('GET', '/audit-logs/stats', undefined, token);
    assert(statsRes.status === 200 && statsRes.data?.data?.total_logs !== undefined, 'GET /api/v1/audit-logs/stats returns KPI stats');

    const reportRes = await req('GET', '/audit-logs/reports?type=FINANCIAL_CHANGES', undefined, token);
    assert(reportRes.status === 200 && Array.isArray(reportRes.data?.data), 'GET /api/v1/audit-logs/reports returns report records');

    // 4. Financial Cash Reconciliation
    console.log('\nStep 4: Testing Cash Reconciliation...');
    const cashAccsRes = await req('GET', '/reconciliation/cash/accounts', undefined, token);
    const cashAcc = cashAccsRes.data?.data?.[0];
    assert(cashAccsRes.status === 200 && !!cashAcc, 'GET /api/v1/reconciliation/cash/accounts returns active accounts');

    const cashRecRes = await req(
      'POST',
      '/reconciliation/cash',
      {
        account_id: cashAcc.id,
        physical_cash: Number(cashAcc.current_balance) + 500,
        notes: 'Verification test physical variance check',
      },
      token
    );
    assert(cashRecRes.status === 201 && cashRecRes.data?.data?.difference === 500, 'POST /api/v1/reconciliation/cash variance calculation (Difference = +500)');

    const cashListRes = await req('GET', '/reconciliation/cash', undefined, token);
    assert(cashListRes.status === 200 && cashListRes.data?.data?.length > 0, 'GET /api/v1/reconciliation/cash lists reconciliation records');

    // 5. Bank Reconciliation & Item Matching
    console.log('\nStep 5: Testing Bank Reconciliation & Matching...');
    const bankAccsRes = await req('GET', '/reconciliation/bank/accounts', undefined, token);
    const bankAcc = bankAccsRes.data?.data?.[0];
    assert(bankAccsRes.status === 200 && !!bankAcc, 'GET /api/v1/reconciliation/bank/accounts returns bank account');

    const bankRecRes = await req(
      'POST',
      '/reconciliation/bank',
      {
        account_id: bankAcc.id,
        period_start: '2026-09-01',
        period_end: '2026-09-30',
        statement_ending_balance: 50000,
        notes: 'September 2026 automated reconciliation test',
        items: [
          {
            statement_date: '2026-09-15',
            statement_description: 'Test Direct Bank Deposit',
            statement_reference: 'DEP-TEST-01',
            statement_amount: 15000,
          },
        ],
      },
      token
    );
    const recId = bankRecRes.data?.data?.id;
    assert(bankRecRes.status === 201 && !!recId, 'POST /api/v1/reconciliation/bank creates session');

    const getRecRes = await req('GET', `/reconciliation/bank/${recId}`, undefined, token);
    assert(getRecRes.status === 200 && getRecRes.data?.data?.items?.length > 0, 'GET /api/v1/reconciliation/bank/:id returns session with items');

    // 6. Internal Controls & SOD Conflict Engine
    console.log('\nStep 6: Testing Internal Controls & SOD Checks...');
    const rulesRes = await req('GET', '/internal-controls/rules', undefined, token);
    assert(rulesRes.status === 200 && rulesRes.data?.data?.length >= 3, 'GET /api/v1/internal-controls/rules returns baseline rules');

    // Test SOD Conflict: creator == approver
    const sodConflictRes = await req(
      'POST',
      '/internal-controls/check-sod',
      {
        requesterId: 'user_tester_99',
        actorId: 'user_tester_99',
        module: 'expenses',
      },
      token
    );
    assert(
      sodConflictRes.data?.data?.hasConflict === true && sodConflictRes.data?.data?.requiredAction === 'BLOCK',
      'SOD Conflict Engine: Creator == Approver blocked with requiredAction: BLOCK'
    );

    // Test SOD Non-Conflict: creator != approver
    const sodPassRes = await req(
      'POST',
      '/internal-controls/check-sod',
      {
        requesterId: 'user_tester_99',
        actorId: 'user_approver_88',
        module: 'expenses',
      },
      token
    );
    assert(sodPassRes.data?.data?.hasConflict === false, 'SOD Conflict Engine: Creator != Approver successfully allowed');

    // 7. Compliance Checklists & Requirements
    console.log('\nStep 7: Testing Compliance Checklists...');
    const compRes = await req('GET', '/compliance/checklists', undefined, token);
    const chk = compRes.data?.data?.[0];
    assert(compRes.status === 200 && !!chk, 'GET /api/v1/compliance/checklists returns active checklists');

    if (chk && chk.requirements?.length > 0) {
      const reqItem = chk.requirements[0];
      const updateReqRes = await req(
        'PATCH',
        `/compliance/requirements/${reqItem.id}`,
        { status: 'COMPLIANT', evidence_notes: 'Verified via automated audit suite test' },
        token
      );
      assert(updateReqRes.status === 200 && updateReqRes.data?.data?.status === 'COMPLIANT', 'PATCH /api/v1/compliance/requirements/:id updates status to COMPLIANT');
    }

    // 8. Financial Exceptions & Risk Flags
    console.log('\nStep 8: Testing Exceptions & Risk Flags...');
    const scanRes = await req('POST', '/exceptions-risk/exceptions/scan', {}, token);
    assert(scanRes.status === 200 && scanRes.data?.success === true, 'POST /api/v1/exceptions-risk/exceptions/scan executes system scan');

    const excRes = await req('GET', '/exceptions-risk/exceptions', undefined, token);
    assert(excRes.status === 200 && Array.isArray(excRes.data?.data), 'GET /api/v1/exceptions-risk/exceptions returns exceptions list');

    const riskFlagRes = await req(
      'POST',
      '/exceptions-risk/risk-flags',
      {
        flag_type: 'THRESHOLD_BREACH',
        severity: 'HIGH',
        target_entity: 'ACCOUNT',
        risk_score: 80,
        title: 'High Velocity Withdrawal Detection',
        description: 'Test flag for rapid liquidity drain simulation',
      },
      token
    );
    const flagId = riskFlagRes.data?.data?.id;
    assert(riskFlagRes.status === 201 && !!flagId, 'POST /api/v1/exceptions-risk/risk-flags registers risk alert');

    const updateFlagRes = await req(
      'PATCH',
      `/exceptions-risk/risk-flags/${flagId}/status`,
      { status: 'INVESTIGATING', resolution_notes: 'Reviewing transaction vouchers with Treasurer' },
      token
    );
    assert(updateFlagRes.status === 200 && updateFlagRes.data?.success === true, 'PATCH /api/v1/exceptions-risk/risk-flags/:id/status transitions to INVESTIGATING');

    // 9. Communication Templates & Variable Interpolation
    console.log('\nStep 9: Testing Communication Templates...');
    const tplRes = await req('GET', '/integrations/templates', undefined, token);
    assert(tplRes.status === 200 && tplRes.data?.data?.length >= 4, 'GET /api/v1/integrations/templates returns baseline templates');

    const previewRes = await req(
      'POST',
      '/integrations/templates/preview',
      {
        template: 'Hello {{member_name}}, your receipt #{{receipt_number}} for BDT {{amount}} is confirmed.',
        variables: { member_name: 'Rafiqul Islam', receipt_number: 'REC-2026-99', amount: '2,000.00' },
      },
      token
    );
    assert(
      previewRes.data?.data?.rendered === 'Hello Rafiqul Islam, your receipt #REC-2026-99 for BDT 2,000.00 is confirmed.',
      'POST /api/v1/integrations/templates/preview interpolates dynamic variables'
    );

    // 10. External Integration Adapters & Webhooks
    console.log('\nStep 10: Testing Integration Adapters & Webhooks...');
    const configsRes = await req('GET', '/integrations/configs', undefined, token);
    assert(configsRes.status === 200 && configsRes.data?.data?.length >= 4, 'GET /api/v1/integrations/configs lists all 4 adapters');

    const testEmailRes = await req('POST', '/integrations/configs/EMAIL/test', {}, token);
    assert(testEmailRes.status === 200 && testEmailRes.data?.success === true, 'POST /api/v1/integrations/configs/EMAIL/test dispatches test email');

    const testPayRes = await req('POST', '/integrations/configs/PAYMENT/test', {}, token);
    assert(testPayRes.status === 200 && testPayRes.data?.success === true, 'POST /api/v1/integrations/configs/PAYMENT/test initializes sandbox payment session');

    // Webhooks
    const createWhRes = await req(
      'POST',
      '/webhooks',
      {
        name: 'Test Accounting Webhook Listener',
        url: 'https://webhook.site/test-diu-invest',
        events: ['PAYMENT_RECEIVED', 'EXPENSE_APPROVED'],
      },
      token
    );
    const whId = createWhRes.data?.data?.id;
    assert(createWhRes.status === 201 && !!whId, 'POST /api/v1/webhooks registers webhook endpoint');

    const testWhRes = await req(
      'POST',
      '/webhooks/test-dispatch',
      { event_type: 'PAYMENT_RECEIVED', payload: { amount: 5000, reference: 'PAY-TEST-99' } },
      token
    );
    assert(testWhRes.status === 200 && testWhRes.data?.success === true, 'POST /api/v1/webhooks/test-dispatch dispatches HMAC signed event');

    const intLogsRes = await req('GET', '/integrations/logs?limit=5', undefined, token);
    assert(intLogsRes.status === 200 && intLogsRes.data?.data?.length > 0, 'GET /api/v1/integrations/logs queries adapter telemetry records');

    // Clean up created test webhook
    if (whId) {
      await req('DELETE', `/webhooks/${whId}`, undefined, token);
    }
  } catch (err: any) {
    console.error('Unhandled test execution error:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runPhase10Verification();
