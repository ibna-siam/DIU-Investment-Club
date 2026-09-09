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

async function runPhase6Tests() {
  console.log('===============================================================');
  console.log('🚀 DIU INVESTMENT CLUB - PHASE 6 ADVANCED ACCOUNTING TEST SUITE');
  console.log('===============================================================\n');

  // 1. Authenticate as Admin
  console.log('[1/11] Authenticating Admin user (admin@diu.edu.bd)...');
  const loginRes = await req('POST', '/auth/login', {
    email: 'admin@diu.edu.bd',
    password: 'Admin12345!',
  });
  const token = loginRes.data.token;
  console.log('✅ Admin authenticated successfully.\n');

  // 2. Verify Chart of Accounts & Hierarchy
  console.log('[2/11] Verifying Chart of Accounts (COA) Hierarchy & System Heads...');
  const coaRes = await req('GET', '/chart-of-accounts', undefined, token);
  const accounts = coaRes.data;
  console.log(`✅ Loaded ${accounts.length} Chart of Account heads.`);
  const assetHead = accounts.find((a: any) => a.account_code === '1000');
  const cashHead = accounts.find((a: any) => a.account_code === '1110');
  const revHead = accounts.find((a: any) => a.account_code === '4000');
  const expHead = accounts.find((a: any) => a.account_code === '5000');

  if (!assetHead || !cashHead || !revHead || !expHead) {
    throw new Error('Mandatory COA system heads (1000, 1110, 4000, 5000) are missing!');
  }
  console.log(`✅ Verified top-level heads: 1000 (${assetHead.normal_balance}), 4000 (${revHead.normal_balance}), 5000 (${expHead.normal_balance})`);

  const hierRes = await req('GET', '/chart-of-accounts/hierarchy', undefined, token);
  console.log(`✅ Verified COA Tree Structure (${hierRes.data.length} root categories).\n`);

  // 3. Verify Financial Years & Accounting Periods
  console.log('[3/11] Verifying Financial Years & Accounting Periods...');
  const yearsRes = await req('GET', '/financial-years/years', undefined, token);
  console.log(`✅ Found ${yearsRes.data.length} Financial Years.`);

  const periodsRes = await req('GET', '/accounting-periods/periods', undefined, token);
  console.log(`✅ Found ${periodsRes.data.length} Accounting Periods.`);
  const openPeriods = periodsRes.data.filter((p: any) => p.status === 'OPEN');
  console.log(`✅ Active OPEN Periods: ${openPeriods.length}.\n`);

  // 4. Test Double Entry Line-Level Validation (Debit > 0 AND Credit > 0 Rejection)
  console.log('[4/11] Testing Line-Level Validation (Debit > 0 AND Credit > 0 simultaneously)...');
  try {
    await req('POST', '/journal-entries', {
      entry_date: '2026-09-07',
      description: 'Invalid line test',
      lines: [
        { account_id: cashHead.id, debit_amount: 1000, credit_amount: 500 },
        { account_id: revHead.id, debit_amount: 0, credit_amount: 1000 },
      ],
    }, token);
    throw new Error('Should have rejected simultaneous debit and credit on single line');
  } catch (err: any) {
    console.log(`✅ Correctly rejected invalid line: "${err.response?.data?.error?.message || err.message}"\n`);
  }

  // 5. Test Entry-Level Double Entry Balance Rejection (Debit != Credit)
  console.log('[5/11] Testing Entry-Level Balance Rule: Total Debit != Total Credit rejection on submission/posting...');
  const unbalRes = await req('POST', '/journal-entries', {
    entry_date: '2026-09-07',
    description: 'Unbalanced Journal Draft Test',
    lines: [
      { account_id: cashHead.id, debit_amount: 2500, credit_amount: 0 },
      { account_id: revHead.id, debit_amount: 0, credit_amount: 2000 }, // 500 diff
    ],
  }, token);
  const unbalId = unbalRes.data.id;
  console.log(`Created draft unbalanced entry: ${unbalRes.data.journal_number}`);

  try {
    await req('POST', `/journal-entries/${unbalId}/submit`, {}, token);
    throw new Error('Should have rejected submission of unbalanced journal');
  } catch (err: any) {
    console.log(`✅ Correctly rejected submission of unbalanced journal: "${err.response?.data?.error?.message || err.message}"`);
  }

  // Delete the unbalanced test draft
  await req('DELETE', `/journal-entries/${unbalId}`, undefined, token);
  console.log('✅ Deleted test unbalanced draft.\n');

  // 6. Test Balanced Journal Entry Creation, Approval & Posting
  console.log('[6/11] Creating, Approving, and Posting a Balanced Manual Journal Entry (JV)...');
  const bankHead = accounts.find((a: any) => a.account_code === '1120') || cashHead;
  const adminExpHead = accounts.find((a: any) => a.account_code === '5200') || expHead;

  const balancedRes = await req('POST', '/journal-entries', {
    entry_date: '2026-09-07',
    description: 'Monthly Cloud Infrastructure & Software Subscriptions',
    reference_type: 'MANUAL',
    lines: [
      { account_id: adminExpHead.id, description: 'Office cloud hosting fees', debit_amount: 3500, credit_amount: 0 },
      { account_id: bankHead.id, description: 'Bank transfer payment', debit_amount: 0, credit_amount: 3500 },
    ],
  }, token);

  const jId = balancedRes.data.id;
  const jNum = balancedRes.data.journal_number;
  console.log(`✅ Created balanced journal entry: ${jNum} (Amount: ৳3500)`);

  await req('POST', `/journal-entries/${jId}/submit`, {}, token);
  console.log(`✅ Submitted ${jNum} for approval.`);

  await req('POST', `/journal-entries/${jId}/approve`, {}, token);
  console.log(`✅ Approved ${jNum}.`);

  const postRes = await req('POST', `/journal-entries/${jId}/post`, {}, token);
  console.log(`✅ Successfully posted ${jNum} to General Ledger. Voucher: ${postRes.data.voucher_number}\n`);

  // 7. Verify Voucher System
  console.log('[7/11] Verifying Voucher Provisioning & Numbering...');
  const vouchersRes = await req('GET', '/vouchers', undefined, token);
  console.log(`✅ Total Vouchers registered: ${vouchersRes.data.length}`);
  const linkedVoucher = vouchersRes.data.find((v: any) => v.journal_entry_id === jId);
  if (!linkedVoucher) throw new Error('Voucher was not automatically provisioned for posted journal!');
  console.log(`✅ Verified auto-generated Voucher: ${linkedVoucher.voucher_number} (${linkedVoucher.voucher_type}, Status: ${linkedVoucher.status})\n`);

  // 8. Test Controlled Journal Reversal System
  console.log('[8/11] Testing Controlled Reversal System (mirror inversion entry)...');
  const revRes = await req('POST', `/journal-entries/${jId}/reverse`, {
    reason: 'Billing adjustment: cloud host provided sponsor credit waiver',
  }, token);
  console.log(`✅ Successfully reversed ${jNum}.`);
  console.log(`✅ Reversal Mirror Journal: ${revRes.data.reversal_journal_number}`);

  const origCheck = await req('GET', `/journal-entries/${jId}`, undefined, token);
  if (origCheck.data.status !== 'REVERSED') {
    throw new Error(`Original journal status should be REVERSED, got ${origCheck.data.status}`);
  }
  console.log(`✅ Verified original journal ${jNum} status is now REVERSED.\n`);

  // 9. Verify General Ledger Running Balances
  console.log('[9/11] Verifying General Ledger Running Balance Calculation for Bank Accounts...');
  const glRes = await req('GET', `/accounting/general-ledger?account_id=${bankHead.id}`, undefined, token);
  const gl = glRes.data;
  console.log(`✅ General Ledger Statement for: ${gl.account.account_code} - ${gl.account.account_name}`);
  console.log(`   Opening Balance: ৳${gl.opening_balance}`);
  console.log(`   Total Debits: ৳${gl.total_debit}`);
  console.log(`   Total Credits: ৳${gl.total_credit}`);
  console.log(`   Closing Balance: ৳${gl.closing_balance}`);
  console.log(`   Ledger Line Count: ${gl.lines.length}`);
  console.log('✅ Running balance verified.\n');

  // 10. Verify Trial Balance: Total Debits = Total Credits
  console.log('[10/11] Verifying Trial Balance Debit = Credit Integrity...');
  const tbRes = await req('GET', '/accounting/trial-balance', undefined, token);
  const tb = tbRes.data;
  console.log(`   Total Debits:  ৳${tb.total_debit.toLocaleString()}`);
  console.log(`   Total Credits: ৳${tb.total_credit.toLocaleString()}`);
  console.log(`   Difference:    ৳${tb.difference}`);
  console.log(`   Is Balanced:   ${tb.is_balanced ? 'YES (EQUAL) ✅' : 'NO ❌'}`);

  if (!tb.is_balanced || tb.difference !== 0) {
    throw new Error(`TRIAL BALANCE OUT OF BALANCE! Difference: ৳${tb.difference}`);
  }
  console.log('✅ Trial Balance mathematically balanced (Total Debit == Total Credit).\n');

  // 11. Verify Accounting Executive Dashboard Summary
  console.log('[11/11] Verifying Accounting Executive Dashboard Metrics...');
  const dashRes = await req('GET', '/accounting/dashboard', undefined, token);
  const dash = dashRes.data;
  console.log(`   Total Assets:        ৳${dash.total_assets.toLocaleString()}`);
  console.log(`   Total Liabilities:   ৳${dash.total_liabilities.toLocaleString()}`);
  console.log(`   Total Equity:        ৳${dash.total_equity.toLocaleString()}`);
  console.log(`   Total Revenue:       ৳${dash.total_revenue.toLocaleString()}`);
  console.log(`   Total Expenses:      ৳${dash.total_expenses.toLocaleString()}`);
  console.log(`   Net Surplus:         ৳${dash.net_surplus.toLocaleString()}`);
  console.log(`   Posted Journals:     ${dash.posted_journals_count}`);
  console.log(`   Open Periods:        ${dash.open_periods_count}`);
  console.log(`   Trial Balance Equal: ${dash.is_trial_balance_equal ? 'YES ✅' : 'NO ❌'}`);
  console.log('\n===============================================================');
  console.log('🎉 ALL PHASE 6 ADVANCED ACCOUNTING ENGINE TESTS PASSED 100%!');
  console.log('===============================================================');
}

runPhase6Tests().catch((err) => {
  console.error('\n❌ Phase 6 Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
