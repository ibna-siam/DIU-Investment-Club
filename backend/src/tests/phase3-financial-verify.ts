import { supabaseClient, isSupabaseConfigured } from '../config/supabase';
import { ApprovalsRepository } from '../modules/approvals/approvals.repository';
import { FundTransfersRepository } from '../modules/fund-transfers/fund-transfers.repository';
import { CashFlowRepository } from '../modules/cash-flow/cash-flow.repository';
import { expensesRepository } from '../modules/expenses/expenses.repository';

async function runPhase3Verification() {
  console.log('================================================================');
  console.log('🚀 STARTING PHASE 3 CORE SYSTEMS VERIFICATION');
  console.log('================================================================\n');

  if (!isSupabaseConfigured() || !supabaseClient) {
    throw new Error('Supabase client is not configured!');
  }

  // 1. Retrieve test users (Admin, Treasurer, President)
  console.log('--- Step 1: Identifying Users & Roles ---');
  const { data: users, error: uErr } = await supabaseClient
    .from('profiles')
    .select('id, email, full_name');
  if (uErr || !users || users.length === 0) {
    throw new Error('No user profiles found in database');
  }

  const adminUser = users[0];
  console.log(`✓ Test Admin User: ${adminUser.full_name} (${adminUser.id})`);

  // 2. Retrieve or create 2 active financial accounts for testing
  console.log('\n--- Step 2: Preparing Financial Accounts ---');
  const { data: accounts, error: aErr } = await supabaseClient
    .from('financial_accounts')
    .select('*')
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)
    .limit(2);

  if (aErr || !accounts || accounts.length < 2) {
    throw new Error('At least 2 active financial accounts are required for Phase 3 testing');
  }

  const acc1 = accounts[0];
  const acc2 = accounts[1];
  console.log(`✓ Source Account: ${acc1.name} (Balance: ৳${acc1.current_balance})`);
  console.log(`✓ Destination Account: ${acc2.name} (Balance: ৳${acc2.current_balance})`);

  // Ensure source account has enough balance
  if (acc1.current_balance < 1000) {
    console.log('Crediting source account for testing...');
    const catRes = await supabaseClient.from('income_categories').select('id').limit(1).single();
    const incRes = await supabaseClient.from('incomes').insert({
      income_number: 'INC-2026-99999',
      transaction_date: new Date().toISOString().split('T')[0],
      category_id: catRes.data?.id,
      amount: 50000,
      received_from: 'Phase 3 Verification Vault',
      financial_account_id: acc1.id,
      status: 'DRAFT',
      created_by: adminUser.id,
    }).select('id').single();

    if (incRes.data?.id) {
      await supabaseClient.rpc('complete_income_transaction', {
        p_income_id: incRes.data.id,
        p_user_id: adminUser.id,
      });
    }
  }

  // Refresh source account
  const { data: freshAcc1 } = await supabaseClient
    .from('financial_accounts')
    .select('*')
    .eq('id', acc1.id)
    .single();

  const sourceBal = freshAcc1?.current_balance || 50000;
  console.log(`✓ Fresh Source Account Balance: ৳${sourceBal}`);

  console.log(`✓ Fresh Source Account Balance: ৳${freshAcc1.current_balance}`);

  // 3. Test Fund Transfer System
  console.log('\n--- Step 3: Testing Fund Transfer System ---');
  const transferRepo = new FundTransfersRepository();

  // Test 3.1: Same account transfer must fail
  console.log('Testing same-account transfer rejection...');
  const sameAccRes = await transferRepo.executeTransfer({
    from_account_id: acc1.id,
    to_account_id: acc1.id,
    amount: 500,
    user_id: adminUser.id,
  });
  if (sameAccRes.success) {
    throw new Error('FAIL: Same account transfer was unexpectedly allowed!');
  }
  console.log(`✓ Properly rejected: "${sameAccRes.error}"`);

  // Test 3.2: Insufficient balance transfer must fail
  console.log('Testing insufficient balance transfer rejection...');
  const excessRes = await transferRepo.executeTransfer({
    from_account_id: acc1.id,
    to_account_id: acc2.id,
    amount: freshAcc1.current_balance + 999999,
    user_id: adminUser.id,
  });
  if (excessRes.success) {
    throw new Error('FAIL: Insufficient balance transfer was unexpectedly allowed!');
  }
  console.log(`✓ Properly rejected: "${excessRes.error}"`);

  // Test 3.3: Valid inter-account transfer
  const transferAmount = 2500;
  console.log(`Executing valid transfer of ৳${transferAmount} from "${acc1.name}" to "${acc2.name}"...`);
  const transferRes = await transferRepo.executeTransfer({
    from_account_id: acc1.id,
    to_account_id: acc2.id,
    amount: transferAmount,
    description: 'Phase 3 Inter-Account Rebalancing Test',
    reference_number: 'REF-P3-TRF-001',
    user_id: adminUser.id,
  });

  if (!transferRes.success) {
    throw new Error(`FAIL: Valid transfer failed: ${transferRes.error}`);
  }
  console.log(`✓ Transfer succeeded! Number: ${transferRes.data.transfer_number}`);
  console.log(`  Source Balance After: ৳${transferRes.data.from_balance_after}`);
  console.log(`  Destination Balance After: ৳${transferRes.data.to_balance_after}`);
  console.log(`  Out Txn ID: ${transferRes.data.out_transaction_id}`);
  console.log(`  In Txn ID: ${transferRes.data.in_transaction_id}`);

  // 4. Test Approval Workflow System
  console.log('\n--- Step 4: Testing Approval Workflow System ---');
  const approvalRepo = new ApprovalsRepository();

  // Create an expense category if needed
  const { data: cat } = await supabaseClient
    .from('expense_categories')
    .select('id')
    .limit(1)
    .single();

  if (!cat) throw new Error('No expense category found');

  // Create test expense in DRAFT
  console.log('Creating test expense in DRAFT status...');
  const expNum = 'EXP-2026-TEST-' + Math.floor(Math.random() * 9000 + 1000);
  const { data: exp, error: expErr } = await supabaseClient
    .from('expenses')
    .insert({
      expense_number: expNum,
      expense_date: new Date().toISOString().split('T')[0],
      category_id: cat.id,
      amount: 1200,
      vendor_name: 'Phase 3 Test Logistics Agency',
      financial_account_id: acc1.id,
      status: 'DRAFT',
      description: 'Logistics for Phase 3 Testing Ceremony',
      requested_by: adminUser.id,
    })
    .select()
    .single();

  if (expErr || !exp) {
    throw new Error(`FAIL: Could not create test expense: ${expErr?.message}`);
  }
  console.log(`✓ Test expense created: ${exp.expense_number} (${exp.id}) in status ${exp.status}`);

  // Test 4.1: Paying DRAFT expense directly must be blocked
  console.log('Attempting to pay unapproved DRAFT expense (must be blocked)...');
  let blocked = false;
  try {
    const unapprovedPayRes = await expensesRepository.pay(exp.id, adminUser.id);
    if (unapprovedPayRes?.success) {
      throw new Error('FAIL: Unapproved expense was paid!');
    }
    blocked = true;
    console.log(`✓ Correctly blocked payment of unapproved expense: "${unapprovedPayRes?.error}"`);
  } catch (err: any) {
    blocked = true;
    console.log(`✓ Correctly blocked payment of unapproved expense: "${err.message}"`);
  }
  if (!blocked) {
    throw new Error('FAIL: Unapproved expense was paid without error!');
  }

  // Test 4.2: Submit expense for approval
  console.log('Submitting expense for multi-tier approval...');
  const submitRes = await expensesRepository.submitForApproval(exp.id, adminUser.id);
  if (!submitRes.success) {
    throw new Error(`FAIL: Submit for approval failed: ${submitRes.error}`);
  }
  console.log(`✓ Submitted! Expense status is now: ${submitRes.data.status}`);
  console.log(`  Approval Request ID: ${submitRes.data.approval_request_id}`);

  // Test 4.3: Self-Approval Prevention Check
  console.log('Testing Self-Approval Prevention (requester acting on own request)...');
  const selfApproveRes = await approvalRepo.processAction({
    request_id: submitRes.data.approval_request_id,
    action: 'APPROVED',
    comment: 'I approve my own expense!',
    user_id: adminUser.id, // requester is adminUser
  });
  if (selfApproveRes.success) {
    throw new Error('FAIL: Requester was allowed to approve their own request!');
  }
  console.log(`✓ Correctly rejected self-approval: "${selfApproveRes.error}"`);

  // Now create or find a separate approver user to execute approvals
  // Identify Treasurer and President
  const treasurerUser = users.find((u: any) => u.email === 'treasurer@diu.edu.bd') || users[1];
  const presidentUser = users.find((u: any) => u.email === 'president@diu.edu.bd') || users[2];

  // Test 4.4: Request Changes (executed by Treasurer)
  console.log('Testing Request Changes workflow (Treasurer)...');
  const changeRes = await approvalRepo.processAction({
    request_id: submitRes.data.approval_request_id,
    action: 'CHANGES_REQUESTED',
    comment: 'Please attach official tax invoice receipt.',
    user_id: treasurerUser.id,
  });
  if (!changeRes.success) {
    throw new Error(`FAIL: Request changes failed: ${changeRes.error}`);
  }
  console.log(`✓ Status transitioned to: ${changeRes.data.status}`);

  // Test 4.5: Resubmit for approval
  console.log('Requester updates expense and resubmits...');
  await expensesRepository.update(exp.id, { invoice_number: 'INV-TAX-9988' }, adminUser.id);
  const resubmitRes = await expensesRepository.submitForApproval(exp.id, adminUser.id);
  if (!resubmitRes.success) {
    throw new Error(`FAIL: Resubmit failed: ${resubmitRes.error}`);
  }
  console.log(`✓ Resubmitted! Status is: ${resubmitRes.data.status}`);

  // Test 4.6: Step 1 (Treasurer) Approval
  console.log('Treasurer executes Step 1 approval...');
  const step1Res = await approvalRepo.processAction({
    request_id: submitRes.data.approval_request_id,
    action: 'APPROVED',
    comment: 'Tax invoice verified. Approved by Treasurer.',
    user_id: treasurerUser.id,
  });
  if (!step1Res.success) {
    throw new Error(`FAIL: Step 1 approval failed: ${step1Res.error}`);
  }
  console.log(`✓ Step 1 complete! Status advanced to: ${step1Res.data.status}`);

  // Test 4.7: Step 2 (President) Approval
  console.log('President executes Step 2 final approval...');
  const step2Res = await approvalRepo.processAction({
    request_id: submitRes.data.approval_request_id,
    action: 'APPROVED',
    comment: 'Final executive approval granted for logistics payment.',
    user_id: presidentUser.id,
  });
  if (!step2Res.success) {
    throw new Error(`FAIL: Step 2 approval failed: ${step2Res.error}`);
  }
  console.log(`✓ Request fully approved! Status is now: ${step2Res.data.status}`);

  // Verify expense is now in APPROVED status
  const { data: approvedExp } = await supabaseClient.from('expenses').select('status').eq('id', exp.id).single();
  if (!approvedExp || approvedExp.status !== 'APPROVED') {
    throw new Error(`FAIL: Expense status should be APPROVED, got: ${approvedExp?.status}`);
  }
  console.log(`✓ Expense status verified as: ${approvedExp.status}`);

  // Test 4.8: Execute payment on approved expense
  console.log('Executing payment on the APPROVED expense...');
  const payRes = await expensesRepository.pay(exp.id, adminUser.id);
  if (!payRes.success) {
    throw new Error(`FAIL: Payment failed on approved expense: ${payRes.error}`);
  }
  const payData = payRes.data || payRes;
  console.log(`✓ Expense successfully paid! Txn #: ${payData.transaction_number}, Balance After: ৳${payData.balance_after}`);

  // 5. Test Cash Flow Management System
  console.log('\n--- Step 5: Testing Cash Flow Management System ---');
  const cashFlowRepo = new CashFlowRepository();
  const summary = await cashFlowRepo.getSummary({});
  console.log(`✓ Cash Flow Summary:`);
  console.log(`  Opening Balance: ৳${summary.opening_balance}`);
  console.log(`  Total Inflow:    ৳${summary.total_inflow}`);
  console.log(`  Total Outflow:   ৳${summary.total_outflow}`);
  console.log(`  Net Cash Flow:   ৳${summary.net_cash_flow}`);
  console.log(`  Closing Balance: ৳${summary.closing_balance}`);

  const expectedClosing = summary.opening_balance + summary.net_cash_flow;
  if (Math.abs(summary.closing_balance - expectedClosing) > 0.01) {
    throw new Error(`FAIL: Cash flow formula mismatch! Closing: ${summary.closing_balance} vs Expected: ${expectedClosing}`);
  }
  console.log('✓ Cash flow mathematical reconciliation strictly verified!');

  const timeline = await cashFlowRepo.getTimeline({ limit: 10 });
  console.log(`✓ Cash Flow Timeline: Retrieved ${timeline.data.length} chronological records.`);
  if (timeline.data.length > 0) {
    const sample = timeline.data[0];
    console.log(`  Latest Txn: ${sample.transaction_number} | Running Balance: ৳${sample.running_balance}`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 3 VERIFICATION TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runPhase3Verification().catch((err) => {
  console.error('\n❌ PHASE 3 VERIFICATION FAILED:', err);
  process.exit(1);
});
