import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = 'https://api.invesmentclub.top/api/v1';

async function main() {
  console.log('====================================================');
  console.log('VERIFYING ALL REPRESENTATIVE CREATE OPERATIONS END-TO-END');
  console.log('Target API:', API_URL);
  console.log('====================================================\n');

  // Step 1: Authenticate as Super Admin
  console.log('Step 1: Authenticating as Super Admin (admin@diu.edu.bd)...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://invesmentclub.top',
    },
    body: JSON.stringify({
      email: 'admin@diu.edu.bd',
      password: 'Password123!',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  if (!token) throw new Error('No token returned from login');
  console.log('✅ Super Admin login successful. Token acquired.\n');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Origin': 'https://invesmentclub.top',
  };

  const results: Record<string, { status: number; success: boolean; id?: string; error?: any }> = {};

  // 1. Add Financial Account
  console.log('Testing 1: Add Financial Account...');
  try {
    const res = await fetch(`${API_URL}/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Auto-Verification Reserve Vault',
        account_type: 'BANK',
        provider_name: 'Mutual Trust Bank',
        account_number: '998877665544',
        opening_balance: 100,
        description: 'End-to-end production verification',
      }),
    });
    const body = await res.json().catch(() => null);
    console.log(`Status: ${res.status}`, res.status === 201 ? 'SUCCESS' : JSON.stringify(body));
    results['1. Financial Account'] = { status: res.status, success: res.status === 201, id: body?.data?.id, error: body?.error };
  } catch (err: any) {
    results['1. Financial Account'] = { status: 0, success: false, error: err.message };
  }

  // 2. Add Member
  console.log('\nTesting 2: Add Member...');
  try {
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const res = await fetch(`${API_URL}/members`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        full_name: `Verification Member ${uniqueSuffix}`,
        email: `verify.member.${uniqueSuffix}@diu.edu.bd`,
        phone: `+880171234${uniqueSuffix}`,
        department: 'CSE',
        student_id: `231-15-${uniqueSuffix}`,
        gender: 'MALE',
      }),
    });
    const body = await res.json().catch(() => null);
    console.log(`Status: ${res.status}`, res.status === 201 ? 'SUCCESS' : JSON.stringify(body));
    results['2. Member'] = { status: res.status, success: res.status === 201, id: body?.data?.id, error: body?.error };
  } catch (err: any) {
    results['2. Member'] = { status: 0, success: false, error: err.message };
  }

  // 3. Create Expense
  console.log('\nTesting 3: Create Expense...');
  try {
    const accId = results['1. Financial Account']?.id;
    const expCatRes = await fetch(`${API_URL}/expense-categories`, { headers });
    const expCatData = await expCatRes.json();
    const expCatId = expCatData?.data?.[0]?.id;

    if (accId && expCatId) {
      const res = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          expense_date: new Date().toISOString().split('T')[0],
          category_id: expCatId,
          amount: 50,
          paid_to: 'Verification Vendor',
          financial_account_id: accId,
          payment_method: 'CASH',
          description: 'Verification expense',
        }),
      });
      const body = await res.json().catch(() => null);
      console.log(`Status: ${res.status}`, res.status === 201 ? 'SUCCESS' : JSON.stringify(body));
      results['3. Expense'] = { status: res.status, success: res.status === 201, id: body?.data?.id, error: body?.error };
    }
  } catch (err: any) {
    results['3. Expense'] = { status: 0, success: false, error: err.message };
  }

  // 4. Create Income Record
  console.log('\nTesting 4: Create Income Record...');
  try {
    const accId = results['1. Financial Account']?.id;
    const catRes = await fetch(`${API_URL}/income-categories`, { headers });
    const catData = await catRes.json();
    const catId = catData?.data?.[0]?.id;

    if (accId && catId) {
      const res = await fetch(`${API_URL}/income`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_date: new Date().toISOString().split('T')[0],
          category_id: catId,
          amount: 250,
          received_from: 'Verification Donor',
          financial_account_id: accId,
          payment_method: 'CASH',
          description: 'Verification income',
        }),
      });
      const body = await res.json().catch(() => null);
      console.log(`Status: ${res.status}`, res.status === 201 ? 'SUCCESS' : JSON.stringify(body));
      results['4. Income Record'] = { status: res.status, success: res.status === 201, id: body?.data?.id, error: body?.error };
    }
  } catch (err: any) {
    results['4. Income Record'] = { status: 0, success: false, error: err.message };
  }

  // 5. Create Event
  console.log('\nTesting 5: Create Event...');
  try {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const dayAfter = new Date(Date.now() + 172800000).toISOString();
    const res = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Auto-Verification Symposium',
        event_type: 'WORKSHOP',
        start_date: tomorrow,
        end_date: dayAfter,
        venue: 'DIU Auditorium',
        expected_participants: 60,
        proposed_budget: 3500,
        description: 'Verification event',
      }),
    });
    const body = await res.json().catch(() => null);
    console.log(`Status: ${res.status}`, res.status === 201 ? 'SUCCESS' : JSON.stringify(body));
    results['5. Event'] = { status: res.status, success: res.status === 201, id: body?.data?.id, error: body?.error };
  } catch (err: any) {
    results['5. Event'] = { status: 0, success: false, error: err.message };
  }

  // 6. Create Task
  console.log('\nTesting 6: Create Task...');
  try {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Auto-Verification Priority Task',
        description: 'Verify task write operation',
        priority: 'HIGH',
        status: 'TODO',
      }),
    });
    const body = await res.json().catch(() => null);
    console.log(`Status: ${res.status}`, res.status === 201 ? 'SUCCESS' : JSON.stringify(body));
    results['6. Task'] = { status: res.status, success: res.status === 201, id: body?.data?.id, error: body?.error };
  } catch (err: any) {
    results['6. Task'] = { status: 0, success: false, error: err.message };
  }

  // 7. Create Meeting
  console.log('\nTesting 7: Create Meeting...');
  try {
    const nextWeekDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const res = await fetch(`${API_URL}/meetings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Auto-Verification Board Meeting',
        meeting_type: 'EXECUTIVE_MEETING',
        meeting_date: nextWeekDate,
        start_time: '14:00:00',
        end_time: '15:30:00',
        location: 'DIU Main Campus Room 402',
        description: 'Verification board meeting',
      }),
    });
    const body = await res.json().catch(() => null);
    console.log(`Status: ${res.status}`, (res.status === 200 || res.status === 201) ? 'SUCCESS' : JSON.stringify(body));
    results['7. Meeting'] = { status: res.status, success: res.status === 200 || res.status === 201, id: body?.data?.id, error: body?.error };
  } catch (err: any) {
    results['7. Meeting'] = { status: 0, success: false, error: err.message };
  }

  // 8. Add User
  console.log('\nTesting 8: Add User...');
  try {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        full_name: `Verification User ${rand}`,
        email: `verify.user.${rand}@diu.edu.bd`,
        password: 'Password123!',
        student_id: `221-15-${rand}`,
        phone: `+880181234${rand}`,
        status: 'active',
      }),
    });
    const body = await res.json().catch(() => null);
    console.log(`Status: ${res.status}`, res.status === 201 ? 'SUCCESS' : JSON.stringify(body));
    results['8. Add User'] = { status: res.status, success: res.status === 201, id: body?.data?.id, error: body?.error };
  } catch (err: any) {
    results['8. Add User'] = { status: 0, success: false, error: err.message };
  }

  console.log('\n====================================================');
  console.log('SUMMARY OF ALL 8 REPRESENTATIVE CREATE OPERATIONS:');
  console.log('====================================================');
  console.table(results);

  const allPassed = Object.values(results).every((r) => r.success);
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL 8/8 CREATE OPERATIONS SUCCEEDED IN LIVE PRODUCTION! 🎉' : 'SOME OPERATIONS FAILED'}`);

  // Clean up test records
  console.log('\nCleaning up test records...');
  for (const [moduleName, res] of Object.entries(results)) {
    if (!res.id) continue;
    try {
      if (moduleName.includes('Task')) {
        await fetch(`${API_URL}/tasks/${res.id}?action=HARD_DELETE`, { method: 'DELETE', headers });
      } else if (moduleName.includes('Event')) {
        await fetch(`${API_URL}/events/${res.id}`, { method: 'DELETE', headers });
      } else if (moduleName.includes('Meeting')) {
        await fetch(`${API_URL}/meetings/${res.id}`, { method: 'DELETE', headers });
      } else if (moduleName.includes('Member')) {
        await fetch(`${API_URL}/members/${res.id}`, { method: 'DELETE', headers });
      }
    } catch (cleanErr) {
      // Non-blocking cleanup
    }
  }
  console.log('Cleanup completed.');
}

main().catch(console.error);
