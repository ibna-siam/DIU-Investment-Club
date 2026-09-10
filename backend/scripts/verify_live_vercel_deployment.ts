import https from 'https';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function request(url: string, options: https.RequestOptions, postData?: string): Promise<{ statusCode: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('LIVE VERCEL FRONTEND & RENDER API INTEGRATION TESTS');
  console.log('====================================================\n');

  const frontendUrl = 'https://diu-investment-club-nine.vercel.app';
  const backendUrl = 'https://diu-investment-club-api.onrender.com/api/v1';

  // 1. Test Vercel root page
  try {
    const res = await request(frontendUrl, { method: 'GET' });
    results.push({
      name: '1. Vercel Homepage loads (HTTP 200)',
      passed: res.statusCode === 200,
      details: `Status: ${res.statusCode}, Content-Length: ${res.headers['content-length'] || res.body.length}`,
    });
  } catch (err: any) {
    results.push({ name: '1. Vercel Homepage loads', passed: false, details: err.message });
  }

  // 2. Test Login page
  try {
    const res = await request(`${frontendUrl}/login`, { method: 'GET' });
    const hasForm = res.body.includes('Sign In to System') || res.body.includes('placeholder="••••••••••••"');
    results.push({
      name: '2. Login Page loads and renders form (HTTP 200)',
      passed: res.statusCode === 200 && hasForm,
      details: `Status: ${res.statusCode}, Form rendered: ${hasForm}`,
    });
  } catch (err: any) {
    results.push({ name: '2. Login Page loads', passed: false, details: err.message });
  }

  // 3. Test CORS Preflight from Vercel Origin
  try {
    const res = await request(`${backendUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: frontendUrl,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    const allowOrigin = res.headers['access-control-allow-origin'];
    const allowCreds = res.headers['access-control-allow-credentials'];
    results.push({
      name: '3. Backend CORS Preflight allows Vercel origin',
      passed: res.statusCode === 204 && allowOrigin === frontendUrl && allowCreds === 'true',
      details: `Status: ${res.statusCode}, Allow-Origin: ${allowOrigin}, Credentials: ${allowCreds}`,
    });
  } catch (err: any) {
    results.push({ name: '3. Backend CORS Preflight', passed: false, details: err.message });
  }

  // 4. Test CORS rejection on unauthorized origin
  try {
    const res = await request(`${backendUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://malicious-fake-site.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    const allowOrigin = res.headers['access-control-allow-origin'];
    results.push({
      name: '4. Backend CORS rejects unauthorized origin',
      passed: !allowOrigin || allowOrigin !== 'https://malicious-fake-site.com',
      details: `Allow-Origin header returned: ${allowOrigin || 'None (Correctly Rejected)'}`,
    });
  } catch (err: any) {
    results.push({ name: '4. Backend CORS rejection', passed: false, details: err.message });
  }

  // 5. Test Live API connectivity & Health from Frontend Origin
  try {
    const res = await request(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        Origin: frontendUrl,
      },
    });
    const parsed = JSON.parse(res.body);
    results.push({
      name: '5. Live Backend Health check succeeds via Vercel Origin',
      passed: res.statusCode === 200 && parsed.status === 'operational' && parsed.supabaseConnected === true,
      details: `Status: ${res.statusCode}, DB Operational: ${parsed.status}, Supabase: ${parsed.supabaseConnected}`,
    });
  } catch (err: any) {
    results.push({ name: '5. Live Backend Health check', passed: false, details: err.message });
  }

  // 6. Test Live Auth API Pipeline with Vercel Origin
  try {
    const payload = JSON.stringify({ email: 'nonexistent@test.com', password: 'Password123!' });
    const res = await request(
      `${backendUrl}/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload).toString(),
          Origin: frontendUrl,
        },
      },
      payload
    );
    const parsed = JSON.parse(res.body);
    const allowOrigin = res.headers['access-control-allow-origin'];
    results.push({
      name: '6. Live Auth API responds with proper 401 & CORS from Vercel Origin',
      passed: res.statusCode === 401 && allowOrigin === frontendUrl && (parsed.error?.code === 'INVALID_CREDENTIALS' || parsed.error?.code === 'UNAUTHORIZED'),
      details: `Status: ${res.statusCode}, ErrorCode: ${parsed.error?.code}, Message: ${parsed.error?.message}`,
    });
  } catch (err: any) {
    results.push({ name: '6. Live Auth API responds', passed: false, details: err.message });
  }

  // 7. Test Dashboard Route loads on Vercel
  try {
    const res = await request(`${frontendUrl}/dashboard`, { method: 'GET' });
    results.push({
      name: '7. Protected /dashboard page prerendered & available (HTTP 200)',
      passed: res.statusCode === 200,
      details: `Status: ${res.statusCode}, Size: ${res.body.length} bytes`,
    });
  } catch (err: any) {
    results.push({ name: '7. Dashboard route loads', passed: false, details: err.message });
  }

  // 8. Test Unauthorized Route loads on Vercel
  try {
    const res = await request(`${frontendUrl}/unauthorized`, { method: 'GET' });
    results.push({
      name: '8. Unauthorized route /unauthorized loads (HTTP 200)',
      passed: res.statusCode === 200,
      details: `Status: ${res.statusCode}, Size: ${res.body.length} bytes`,
    });
  } catch (err: any) {
    results.push({ name: '8. Unauthorized route', passed: false, details: err.message });
  }

  // 9. Test Security Headers on Vercel
  try {
    const res = await request(frontendUrl, { method: 'GET' });
    const hsts = res.headers['strict-transport-security'];
    const xcto = res.headers['x-content-type-options'];
    const xfo = res.headers['x-frame-options'];
    const passed = Boolean(hsts && xcto === 'nosniff' && xfo === 'SAMEORIGIN');
    results.push({
      name: '9. Security Headers active on Vercel responses',
      passed,
      details: `HSTS: ${hsts ? 'Active' : 'Missing'}, XCTO: ${xcto}, XFO: ${xfo}`,
    });
  } catch (err: any) {
    results.push({ name: '9. Security Headers on Vercel', passed: false, details: err.message });
  }

  // Print Summary
  console.log('\n--- VERIFICATION RESULTS ---');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    if (!r.passed) allPassed = false;
    console.log(`${icon} | ${r.name}`);
    console.log(`       Details: ${r.details}`);
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter((r) => r.passed).length} | FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('====================================================');
}

runTests();
