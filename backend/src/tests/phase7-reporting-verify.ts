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

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(json?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    err.response = { status: res.status, data: json };
    throw err;
  }
  return json;
}

async function runPhase7Tests() {
  console.log('=============================================================================');
  console.log('🚀 DIU INVESTMENT CLUB - PHASE 7 REPORTING & ANALYTICS TEST SUITE');
  console.log('=============================================================================\n');

  // 1. Authenticate as Admin
  console.log('[1/10] Authenticating Admin user (admin@diu.edu.bd)...');
  const loginRes = await req('POST', '/auth/login', {
    email: 'admin@diu.edu.bd',
    password: 'Admin12345!',
  });
  const token = loginRes.data.token;
  console.log('✅ Admin authenticated successfully.\n');

  // 2. Test Income Statement
  console.log('[2/10] Testing Income Statement (/financial-reports/income-statement)...');
  const isRes = await req('GET', '/financial-reports/income-statement?start_date=2026-01-01&end_date=2026-12-31', undefined, token);
  const isData = isRes.data;
  console.log(`   Period: ${isData.start_date} to ${isData.end_date}`);
  console.log(`   Total Revenues: ৳${isData.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Expenses: ৳${isData.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Net Surplus:    ৳${isData.net_surplus.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Revenue Items count: ${isData.revenue_items.length}, Expense Items count: ${isData.expense_items.length}`);

  if (Number(isData.total_revenue) !== 135500 || Number(isData.total_expenses) !== 41400 || Number(isData.net_surplus) !== 94100) {
    throw new Error(`Income Statement amounts mismatch! Expected Rev 135500, Exp 41400, Net 94100. Got Rev ${isData.total_revenue}, Exp ${isData.total_expenses}, Net ${isData.net_surplus}`);
  }
  console.log('✅ Income Statement verified with exact mathematical reconciliation.\n');

  // 3. Test Balance Sheet
  console.log('[3/10] Testing Balance Sheet (/financial-reports/balance-sheet)...');
  const bsRes = await req('GET', '/financial-reports/balance-sheet?as_of_date=2026-12-31', undefined, token);
  const bsData = bsRes.data;
  console.log(`   As of Date: ${bsData.as_of_date}`);
  console.log(`   Total Assets:           ৳${Number(bsData.total_assets).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Liabilities:      ৳${Number(bsData.total_liabilities).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Club Fund/Equity: ৳${Number(bsData.total_club_fund).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Liab + Equity:          ৳${Number(bsData.total_liabilities_and_fund).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Difference:             ৳${Number(bsData.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })} (Balanced: ${bsData.is_balanced})`);

  if (!bsData.is_balanced || Number(bsData.difference) !== 0) {
    throw new Error(`Balance Sheet is UNBALANCED! Diff: ${bsData.difference}`);
  }
  if (Number(bsData.total_assets) !== 94100 || Number(bsData.total_club_fund) !== 94100) {
    throw new Error(`Balance Sheet amounts mismatch! Expected Assets 94100, Equity 94100. Got Assets ${bsData.total_assets}, Equity ${bsData.total_club_fund}`);
  }
  console.log('✅ Balance Sheet verified: Assets = Liabilities + Equity (Balanced: true).\n');

  // 4. Test Statement of Cash Flows
  console.log('[4/10] Testing Statement of Cash Flows (/financial-reports/cash-flow-statement)...');
  const cfRes = await req('GET', '/financial-reports/cash-flow-statement?start_date=2026-01-01&end_date=2026-12-31', undefined, token);
  const cfData = cfRes.data;
  console.log(`   Opening Cash:   ৳${cfData.opening_cash_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Inflows:        ৳${cfData.operating_inflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Outflows:       ৳${cfData.operating_outflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Net Operating:  ৳${cfData.net_operating_cash_flow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Closing Cash:   ৳${cfData.closing_cash_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  if (Number(cfData.closing_cash_balance) !== 94100 || Number(cfData.net_cash_flow) !== 94100) {
    throw new Error(`Cash Flow closing cash mismatch! Expected 94100, got closing=${cfData.closing_cash_balance}, net_flow=${cfData.net_cash_flow}`);
  }
  console.log('✅ Statement of Cash Flows verified and tied to Cash Balance.\n');

  // 5. Test Budget vs Actual
  console.log('[5/10] Testing Budget vs Actual (/financial-reports/budget-vs-actual)...');
  const bvaRes = await req('GET', '/financial-reports/budget-vs-actual', undefined, token);
  const bvaData = bvaRes.data;
  console.log(`   Total Budget: ৳${Number(bvaData.total_budget || 0)}, Total Actual Exp: ৳${Number(bvaData.total_actual_expense || 0)}, Items: ${(bvaData.items || []).length}`);
  if (bvaData.items && bvaData.items.length > 0) {
    const b0 = bvaData.items[0];
    console.log(`   Sample Event: "${b0.event_title}" (Budget: ৳${b0.budget_amount}, Actual: ৳${b0.actual_expense}, Variance: ৳${b0.variance})`);
  }
  console.log('✅ Budget vs Actual report operational.\n');

  // 6. Test Event Financial Reports
  console.log('[6/10] Testing Event Financial Reports (/financial-reports/event-reports)...');
  const evRes = await req('GET', '/financial-reports/event-reports', undefined, token);
  const evData = evRes.data;
  console.log(`   Total Events: ${(evData.events || []).length}, Total Income: ৳${Number(evData.total_income || 0)}, Total Expense: ৳${Number(evData.total_expenses || 0)}`);
  console.log('✅ Event Financial Reports operational.\n');

  // 7. Test Member Revenue Reports
  console.log('[7/10] Testing Member Revenue Reports (/financial-reports/member-revenue)...');
  const memRes = await req('GET', '/financial-reports/member-revenue', undefined, token);
  const memData = memRes.data;
  console.log(`   Total Collections: ৳${Number(memData.total_collected || 0)}, Total Dues: ৳${Number(memData.total_dues_amount || 0)}`);
  console.log('✅ Member Revenue Reports operational.\n');

  // 8. Test Donation & Sponsorship Reports
  console.log('[8/10] Testing Donation & Sponsorship Reports (/financial-reports/donations & /sponsorships)...');
  const donRes = await req('GET', '/financial-reports/donations', undefined, token);
  const donData = donRes.data;
  console.log(`   Total Donations: ৳${Number(donData.total_amount || 0)} across ${(donData.donations || []).length} records.`);
  const sponRes = await req('GET', '/financial-reports/sponsorships', undefined, token);
  const sponData = sponRes.data;
  console.log(`   Total Sponsorships Agreed: ৳${Number(sponData.total_agreed_amount || 0)}, Received: ৳${Number(sponData.total_received_amount || 0)} across ${(sponData.sponsorships || []).length} records.`);
  console.log('✅ Donation & Sponsorship Reports operational.\n');

  // 9. Test Financial Analytics Intelligence Summary
  console.log('[9/10] Testing Financial Analytics Intelligence (/financial-reports/analytics)...');
  const anaRes = await req('GET', '/financial-reports/analytics', undefined, token);
  const anaData = anaRes.data;
  console.log(`   Total Revenue: ৳${Number(anaData.total_revenue || 0)}`);
  console.log(`   Total Expense: ৳${Number(anaData.total_expenses || 0)}`);
  console.log(`   Net Surplus:   ৳${Number(anaData.net_surplus || 0)}`);
  console.log(`   Cash Position: ৳${Number(anaData.cash_position || 0)}`);
  console.log(`   Historical Months: ${(anaData.monthly_trends || []).length}`);
  console.log('✅ Financial Analytics Intelligence operational.\n');

  // 10. Test Report Snapshots Save & Retrieve
  console.log('[10/10] Testing Report Snapshots (/financial-reports/snapshots)...');
  const snapCreateRes = await req('POST', '/financial-reports/snapshots', {
    report_type: 'INCOME_STATEMENT',
    title: 'FY2026 Audited Annual Income Statement Snapshot',
    parameters: { start_date: '2026-01-01', end_date: '2026-12-31' },
    data_summary: {
      total_revenue: isData.total_revenue,
      total_expenses: isData.total_expenses,
      net_surplus: isData.net_surplus,
    },
  }, token);
  const snapId = snapCreateRes.data.id;
  console.log(`   Created Snapshot ID: ${snapId}`);

  const snapListRes = await req('GET', '/financial-reports/snapshots?report_type=INCOME_STATEMENT', undefined, token);
  console.log(`   Fetched ${snapListRes.data.length} snapshots.`);
  const found = snapListRes.data.find((s: any) => s.id === snapId);
  if (!found) throw new Error('Snapshot was not found in listing!');
  console.log(`   Verified snapshot "${found.title}" persisted in database.`);
  console.log('✅ Report Snapshot engine operational.\n');

  console.log('=============================================================================');
  console.log('🎉 ALL 10 PHASE 7 REPORTING & ANALYTICS VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================================================');
}

runPhase7Tests().catch((err) => {
  console.error('❌ Test failed with error:', err.message);
  if (err.response) {
    console.error('Response details:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
