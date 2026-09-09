const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function restoreDemoData() {
  console.log('Restoring member demo information...');

  // 1. Fetch admin & treasurer profile IDs
  const { data: profiles } = await supabase.from('profiles').select('id, role').limit(10);
  const adminUser = profiles?.find(p => p.role === 'SUPER_ADMIN') || profiles?.[0];
  const treasurerUser = profiles?.find(p => p.role === 'TREASURER') || adminUser;

  const adminId = adminUser?.id || 'a1111111-1111-1111-1111-111111111111';
  const treasurerId = treasurerUser?.id || 'a2222222-2222-2222-2222-222222222222';

  // Fetch active account
  const { data: accounts } = await supabase.from('financial_accounts').select('id, name').eq('status', 'ACTIVE').limit(1);
  const accountId = accounts?.[0]?.id || null;

  // 2. Insert or upsert Membership Types
  const defaultTypes = [
    {
      name: 'GENERAL_MEMBER',
      description: 'Standard membership for active students with voting and event access rights',
      joining_fee: 500,
      renewal_fee: 300,
      billing_cycle: 'YEARLY',
      is_active: true,
    },
    {
      name: 'EXECUTIVE_MEMBER',
      description: 'Executive leadership tier for committee leaders, project directors and officers',
      joining_fee: 1000,
      renewal_fee: 600,
      billing_cycle: 'YEARLY',
      is_active: true,
    },
    {
      name: 'ALUMNI_MEMBER',
      description: 'Special membership for graduated DIU alumni maintaining club mentorship and relations',
      joining_fee: 1500,
      renewal_fee: 1000,
      billing_cycle: 'YEARLY',
      is_active: true,
    },
    {
      name: 'LIFETIME_MEMBER',
      description: 'Permanent alumni/patron membership with lifetime access to all club networks',
      joining_fee: 5000,
      renewal_fee: 0,
      billing_cycle: 'ONE_TIME',
      is_active: true,
    },
  ];

  const typesMap = {};
  for (const t of defaultTypes) {
    const { data: existing } = await supabase.from('membership_types').select('*').eq('name', t.name).maybeSingle();
    if (existing) {
      typesMap[t.name] = existing;
    } else {
      const { data: inserted, error } = await supabase.from('membership_types').insert(t).select().single();
      if (error) console.error('Error inserting type:', error);
      else typesMap[t.name] = inserted;
    }
  }
  console.log('✓ Membership Types restored:', Object.keys(typesMap));

  // 3. Insert Demo Members
  const demoMembers = [
    {
      member_code: 'DIC-2026-00001',
      student_id: '221-15-1001',
      full_name: 'Mohammad Tanvir Ahmed',
      email: 'tanvir.ahmed@diu.edu.bd',
      phone: '01711223344',
      department: 'Software Engineering',
      batch: '58th',
      semester: '7th',
      membership_type_id: typesMap['GENERAL_MEMBER']?.id,
      membership_status: 'ACTIVE',
      joined_date: '2026-01-15',
      created_by: adminId,
    },
    {
      member_code: 'DIC-2026-00002',
      student_id: '221-15-1002',
      full_name: 'Nusrat Jahan',
      email: 'nusrat.jahan@diu.edu.bd',
      phone: '01711223355',
      department: 'Computer Science & Engineering',
      batch: '56th',
      semester: '9th',
      membership_type_id: typesMap['EXECUTIVE_MEMBER']?.id,
      membership_status: 'ACTIVE',
      joined_date: '2026-01-18',
      created_by: adminId,
    },
    {
      member_code: 'DIC-2026-00003',
      student_id: '221-15-1003',
      full_name: 'Farhan Sadik',
      email: 'farhan.sadik@diu.edu.bd',
      phone: '01711223366',
      department: 'Business Administration',
      batch: '55th',
      semester: '10th',
      membership_type_id: typesMap['GENERAL_MEMBER']?.id,
      membership_status: 'PENDING',
      joined_date: '2026-02-01',
      created_by: adminId,
    },
    {
      member_code: 'DIC-2026-00004',
      student_id: '221-15-1004',
      full_name: 'Ayesha Siddiqua',
      email: 'ayesha.siddiqua@diu.edu.bd',
      phone: '01711223377',
      department: 'Software Engineering',
      batch: '59th',
      semester: '6th',
      membership_type_id: typesMap['GENERAL_MEMBER']?.id,
      membership_status: 'ACTIVE',
      joined_date: '2026-02-10',
      created_by: adminId,
    },
    {
      member_code: 'DIC-2026-00005',
      student_id: '221-15-1005',
      full_name: 'Mahfuzur Rahman',
      email: 'mahfuzur.rahman@diu.edu.bd',
      phone: '01711223388',
      department: 'Electrical & Electronic Engineering',
      batch: '52nd',
      semester: 'Graduated',
      membership_type_id: typesMap['ALUMNI_MEMBER']?.id,
      membership_status: 'ACTIVE',
      joined_date: '2026-01-10',
      created_by: adminId,
    },
    {
      member_code: 'DIC-2026-00006',
      student_id: '221-15-1006',
      full_name: 'Tanzidul Islam',
      email: 'tanzidul.islam@diu.edu.bd',
      phone: '01711223399',
      department: 'Business Information Technology',
      batch: '50th',
      semester: 'Graduated',
      membership_type_id: typesMap['LIFETIME_MEMBER']?.id,
      membership_status: 'ACTIVE',
      joined_date: '2026-01-05',
      created_by: adminId,
    },
  ];

  const membersMap = {};
  for (const m of demoMembers) {
    const { data: existing } = await supabase.from('members').select('*').eq('member_code', m.member_code).maybeSingle();
    if (existing) {
      membersMap[m.member_code] = existing;
    } else {
      const { data: inserted, error } = await supabase.from('members').insert(m).select().single();
      if (error) console.error('Error inserting member:', error);
      else membersMap[m.member_code] = inserted;
    }
  }
  console.log('✓ Demo Members restored:', Object.keys(membersMap));

  // 4. Insert Member Memberships & Dues
  const duesConfigs = [
    {
      code: 'DIC-2026-00001',
      tierName: 'GENERAL_MEMBER',
      dueNumber: 'DUE-2026-00001',
      amount: 500,
      paidAmount: 500,
      remainingAmount: 0,
      status: 'PAID',
      payAmount: 500,
      payMethod: 'BKASH',
      receiptNumber: 'RCT-2026-00001',
      ref: 'BK-TRX-10101',
    },
    {
      code: 'DIC-2026-00002',
      tierName: 'EXECUTIVE_MEMBER',
      dueNumber: 'DUE-2026-00002',
      amount: 1000,
      paidAmount: 1000,
      remainingAmount: 0,
      status: 'PAID',
      payAmount: 1000,
      payMethod: 'NAGAD',
      receiptNumber: 'RCT-2026-00002',
      ref: 'NG-TRX-20202',
    },
    {
      code: 'DIC-2026-00003',
      tierName: 'GENERAL_MEMBER',
      dueNumber: 'DUE-2026-00003',
      amount: 500,
      paidAmount: 0,
      remainingAmount: 500,
      status: 'PENDING',
      payAmount: 0,
    },
    {
      code: 'DIC-2026-00004',
      tierName: 'GENERAL_MEMBER',
      dueNumber: 'DUE-2026-00004',
      amount: 500,
      paidAmount: 300,
      remainingAmount: 200,
      status: 'PARTIALLY_PAID',
      payAmount: 300,
      payMethod: 'BKASH',
      receiptNumber: 'RCT-2026-00003',
      ref: 'BK-TRX-30303',
    },
    {
      code: 'DIC-2026-00005',
      tierName: 'ALUMNI_MEMBER',
      dueNumber: 'DUE-2026-00005',
      amount: 1500,
      paidAmount: 1500,
      remainingAmount: 0,
      status: 'PAID',
      payAmount: 1500,
      payMethod: 'BANK_TRANSFER',
      receiptNumber: 'RCT-2026-00004',
      ref: 'EBL-TRF-40404',
    },
    {
      code: 'DIC-2026-00006',
      tierName: 'LIFETIME_MEMBER',
      dueNumber: 'DUE-2026-00006',
      amount: 5000,
      paidAmount: 5000,
      remainingAmount: 0,
      status: 'PAID',
      payAmount: 5000,
      payMethod: 'BANK_TRANSFER',
      receiptNumber: 'RCT-2026-00005',
      ref: 'EBL-TRF-50505',
    },
  ];

  for (const cfg of duesConfigs) {
    const member = membersMap[cfg.code];
    const mType = typesMap[cfg.tierName];
    if (!member || !mType) continue;

    // member_memberships
    let memRecord = null;
    const { data: existingMem } = await supabase
      .from('member_memberships')
      .select('*')
      .eq('member_id', member.id)
      .maybeSingle();

    if (existingMem) {
      memRecord = existingMem;
    } else {
      const { data: newMem } = await supabase
        .from('member_memberships')
        .insert({
          member_id: member.id,
          membership_type_id: mType.id,
          start_date: member.joined_date,
          status: 'ACTIVE',
          joining_fee_amount: mType.joining_fee,
          renewal_fee_amount: mType.renewal_fee,
        })
        .select()
        .single();
      memRecord = newMem;
    }

    // member_dues
    let dueRecord = null;
    const { data: existingDue } = await supabase
      .from('member_dues')
      .select('*')
      .eq('due_number', cfg.dueNumber)
      .maybeSingle();

    if (existingDue) {
      dueRecord = existingDue;
    } else {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data: newDue, error: dueErr } = await supabase
        .from('member_dues')
        .insert({
          due_number: cfg.dueNumber,
          member_id: member.id,
          membership_id: memRecord?.id || null,
          due_type: 'MEMBERSHIP_FEE',
          title: `${mType.name.replace(/_/g, ' ')} Joining Fee`,
          description: `Initial membership admission fee for ${mType.name.replace(/_/g, ' ')} tier`,
          amount: cfg.amount,
          paid_amount: cfg.paidAmount,
          remaining_amount: cfg.remainingAmount,
          due_date: dueDate.toISOString().split('T')[0],
          status: cfg.status,
          created_by: adminId,
        })
        .select()
        .single();

      if (dueErr) console.error('Error creating due:', dueErr);
      dueRecord = newDue;
    }

    // member_payments & receipt
    if (cfg.payAmount > 0 && dueRecord) {
      const { data: existingPay } = await supabase
        .from('member_payments')
        .select('*')
        .eq('receipt_number', cfg.receiptNumber)
        .maybeSingle();

      if (!existingPay) {
        const payNum = cfg.dueNumber.replace('DUE', 'PAY');
        await supabase.from('member_payments').insert({
          payment_number: payNum,
          receipt_number: cfg.receiptNumber,
          member_id: member.id,
          due_id: dueRecord.id,
          amount: cfg.payAmount,
          payment_method: cfg.payMethod,
          reference_number: cfg.ref,
          financial_account_id: accountId,
          status: 'VERIFIED',
          verified_by: treasurerId,
          verified_at: new Date().toISOString(),
          recorded_by: adminId,
          created_at: member.joined_date ? new Date(member.joined_date).toISOString() : new Date().toISOString(),
        });
      }
    }
  }
  console.log('✓ Member dues and verified payments restored');

  // 5. Restore Donation Demo
  const { data: existingDon } = await supabase.from('donations').select('*').limit(1).maybeSingle();
  if (!existingDon) {
    await supabase.from('donations').insert({
      donation_number: 'DON-2026-00001',
      receipt_number: 'RCT-DON-2026-00001',
      donor_name: 'Shahriar Kabir',
      donor_type: 'INDIVIDUAL',
      email: 'shahriar.alumni@diu.edu.bd',
      phone: '01819998877',
      amount: 5000,
      financial_account_id: accountId,
      payment_method: 'BANK_TRANSFER',
      reference_number: 'EBL-TRF-44102',
      purpose: 'Investment Research Software Fund',
      status: 'VERIFIED',
      verified_by: treasurerId,
      verified_at: new Date().toISOString(),
      created_by: adminId,
    });
    console.log('✓ Demo donation restored');
  }

  // 6. Restore Sponsor & Sponsorship Demo
  const { data: existingSponsor } = await supabase.from('sponsors').select('*').limit(1).maybeSingle();
  if (!existingSponsor) {
    const { data: sponsor } = await supabase.from('sponsors').insert({
      sponsor_code: 'SPN-2026-00001',
      name: 'LankaBangla Securities',
      organization_name: 'LankaBangla Securities Ltd.',
      contact_person: 'Md. Rafiqul Islam, Head of Institutional Research',
      email: 'research@lankabangla.com',
      phone: '01912345678',
      website: 'https://lankabangla.com',
      created_by: adminId,
    }).select().single();

    if (sponsor) {
      const { data: spAgreement } = await supabase.from('sponsorships').insert({
        sponsorship_number: 'SP-AGR-2026-00001',
        sponsor_id: sponsor.id,
        title: 'DIU Investment Research Lab Title Partner',
        description: 'Annual sponsorship for club Bloomberg terminal research & financial market workshops',
        agreed_amount: 40000,
        received_amount: 25000,
        due_date: new Date().toISOString().split('T')[0],
        status: 'PARTIALLY_RECEIVED',
        created_by: adminId,
      }).select().single();

      if (spAgreement) {
        await supabase.from('sponsorship_payments').insert({
          payment_number: 'SP-PAY-2026-00001',
          receipt_number: 'RCT-SPN-2026-00001',
          sponsorship_id: spAgreement.id,
          amount: 25000,
          payment_method: 'BANK_TRANSFER',
          financial_account_id: accountId,
          reference_number: 'LB-CHQ-10992',
          status: 'VERIFIED',
          verified_by: treasurerId,
          verified_at: new Date().toISOString(),
          recorded_by: adminId,
        });
      }
    }
    console.log('✓ Demo sponsor & sponsorship restored');
  }

  console.log('🎉 ALL MEMBER DEMO INFORMATION SUCCESSFULLY RESTORED!');
}

restoreDemoData().catch(err => {
  console.error('Failed to restore demo data:', err);
  process.exit(1);
});
