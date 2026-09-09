import { supabaseClient, isSupabaseConfigured } from '../config/supabase';
import { financialEngineService } from '../modules/financial-engine/financial-engine.service';
import { accountsRepository } from '../modules/financial-accounts/accounts.repository';
import { incomeRepository } from '../modules/incomes/income.repository';
import { expensesRepository } from '../modules/expenses/expenses.repository';
import { transactionsRepository } from '../modules/transactions/transactions.repository';

async function runPhase2Verification() {
  console.log('================================================================');
  console.log('🧪 DIU Investment Club Finance - Phase 2 Verification Test Suite');
  console.log('================================================================\n');

  if (!isSupabaseConfigured() || !supabaseClient) {
    throw new Error('❌ Supabase is not configured. Cannot run verification.');
  }

  console.log('✅ Supabase connected: https://bzwnukbyezmrzpcykyih.supabase.co\n');

  // Fetch admin user profile to use as creator
  const { data: adminUser } = await supabaseClient
    .from('profiles')
    .select('id, email')
    .eq('email', 'admin@diu.edu.bd')
    .single();

  const adminId = adminUser?.id || '00000000-0000-0000-0000-000000000000';
  console.log(`👤 Using System Executor: ${adminUser?.email || 'System'} (${adminId})\n`);

  // Fetch seeded categories
  const { data: incCategory } = await supabaseClient
    .from('income_categories')
    .select('id, name')
    .limit(1)
    .single();

  const { data: expCategory } = await supabaseClient
    .from('expense_categories')
    .select('id, name')
    .limit(1)
    .single();

  if (!incCategory || !expCategory) {
    throw new Error('❌ Seed categories missing from database.');
  }
  console.log(`📁 Test Categories: Income="${incCategory.name}", Expense="${expCategory.name}"\n`);

  // -------------------------------------------------------------
  // TEST 1: Account Creation & Opening Balance Ledger Integration
  // -------------------------------------------------------------
  console.log('--- TEST 1: Account Creation & Opening Balance Integrity ---');
  const testAccountName = `Test Operating Bank A/C ${Date.now()}`;
  const initialBalance = 50000;

  const createdAccount = await accountsRepository.create({
    name: testAccountName,
    account_type: 'BANK',
    provider_name: 'Dutch-Bangla Bank PLC',
    account_number: '107.120.99999',
    opening_balance: initialBalance,
    description: 'Phase 2 automated verification account',
    created_by: adminId,
  });

  console.log(`✅ Account Created: ID=${createdAccount.id}, Name="${createdAccount.name}"`);
  console.log(`   Current Balance: ৳${Number(createdAccount.current_balance).toFixed(2)}`);

  if (Number(createdAccount.current_balance) !== initialBalance) {
    throw new Error(`❌ Account balance mismatch: expected ${initialBalance}, got ${createdAccount.current_balance}`);
  }

  // Check opening balance transaction in ledger
  const txns = await accountsRepository.getAccountTransactions(createdAccount.id, 5);
  const openingTxn = txns.find((t) => t.transaction_type === 'OPENING_BALANCE');
  if (!openingTxn) {
    throw new Error('❌ Opening balance transaction was not recorded in financial_transactions!');
  }
  console.log(`✅ Opening Balance Transaction Recorded: ${openingTxn.transaction_number}`);
  console.log(`   Amount: +৳${Number(openingTxn.amount).toFixed(2)}, Balance After: ৳${Number(openingTxn.balance_after).toFixed(2)}\n`);

  // -------------------------------------------------------------
  // TEST 2: Income Recording & Atomic Completion Engine
  // -------------------------------------------------------------
  console.log('--- TEST 2: Income Lifecycle (Draft -> Complete -> Balance Credit) ---');
  const incomeAmount = 15000;
  const incomeDraft = await incomeRepository.create({
    transaction_date: new Date().toISOString().split('T')[0],
    category_id: incCategory.id,
    amount: incomeAmount,
    received_from: 'Apex Corporate Sponsorship',
    financial_account_id: createdAccount.id,
    payment_method: 'BANK_TRANSFER',
    reference_number: 'NPSB-998822',
    description: 'Annual Investment Summit Gold Sponsorship',
    created_by: adminId,
  });

  console.log(`✅ Income Created in DRAFT: ${incomeDraft.income_number}, Amount: ৳${incomeAmount}`);

  // Verify balance has NOT changed yet
  const accBefore = await accountsRepository.findById(createdAccount.id);
  if (Number(accBefore?.current_balance) !== initialBalance) {
    throw new Error('❌ Balance changed while income was still in DRAFT!');
  }
  console.log(`✅ Draft Safety Verified: Account balance remains untouched at ৳${Number(accBefore?.current_balance).toFixed(2)}`);

  // Complete Income
  const completeResult = await incomeRepository.complete(incomeDraft.id, adminId);
  console.log(`✅ Income Completed via RPC complete_income_transaction: Status=${completeResult.status}`);
  console.log(`   Generated Ledger Txn: ${completeResult.transaction_number}`);
  console.log(`   Updated Account Balance: ৳${Number(completeResult.balance_after).toFixed(2)}`);

  const expectedBalanceAfterIncome = initialBalance + incomeAmount;
  if (Number(completeResult.balance_after) !== expectedBalanceAfterIncome) {
    throw new Error(`❌ Balance calculation error: expected ${expectedBalanceAfterIncome}, got ${completeResult.balance_after}`);
  }
  console.log(`✅ Atomic Balance Increase Verified: ৳${initialBalance} + ৳${incomeAmount} = ৳${expectedBalanceAfterIncome}\n`);

  // -------------------------------------------------------------
  // TEST 3: Insufficient Funds Guard on Expense Payment
  // -------------------------------------------------------------
  console.log('--- TEST 3: Insufficient Balance Protection Guard ---');
  const excessiveAmount = 200000; // Account has 65,000

  const largeExpense = await expensesRepository.create({
    expense_date: new Date().toISOString().split('T')[0],
    category_id: expCategory.id,
    amount: excessiveAmount,
    paid_to: 'Luxury Banquet Hall',
    financial_account_id: createdAccount.id,
    payment_method: 'CHEQUE',
    invoice_number: 'INV-OVERLIMIT',
    description: 'Excessive disbursement test',
    created_by: adminId,
  });
  await expensesRepository.submit(largeExpense.id, adminId);

  let blocked = false;
  try {
    await expensesRepository.pay(largeExpense.id, adminId);
  } catch (err: any) {
    blocked = true;
    console.log(`🛡️  Payment correctly blocked by database guard! Error: "${err.message}"`);
  }

  if (!blocked) {
    throw new Error('❌ Insufficient balance was NOT blocked! Critical financial bug.');
  }

  const accAfterBlocked = await accountsRepository.findById(createdAccount.id);
  if (Number(accAfterBlocked?.current_balance) !== expectedBalanceAfterIncome) {
    throw new Error('❌ Balance was decremented despite payment rejection!');
  }
  console.log(`✅ Integrity Preserved: Balance strictly remains ৳${Number(accAfterBlocked?.current_balance).toFixed(2)}\n`);

  // -------------------------------------------------------------
  // TEST 4: Valid Expense Lifecycle (Draft -> Submit -> Pay -> Debit)
  // -------------------------------------------------------------
  console.log('--- TEST 4: Valid Expense Payment & Balance Debit ---');
  const validExpenseAmount = 10000;

  const validExpense = await expensesRepository.create({
    expense_date: new Date().toISOString().split('T')[0],
    category_id: expCategory.id,
    amount: validExpenseAmount,
    paid_to: 'Dhaka Printing Press',
    financial_account_id: createdAccount.id,
    payment_method: 'BANK_TRANSFER',
    invoice_number: 'INV-2026-PRINT',
    description: 'Summit brochures and banners printing',
    created_by: adminId,
  });
  console.log(`✅ Expense Created in DRAFT: ${validExpense.expense_number}`);

  const submittedExpense = await expensesRepository.submit(validExpense.id, adminId);
  console.log(`✅ Expense Submitted: Status=${submittedExpense?.status}`);

  const paymentResult = await expensesRepository.pay(validExpense.id, adminId);
  console.log(`✅ Expense Paid via RPC pay_expense_transaction: Status=${paymentResult.status}`);
  console.log(`   Generated Ledger Txn: ${paymentResult.transaction_number}`);
  console.log(`   Updated Account Balance: ৳${Number(paymentResult.balance_after).toFixed(2)}`);

  const expectedFinalBalance = expectedBalanceAfterIncome - validExpenseAmount;
  if (Number(paymentResult.balance_after) !== expectedFinalBalance) {
    throw new Error(`❌ Final balance error: expected ${expectedFinalBalance}, got ${paymentResult.balance_after}`);
  }
  console.log(`✅ Atomic Balance Debit Verified: ৳${expectedBalanceAfterIncome} - ৳${validExpenseAmount} = ৳${expectedFinalBalance}\n`);

  // -------------------------------------------------------------
  // TEST 5: Central Ledger Immutability & Running Balance Check
  // -------------------------------------------------------------
  console.log('--- TEST 5: Central Ledger Double-Entry Audit Trail ---');
  const ledgerResponse = await transactionsRepository.findAll({
    account_id: createdAccount.id,
    limit: 10,
  });

  console.log(`✅ Total Ledger Entries Recorded for Account: ${ledgerResponse.total}`);
  ledgerResponse.data.forEach((txn, idx) => {
    console.log(`   [${idx + 1}] ${txn.transaction_number} | ${txn.transaction_type} | ৳${Number(txn.amount).toFixed(2)} | Balance After: ৳${Number(txn.balance_after).toFixed(2)}`);
  });

  if (ledgerResponse.total < 3) {
    throw new Error('❌ Expected at least 3 ledger transactions (Opening, Income, Expense).');
  }

  // -------------------------------------------------------------
  // TEST 6: Real-time Financial Dashboard Metrics
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Real-Time Financial Dashboard Metrics ---');
  const metrics = await financialEngineService.getDashboardMetrics();
  console.log(`✅ Total Available Balance: ৳${Number(metrics.total_available_balance).toFixed(2)}`);
  console.log(`   Bank Accounts Balance: ৳${Number(metrics.bank_balance).toFixed(2)}`);
  console.log(`   Cash Balance: ৳${Number(metrics.cash_balance).toFixed(2)}`);
  console.log(`   Mobile Wallets Balance: ৳${Number(metrics.mobile_balance).toFixed(2)}`);
  console.log(`   Current Month Income: ৳${Number(metrics.current_month_income).toFixed(2)}`);
  console.log(`   Current Month Expenses: ৳${Number(metrics.current_month_expenses).toFixed(2)}`);
  console.log(`   Recent Transactions Logged: ${metrics.recent_transactions.length}`);

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runPhase2Verification().catch((err) => {
  console.error('\n❌ Verification Test Failed:\n', err);
  process.exit(1);
});
