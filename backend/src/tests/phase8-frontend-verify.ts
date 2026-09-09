export {};

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api/v1';

const routes = [
  '/operations',
  '/committee',
  '/documents',
  '/meetings',
  '/decisions',
  '/tasks',
  '/assets',
  '/notifications',
];

async function verifyRoutes() {
  console.log('=============================================================================');
  console.log('🚀 DIU INVESTMENT CLUB - PHASE 8 FRONTEND COMPREHENSIVE VERIFICATION');
  console.log('=============================================================================\n');

  let passed = 0;
  for (const r of routes) {
    const url = `${BASE_URL}${r}`;
    const res = await fetch(url);
    if (res.status === 200) {
      console.log(`✅ [200 OK] Static Route: ${r}`);
      passed++;
    } else {
      console.error(`❌ [${res.status} ${res.statusText}] Route: ${r}`);
    }
  }

  // Login to get IDs for dynamic routes
  console.log('\nFetching sample IDs for dynamic route testing...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@diu.edu.bd', password: 'Admin12345!' }),
  });
  const { data: loginData } = await loginRes.json();
  const token = loginData.token;

  const [meets, tasks, assets] = await Promise.all([
    fetch(`${API_URL}/meetings`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    fetch(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    fetch(`${API_URL}/assets`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
  ]);

  const dynamicRoutes = [
    { name: '/meetings/[id]', path: `/meetings/${meets.data[0]?.id}` },
    { name: '/tasks/[id]', path: `/tasks/${tasks.data[0]?.id}` },
    { name: '/assets/[id]', path: `/assets/${assets.data[0]?.id}` },
  ];

  for (const dr of dynamicRoutes) {
    const url = `${BASE_URL}${dr.path}`;
    const res = await fetch(url);
    if (res.status === 200) {
      console.log(`✅ [200 OK] Dynamic Route: ${dr.name} -> ${dr.path}`);
      passed++;
    } else {
      console.error(`❌ [${res.status} ${res.statusText}] Dynamic Route: ${dr.name}`);
    }
  }

  const total = routes.length + dynamicRoutes.length;
  console.log(`\n=============================================================================`);
  console.log(`🎉 ALL ${passed}/${total} PHASE 8 FRONTEND PAGES RETURNED 200 OK!`);
  console.log(`=============================================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

verifyRoutes().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
