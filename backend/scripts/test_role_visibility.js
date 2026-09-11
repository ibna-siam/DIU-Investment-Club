const API_URL = 'https://api.invesmentclub.top/api/v1';

async function testUser(email, password, label) {
  console.log(`\n====================================================`);
  console.log(`TESTING USER: ${label} (${email})`);
  console.log(`====================================================`);

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.error(`❌ Login failed (${loginRes.status}):`, await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  const user = loginData.data?.user;
  console.log(`✅ Login success: User ID ${user?.id}, Roles:`, user?.roles?.map(r => r.slug || r.name));

  const headers = { 'Authorization': `Bearer ${token}` };

  const endpoints = [
    { name: 'Financial Accounts', url: '/accounts' },
    { name: 'Income Records', url: '/income' },
    { name: 'Expense Records', url: '/expenses' },
    { name: 'Transactions', url: '/transactions' },
    { name: 'Accounting Dashboard', url: '/accounting/dashboard' },
    { name: 'Chart of Accounts', url: '/chart-of-accounts' },
    { name: 'Journal Entries', url: '/journal-entries' },
    { name: 'Vouchers', url: '/vouchers' },
    { name: 'Financial Years', url: '/financial-years/years' },
    { name: 'Members Directory', url: '/members' },
    { name: 'Tasks', url: '/tasks' },
    { name: 'Events', url: '/events' },
    { name: 'Meetings', url: '/meetings' },
    { name: 'Decisions', url: '/decisions' },
    { name: 'Automation Rules', url: '/automation/rules' },
    { name: 'Execution Logs', url: '/automation/logs' },
    { name: 'Audit Logs', url: '/audit-logs' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${API_URL}${ep.url}`, { headers });
      const json = await res.json();
      let count = 0;
      if (Array.isArray(json.data)) {
        count = json.data.length;
      } else if (json.data && Array.isArray(json.data.data)) {
        count = json.data.data.length;
      } else if (json.data && typeof json.data === 'object') {
        count = 'OBJECT';
      }

      if (res.status === 200) {
        console.log(`  ✅ [${res.status}] ${ep.name.padEnd(25)} -> Count: ${count}`);
      } else if (res.status === 403) {
        console.log(`  🔒 [403 FORBIDDEN] ${ep.name.padEnd(25)} -> ${json.error?.message}`);
      } else {
        console.log(`  ❌ [${res.status}] ${ep.name.padEnd(25)} -> Error: ${json.error?.message || JSON.stringify(json)}`);
      }
    } catch (e) {
      console.log(`  💥 [FETCH ERROR] ${ep.name.padEnd(25)} -> ${e.message}`);
    }
  }
}

async function run() {
  const users = [
    { email: 'demo.superadmin@diu.edu.bd', label: 'SUPER ADMIN' },
    { email: 'demo.treasurer@diu.edu.bd', label: 'TREASURER' },
    { email: 'demo.auditor@diu.edu.bd', label: 'AUDITOR' },
    { email: 'demo.president@diu.edu.bd', label: 'PRESIDENT' },
    { email: 'demo.generalsecretary@diu.edu.bd', label: 'GENERAL SECRETARY' },
    { email: 'demo.eventmanager@diu.edu.bd', label: 'EVENT MANAGER' },
    { email: 'demo.executive@diu.edu.bd', label: 'EXECUTIVE MEMBER' },
    { email: 'demo.member@diu.edu.bd', label: 'GENERAL MEMBER' },
  ];

  for (const u of users) {
    await testUser(u.email, 'Password123!', u.label);
  }
}

run().catch(console.error);
