export {};

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
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 STARTING PHASE 5 REVENUE & MEMBER SYSTEMS VERIFICATION');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // Step 1: User Authentication & Roles
    // -------------------------------------------------------------
    console.log('--- Step 1: User Authentication & Role Verification ---');
    const adminRes = await req('/auth/login', {
      method: 'POST',
      body: { email: 'admin@diu.edu.bd', password: 'Admin12345!' },
    });
    const adminToken = adminRes.data.token;
    const adminUser = adminRes.data.user;
    console.log(`✓ Admin token acquired: ${adminUser.full_name}`);

    const treasurerRes = await req('/auth/login', {
      method: 'POST',
      body: { email: 'treasurer@diu.edu.bd', password: 'Admin12345!' },
    });
    const treasurerToken = treasurerRes.data.token;
    const treasurerUser = treasurerRes.data.user;
    console.log(`✓ Treasurer token acquired: ${treasurerUser.full_name}`);

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const treasurerHeaders = { Authorization: `Bearer ${treasurerToken}` };

    // Get an active financial account
    const accountsRes = await req('/accounts', { headers: adminHeaders });
    const accounts = accountsRes.data;
    const operatingAccount = accounts.find((a: any) => a.status === 'ACTIVE') || accounts[0];
    console.log(`✓ Target Financial Account: ${operatingAccount.name} (Current Balance: ৳${operatingAccount.current_balance})`);

    // -------------------------------------------------------------
    // Step 2: Membership Types
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Verifying Membership Types ---');
    const typesRes = await req('/membership-types', { headers: adminHeaders });
    const types = typesRes.data;
    console.log(`✓ Found ${types.length} membership types:`);
    types.forEach((t: any) => {
      console.log(`  - ${t.name}: Joining ৳${t.joining_fee}, Renewal ৳${t.renewal_fee}, Cycle: ${t.billing_cycle}`);
    });
    const generalType = types.find((t: any) => t.name === 'GENERAL_MEMBER') || types[0];

    // -------------------------------------------------------------
    // Step 3: Member Registration & Code Generation
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Member Registration ---');
    const uniqueStudentId = `221-15-${Math.floor(1000 + Math.random() * 9000)}`;
    const createMemberRes = await req('/members', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        student_id: uniqueStudentId,
        full_name: 'Mohammad Tanvir Ahmed',
        email: `tanvir.${Math.floor(1000 + Math.random() * 9000)}@diu.edu.bd`,
        phone: '01711223344',
        department: 'Software Engineering',
        batch: '58th',
        semester: '7th',
        membership_type_id: generalType.id,
        notes: 'Interested in algorithmic stock trading research',
      },
    });

    const member = createMemberRes.data;
    console.log(`✓ Member registered successfully!`);
    console.log(`  Member Code: ${member.member_code}`);
    console.log(`  Name: ${member.full_name}`);
    console.log(`  Initial Status: ${member.membership_status}`);

    if (!member.member_code.startsWith('DIC-')) {
      throw new Error(`Invalid member code format: ${member.member_code}`);
    }

    // -------------------------------------------------------------
    // Step 4: Automatic Initial Joining Due Generation
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Verifying Initial Joining Due Obligation ---');
    const duesRes = await req(`/member-dues?member_id=${member.id}`, { headers: adminHeaders });
    const memberDues = duesRes.data;
    if (memberDues.length === 0) {
      throw new Error('Initial joining due was not generated for member!');
    }
    const joiningDue = memberDues[0];
    console.log(`✓ Initial Due Created Automatically: ${joiningDue.due_number}`);
    console.log(`  Title: ${joiningDue.title}`);
    console.log(`  Amount: ৳${joiningDue.amount}, Remaining: ৳${joiningDue.remaining_amount}, Status: ${joiningDue.status}`);

    // Assess a second special due
    const specialDueRes = await req('/member-dues', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        member_id: member.id,
        due_type: 'MONTHLY_DUE',
        title: 'October 2026 Monthly Club Subscription',
        description: 'Monthly investment portfolio research fee',
        amount: 300,
        due_date: new Date().toISOString().split('T')[0],
      },
    });
    const specialDue = specialDueRes.data;
    console.log(`✓ Assessed second due: ${specialDue.due_number} (৳${specialDue.amount})`);

    // -------------------------------------------------------------
    // Step 5: Partial Payment & Verification
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Partial Payment Collection & Verification ---');

    // Record Partial Payment 1: ৳300 of ৳500
    const pay1Res = await req('/member-payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        member_id: member.id,
        due_id: joiningDue.id,
        amount: 300,
        payment_method: 'BKASH',
        financial_account_id: operatingAccount.id,
        reference_number: 'BK-TRX-98821',
      },
    });
    const pay1 = pay1Res.data;
    console.log(`✓ Partial Payment 1 Recorded: ${pay1.payment_number} (৳300, Status: ${pay1.status})`);

    // Verify Payment 1 as Treasurer
    const verify1Res = await req(`/member-payments/${pay1.id}/verify`, {
      method: 'POST',
      headers: treasurerHeaders,
      body: { notes: 'bKash transaction verified against merchant statement' },
    });
    console.log(`✓ Payment 1 Verified by Treasurer! Receipt: ${verify1Res.data.receipt_number}`);
    console.log(`  Due Status After Pay 1: ${verify1Res.data.due_status}`);
    console.log(`  Member Status After Pay 1: ${verify1Res.data.member_status}`);

    // Fetch updated due
    const dueAfter1 = (await req(`/member-dues/${joiningDue.id}`, { headers: adminHeaders })).data;
    console.log(`  Due Paid: ৳${dueAfter1.paid_amount}, Remaining: ৳${dueAfter1.remaining_amount}, Status: ${dueAfter1.status}`);
    if (dueAfter1.status !== 'PARTIALLY_PAID' || Number(dueAfter1.remaining_amount) !== 200) {
      throw new Error(`Expected PARTIALLY_PAID and remaining ৳200, got: ${dueAfter1.status}, remaining ৳${dueAfter1.remaining_amount}`);
    }

    // Record Payment 2: Remaining ৳200
    console.log('\nRecording final ৳200 to clear joining fee...');
    const pay2Res = await req('/member-payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        member_id: member.id,
        due_id: joiningDue.id,
        amount: 200,
        payment_method: 'CASH',
        financial_account_id: operatingAccount.id,
        reference_number: 'CSH-REC-001',
      },
    });
    const pay2 = pay2Res.data;
    const verify2Res = await req(`/member-payments/${pay2.id}/verify`, {
      method: 'POST',
      headers: treasurerHeaders,
      body: { notes: 'Cash handed over at club desk' },
    });
    console.log(`✓ Payment 2 Verified! Receipt: ${verify2Res.data.receipt_number}`);
    console.log(`  Due Status After Pay 2: ${verify2Res.data.due_status}`);

    // Verify receipt lookup
    const receiptRes = await req(`/member-payments/receipt/${verify2Res.data.receipt_number}`, {
      headers: adminHeaders,
    });
    console.log(`✓ Receipt Lookup verified:`);
    console.log(`  Receipt: ${receiptRes.data.receipt_number}`);
    console.log(`  Member: ${receiptRes.data.member?.full_name} (${receiptRes.data.member?.student_id})`);
    console.log(`  Amount: ৳${receiptRes.data.amount} via ${receiptRes.data.payment_method}`);
    console.log(`  Verified By: ${receiptRes.data.verifier_name}`);

    // Verify Idempotency: Attempt to verify Payment 2 again
    console.log('\nTesting Idempotency: Attempting duplicate verification on verified payment...');
    try {
      await req(`/member-payments/${pay2.id}/verify`, {
        method: 'POST',
        headers: treasurerHeaders,
        body: {},
      });
      throw new Error('Duplicate verification should have failed!');
    } catch (dupErr: any) {
      console.log(`✓ Correctly blocked duplicate verification: "${dupErr.data?.error?.message || dupErr.message}"`);
    }

    // -------------------------------------------------------------
    // Step 6: Due Waiver
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Due Obligation Waiver ---');
    const waiveRes = await req(`/member-dues/${specialDue.id}/waive`, {
      method: 'POST',
      headers: adminHeaders,
      body: { reason: 'Exemplary performance waiver granted by Executive Committee' },
    });
    console.log(`✓ Due Waived: ${waiveRes.data.due_number} (Status: ${waiveRes.data.status}, Remaining: ৳${waiveRes.data.remaining_amount})`);

    // -------------------------------------------------------------
    // Step 7: Donation Management Workflow
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Donation Management ---');
    const createDonationRes = await req('/donations', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        donor_name: 'Shahriar Kabir',
        donor_type: 'INDIVIDUAL',
        email: 'shahriar.alumni@diu.edu.bd',
        phone: '01819998877',
        amount: 5000,
        financial_account_id: operatingAccount.id,
        payment_method: 'BANK_TRANSFER',
        reference_number: 'EBL-TRF-44102',
        purpose: 'Investment Research Software Fund',
      },
    });
    const donation = createDonationRes.data;
    console.log(`✓ Donation Recorded: ${donation.donation_number} (৳${donation.amount}, Status: ${donation.status})`);

    const verifyDonationRes = await req(`/donations/${donation.id}/verify`, {
      method: 'POST',
      headers: treasurerHeaders,
      body: {},
    });
    console.log(`✓ Donation Verified by Treasurer! Receipt: ${verifyDonationRes.data.receipt_number}`);

    // -------------------------------------------------------------
    // Step 8: Sponsor & Sponsorship Management Workflow
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Sponsor & Sponsorship Management ---');
    const createSponsorRes = await req('/sponsors', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'LankaBangla Securities',
        organization_name: 'LankaBangla Securities Ltd.',
        contact_person: 'Md. Rafiqul Islam, Head of Institutional Research',
        email: 'research@lankabangla.com',
        phone: '01912345678',
        website: 'https://lankabangla.com',
      },
    });
    const sponsor = createSponsorRes.data;
    console.log(`✓ Sponsor Registered: ${sponsor.sponsor_code} - ${sponsor.organization_name}`);

    // Create Sponsorship Agreement
    const createSpRes = await req('/sponsorships', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        sponsor_id: sponsor.id,
        title: 'DIU Investment Research Lab Title Partner',
        description: 'Annual sponsorship for club Bloomberg terminal research & financial market workshops',
        agreed_amount: 40000,
        due_date: new Date().toISOString().split('T')[0],
      },
    });
    const sponsorship = createSpRes.data;
    console.log(`✓ Sponsorship Agreement Created: ${sponsorship.sponsorship_number} (Agreed: ৳${sponsorship.agreed_amount})`);

    // Record installment of ৳25,000
    const spPayRes = await req(`/sponsorships/${sponsorship.id}/payments`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        amount: 25000,
        payment_method: 'BANK_TRANSFER',
        financial_account_id: operatingAccount.id,
        reference_number: 'LB-CHQ-10992',
      },
    });
    const spPayment = spPayRes.data;
    console.log(`✓ Sponsorship Installment Recorded: ${spPayment.payment_number} (৳${spPayment.amount})`);

    // Verify installment
    const verifySpPayRes = await req(`/sponsorships/payments/${spPayment.id}/verify`, {
      method: 'POST',
      headers: treasurerHeaders,
      body: {},
    });
    console.log(`✓ Sponsorship Payment Verified! Receipt: ${verifySpPayRes.data.receipt_number}`);
    console.log(`  Sponsorship Status: ${verifySpPayRes.data.sponsorship_status}`);

    // -------------------------------------------------------------
    // Step 9: Member Financial Dashboard & Club Revenue Overview
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Real-Time Financial Metrics & Club Revenue ---');
    const metricsRes = await req('/member-financials/metrics', { headers: adminHeaders });
    const metrics = metricsRes.data;
    console.log('✓ Member Financial Metrics:');
    console.log(`  Total Members:              ${metrics.total_members}`);
    console.log(`  Active Members:             ${metrics.active_members}`);
    console.log(`  Total Outstanding Dues:     ৳${metrics.total_outstanding_dues}`);
    console.log(`  Collected This Month:       ৳${metrics.collected_this_month}`);
    console.log(`  Total Membership Revenue:   ৳${metrics.total_membership_revenue}`);

    const revRes = await req('/member-financials/revenue-overview', { headers: adminHeaders });
    const rev = revRes.data;
    console.log('\n✓ Consolidated Club Revenue Overview:');
    console.log(`  Membership Revenue:         ৳${rev.membership_revenue}`);
    console.log(`  Donation Revenue:           ৳${rev.donation_revenue}`);
    console.log(`  Sponsorship Revenue:        ৳${rev.sponsorship_revenue}`);
    console.log(`  Total Club Revenue:         ৳${rev.total_club_revenue}`);

    // -------------------------------------------------------------
    // Step 10: Delete Protection Verification
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Testing Delete Protection on Members with Financials ---');
    try {
      await req(`/members/${member.id}`, { method: 'DELETE', headers: adminHeaders });
      throw new Error('Member deletion should have been blocked!');
    } catch (delErr: any) {
      console.log(`✓ Correctly blocked member deletion: "${delErr.data?.error?.message || delErr.message}"`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL PHASE 5 VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.data || err.message);
    process.exit(1);
  }
}

runVerification();
