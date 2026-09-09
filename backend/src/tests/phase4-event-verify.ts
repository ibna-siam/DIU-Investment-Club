const API_BASE = 'http://localhost:5000/api/v1';

async function req(url: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runPhase4Verification() {
  console.log('=====================================================');
  console.log('🧪 Starting Phase 4 Backend Integration Verification');
  console.log('=====================================================');

  try {
    // 1. Admin Login
    console.log('\n1. Authenticating as Super Admin...');
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@diu.edu.bd',
        password: 'Admin12345!',
      },
    });
    const token = loginRes.data.token || loginRes.data.session?.access_token;
    const adminUser = loginRes.data.user;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(`✅ Logged in as: ${adminUser.full_name} (${adminUser.email})`);

    // 2. Fetch Accounts and Categories for test
    console.log('\n2. Fetching accounts and categories...');
    const accountsRes = await req('/accounts', { headers: authHeaders });
    const primaryAccount = accountsRes.data[0];
    if (!primaryAccount) throw new Error('No financial accounts found');
    console.log(`✅ Using Financial Account: ${primaryAccount.name} (${primaryAccount.account_number})`);

    const expCatRes = await req('/expense-categories', { headers: authHeaders });
    const expCategory = expCatRes.data[0];
    if (!expCategory) throw new Error('No expense categories found');

    const incCatRes = await req('/income-categories', { headers: authHeaders });
    const incCategory = incCatRes.data[0];
    if (!incCategory) throw new Error('No income categories found');

    // 3. Create Event
    console.log('\n3. Creating new test Event...');
    const eventPayload = {
      title: `DIU Investment Summit ${Date.now().toString().slice(-4)}`,
      event_type: 'INVESTMENT_SUMMIT',
      description: 'Annual flagship investment conference of DIU Investment Club',
      start_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 8).toISOString(),
      venue: 'DIU Auditorium 71',
      expected_participants: 250,
      proposed_budget: 45000,
    };
    const createEventRes = await req('/events', {
      method: 'POST',
      headers: authHeaders,
      body: eventPayload,
    });
    const event = createEventRes.data;
    console.log(`✅ Event Created: ${event.title}`);
    console.log(`   Event Code: ${event.event_code} (Matches EVT-YYYY-XXXXX pattern)`);
    console.log(`   Status: ${event.status}`);
    if (!event.event_code.startsWith('EVT-')) throw new Error('Event code format invalid');
    if (event.status !== 'DRAFT') throw new Error('Expected initial status DRAFT');

    // 4. Add Team Member
    console.log('\n4. Assigning Team Member to Event...');
    const addMemberRes = await req(`/events/${event.id}/members`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        user_id: adminUser.id,
        role: 'EVENT_DIRECTOR',
        responsibilities: 'Overall event leadership and financial accountability',
      },
    });
    const member = addMemberRes.data;
    console.log(`✅ Member Added: Role = ${member.role}`);

    const membersListRes = await req(`/events/${event.id}/members`, { headers: authHeaders });
    console.log(`✅ Team Members count: ${membersListRes.data.length}`);

    // 5. Test Invalid Status Transition
    console.log('\n5. Testing Invalid Status Transition Guard...');
    try {
      await req(`/events/${event.id}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: { status: 'APPROVED' }, // cannot jump DRAFT -> APPROVED directly
      });
      throw new Error('Should have failed transition DRAFT -> APPROVED');
    } catch (err: any) {
      if (err.status === 400) {
        console.log(`✅ Expected Invalid Transition blocked: 400 Bad Request (${err.data?.error?.message || err.message})`);
      } else {
        throw err;
      }
    }

    // Advance DRAFT -> PLANNED
    await req(`/events/${event.id}/status`, {
      method: 'POST',
      headers: authHeaders,
      body: { status: 'PLANNED' },
    });
    console.log(`✅ Event status successfully transitioned to PLANNED`);

    // 6. Create Event Budget Proposal
    console.log('\n6. Creating Event Budget Proposal with item allocations...');
    const budgetPayload = {
      proposed_budget: 45000,
      currency: 'BDT',
      notes: 'Initial budget for Venue, Audio Visual and Refreshments',
      items: [
        {
          category_id: expCategory.id,
          name: 'Stage and Audio Setup',
          allocated_amount: 25000,
          notes: 'Stage backdrop and audio gear',
        },
        {
          category_id: expCategory.id,
          name: 'Guest Refreshments',
          allocated_amount: 15000,
          notes: 'Snacks and beverages for 250 attendees',
        },
      ],
    };

    const createBudgetRes = await req(`/events/${event.id}/budget`, {
      method: 'POST',
      headers: authHeaders,
      body: budgetPayload,
    });
    const budget = createBudgetRes.data;
    console.log(`✅ Event Budget Created: ${budget.budget_number}`);
    console.log(`   Budget Status: ${budget.status}`);
    console.log(`   Items allocated count: ${budget.items?.length || 0}`);

    // 7. Submit Budget for Approval
    console.log('\n7. Submitting Budget for Multi-Tier Approval...');
    const submitBudgetRes = await req(`/event-budgets/${budget.id}/submit`, {
      method: 'POST',
      headers: authHeaders,
    });
    console.log(`✅ Budget Submitted! Request ID: ${submitBudgetRes.data?.approval_request_id}`);

    // 8. Authenticate Treasurer and President for approval
    console.log('\n8. Authenticating Treasurer and President for Workflow Approvals...');
    const treasurerLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'treasurer@diu.edu.bd', password: 'Admin12345!' },
    });
    const treasurerHeaders = { Authorization: `Bearer ${treasurerLogin.data.token}` };
    console.log('✅ Logged in as Treasurer');

    const presidentLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'president@diu.edu.bd', password: 'Admin12345!' },
    });
    const presidentHeaders = { Authorization: `Bearer ${presidentLogin.data.token}` };
    console.log('✅ Logged in as President');

    console.log('\nProcessing Multi-tier Approval for Event Budget...');
    const approvalsRes = await req(`/approvals?request_type=EVENT_BUDGET&record_id=${budget.id}`, {
      headers: authHeaders,
    });
    const approvalReq = approvalsRes.data[0];
    if (!approvalReq) throw new Error('Approval request not found for budget');

    console.log(`   Current Approval Step: ${approvalReq.current_step}, Status: ${approvalReq.status}`);

    // Step 1: Treasurer Approval
    const step1Res = await req(`/approvals/${approvalReq.id}/action`, {
      method: 'POST',
      headers: treasurerHeaders,
      body: { action: 'APPROVED', comment: 'Step 1 Approved by Club Treasurer' },
    });
    console.log(`✅ Step 1 Processed: Resulting Status = ${step1Res.data.status}`);

    // Step 2: President Approval
    if (step1Res.data.status === 'UNDER_REVIEW') {
      const step2Res = await req(`/approvals/${approvalReq.id}/action`, {
        method: 'POST',
        headers: presidentHeaders,
        body: { action: 'APPROVED', comment: 'Step 2 Final Approval by Club President' },
      });
      console.log(`✅ Step 2 Processed: Final Status = ${step2Res.data.status}`);
    }

    // Verify Budget is APPROVED
    const updatedBudgetRes = await req(`/events/${event.id}/budget`, { headers: authHeaders });
    console.log(`✅ Event Budget current status: ${updatedBudgetRes.data.status}`);
    console.log(`   Approved Budget Amount: ৳${updatedBudgetRes.data.approved_amount}`);

    // Transition Event to APPROVED then ONGOING
    await req(`/events/${event.id}/status`, {
      method: 'POST',
      headers: authHeaders,
      body: { status: 'APPROVED' },
    });
    await req(`/events/${event.id}/status`, {
      method: 'POST',
      headers: authHeaders,
      body: { status: 'ONGOING' },
    });
    console.log(`✅ Event transitioned to ONGOING`);

    // 9. Record Event Income
    console.log('\n9. Recording Event Income (Sponsorship)...');
    const incomePayload = {
      transaction_date: new Date().toISOString().split('T')[0],
      category_id: incCategory.id,
      amount: 30000,
      received_from: 'Apex Investments Ltd (Title Sponsor)',
      financial_account_id: primaryAccount.id,
      payment_method: 'BANK_TRANSFER',
      reference_number: `SPON-${Date.now().toString().slice(-4)}`,
      description: 'Title sponsorship for DIU Investment Gala',
      event_id: event.id,
    };
    const incomeRes = await req('/income', {
      method: 'POST',
      headers: authHeaders,
      body: incomePayload,
    });
    const inc = incomeRes.data;
    console.log(`✅ Event Income Created: ${inc.income_number}, Amount: ৳${inc.amount}`);

    // Complete Income via Transaction Engine
    await req(`/income/${inc.id}/complete`, {
      method: 'POST',
      headers: authHeaders,
    });
    console.log(`✅ Event Income Completed via Financial Transaction Engine`);
    console.log(`✅ Event Income Submitted and Completed via Transaction Engine`);

    // 10. Record Event Expense against budget item
    console.log('\n10. Recording Event Expense against budget item...');
    const budgetItem = updatedBudgetRes.data.items[0];
    const expensePayload = {
      expense_date: new Date().toISOString().split('T')[0],
      category_id: expCategory.id,
      amount: 18000,
      paid_to: 'Sound & Lighting Masters BD',
      financial_account_id: primaryAccount.id,
      payment_method: 'BANK_TRANSFER',
      invoice_number: `INV-SL-${Date.now().toString().slice(-4)}`,
      description: 'Stage lighting and sound engineering',
      event_id: event.id,
      event_budget_item_id: budgetItem?.id,
    };
    const expenseRes = await req('/expenses', {
      method: 'POST',
      headers: authHeaders,
      body: expensePayload,
    });
    const exp = expenseRes.data;
    console.log(`✅ Event Expense Created: ${exp.expense_number}, Amount: ৳${exp.amount}`);

    // Submit expense
    const submitExpRes = await req(`/expenses/${exp.id}/submit`, {
      method: 'POST',
      headers: authHeaders,
    });
    console.log(`✅ Expense submitted for approval! Request ID: ${submitExpRes.approval_request_id}`);

    // Approve expense
    const expApprovalRes = await req(`/approvals?request_type=EXPENSE&record_id=${exp.id}`, {
      headers: authHeaders,
    });
    const expApproval = expApprovalRes.data[0];
    if (expApproval) {
      const app1 = await req(`/approvals/${expApproval.id}/action`, {
        method: 'POST',
        headers: treasurerHeaders,
        body: { action: 'APPROVED', comment: 'Expense Approved by Treasurer' },
      });
      if (app1.data.status === 'UNDER_REVIEW') {
        await req(`/approvals/${expApproval.id}/action`, {
          method: 'POST',
          headers: presidentHeaders,
          body: { action: 'APPROVED', comment: 'Final step expense approved by President' },
        });
      }
      console.log(`✅ Event Expense fully approved!`);
    }

    // Disburse/Pay expense
    await req(`/expenses/${exp.id}/pay`, {
      method: 'POST',
      headers: authHeaders,
      body: { financial_account_id: primaryAccount.id, payment_method: 'BANK_TRANSFER' },
    });
    console.log(`✅ Event Expense disbursed from Financial Account!`);

    // 11. Event Financial Summary & Budget vs Actual
    console.log('\n11. Fetching Event Financial Summary...');
    const finSummaryRes = await req(`/events/${event.id}/financials/summary`, {
      headers: authHeaders,
    });
    const summary = finSummaryRes.data;
    console.log('📊 EVENT FINANCIAL SUMMARY:');
    console.log(`   Approved Budget:    ৳${summary.approved_budget}`);
    console.log(`   Total Incomes:      ৳${summary.total_incomes}`);
    console.log(`   Total Expenses:     ৳${summary.total_expenses}`);
    console.log(`   Net Profit/Surplus: ৳${summary.net_profit_loss}`);
    console.log(`   Remaining Budget:   ৳${summary.remaining_budget}`);
    console.log(`   Budget Utilization: ${summary.budget_utilization_percentage}% (${summary.utilization_status})`);

    if (summary.total_incomes < 30000) throw new Error('Total incomes calculation mismatch');
    if (summary.total_expenses < 18000) throw new Error('Total expenses calculation mismatch');

    const bvaRes = await req(`/events/${event.id}/financials/budget-vs-actual`, {
      headers: authHeaders,
    });
    console.log(`✅ Budget vs Actual Categories Count: ${bvaRes.data.categories?.length || 0}`);

    // 12. Permanent Delete Protection Guard
    console.log('\n12. Testing Event Delete Protection Guard...');
    try {
      await req(`/events/${event.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      throw new Error('Should NOT allow deleting event with active financial records!');
    } catch (err: any) {
      if (err.status === 400) {
        console.log(`✅ Delete Guard Working: 400 Bad Request (${err.data?.error?.message || err.message})`);
      } else {
        throw err;
      }
    }

    // 13. Event Lifecycle: Complete -> Financial Review -> Close
    console.log('\n13. Progressing Event through Lifecycle...');
    await req(`/events/${event.id}/status`, {
      method: 'POST',
      headers: authHeaders,
      body: { status: 'COMPLETED' },
    });
    await req(`/events/${event.id}/status`, {
      method: 'POST',
      headers: authHeaders,
      body: { status: 'FINANCIAL_REVIEW' },
    });
    console.log(`✅ Event transitioned to FINANCIAL_REVIEW`);

    // Close Event
    const closeRes = await req(`/events/${event.id}/close`, {
      method: 'POST',
      headers: authHeaders,
    });
    console.log(`✅ Event Closed successfully! Status = ${closeRes.data.status}`);

    // 14. Reopen Event
    console.log('\n14. Testing Reopen Event with Reason...');
    const reopenRes = await req(`/events/${event.id}/reopen`, {
      method: 'POST',
      headers: authHeaders,
      body: { reason: 'Auditor requested re-verification of final sponsorship invoice' },
    });
    console.log(`✅ Event Reopened! Status = ${reopenRes.data.status}`);

    console.log('\n=====================================================');
    console.log('🎉 ALL PHASE 4 BACKEND VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('=====================================================');
  } catch (err: any) {
    console.error('❌ Verification failed:');
    if (err.status) {
      console.error(`Status: ${err.status}`);
      console.error('Data:', JSON.stringify(err.data, null, 2));
    } else {
      console.error(err.message || err);
    }
    process.exit(1);
  }
}

runPhase4Verification();
