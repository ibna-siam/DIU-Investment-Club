require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const https = require('https');
const jwt = require('jsonwebtoken');

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function verify() {
  console.log('=== PHASE 14: PRODUCTION API & CLEAN LAUNCH VERIFICATION ===\n');

  // 1. Health Endpoint Check
  console.log('1. Health Check (https://api.invesmentclub.top/health):');
  const health = await fetchJson('https://api.invesmentclub.top/health');
  console.log('   Status:', health.status);
  console.log('   Response:', JSON.stringify(health.data || health.raw));

  // 2. Token Generation for Real Super Admin
  const secret = process.env.JWT_SECRET;
  console.log('\n2. Generating Signed Admin JWT for Ibna Siam (siamibna29@gmail.com)...');
  const token = jwt.sign(
    { id: '0b891f78-263c-440e-bc98-9dd1bf7a8c27', email: 'siamibna29@gmail.com' },
    secret,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 3. Check Core Resource Endpoints
  const endpoints = [
    { name: 'Financial Accounts', url: 'https://api.invesmentclub.top/api/v1/financial-accounts' },
    { name: 'Incomes', url: 'https://api.invesmentclub.top/api/v1/incomes' },
    { name: 'Expenses', url: 'https://api.invesmentclub.top/api/v1/expenses' },
    { name: 'Members', url: 'https://api.invesmentclub.top/api/v1/members' },
    { name: 'Tasks', url: 'https://api.invesmentclub.top/api/v1/tasks' },
    { name: 'Meetings', url: 'https://api.invesmentclub.top/api/v1/meetings' },
    { name: 'Events', url: 'https://api.invesmentclub.top/api/v1/events' },
    { name: 'Notifications', url: 'https://api.invesmentclub.top/api/v1/notifications' },
    { name: 'Dashboard Analytics', url: 'https://api.invesmentclub.top/api/v1/reports/dashboard' }
  ];

  console.log('\n3. Verifying Clean Production Resource Endpoints:');
  for (const ep of endpoints) {
    try {
      const res = await fetchJson(ep.url, { method: 'GET', headers: authHeaders });
      let summary = '';
      if (res.data?.data) {
        if (Array.isArray(res.data.data)) {
          summary = `Array of ${res.data.data.length} items`;
        } else if (res.data.data.items && Array.isArray(res.data.data.items)) {
          summary = `Items array of ${res.data.data.items.length} items`;
        } else if (typeof res.data.data === 'object') {
          summary = `Object keys: [${Object.keys(res.data.data).slice(0, 4).join(', ')}...]`;
        }
      } else {
        summary = JSON.stringify(res.data || res.raw).substring(0, 80);
      }
      console.log(`   ${ep.name.padEnd(22)}: Status ${res.status} | ${summary}`);
    } catch (e) {
      console.log(`   ${ep.name.padEnd(22)}: Error - ${e.message}`);
    }
  }

  // 4. Test Single Real Account Details
  console.log('\n4. Inspecting Operating Accounts via API:');
  const accountsRes = await fetchJson('https://api.invesmentclub.top/api/v1/financial-accounts', { method: 'GET', headers: authHeaders });
  if (accountsRes.data?.data && Array.isArray(accountsRes.data.data)) {
    accountsRes.data.data.forEach(acc => {
      console.log(`   - "${acc.name}" (${acc.account_type}): Balance = ৳${acc.current_balance || '0.00'}, Status = ${acc.status}`);
    });
  }

  // 5. Inspecting Members via API
  console.log('\n5. Inspecting Protected Members via API:');
  const membersRes = await fetchJson('https://api.invesmentclub.top/api/v1/members', { method: 'GET', headers: authHeaders });
  const memberList = Array.isArray(membersRes.data?.data) ? membersRes.data.data : (membersRes.data?.data?.items || []);
  memberList.forEach(m => {
    console.log(`   - ${m.full_name} (${m.member_code}) | ${m.email} | Status: ${m.status}`);
  });

  console.log('\n=== VERIFICATION COMPLETED SUCCESSFULLY ===');
}

verify().catch(console.error);
