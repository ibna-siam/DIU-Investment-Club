/**
 * Health Endpoint Audit Script
 */

async function testEndpoint(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    const latency = Date.now() - t0;
    const body = await res.json();
    return {
      url,
      status: res.status,
      latencyMs: latency,
      headers: Object.fromEntries(res.headers.entries()),
      body,
    };
  } catch (err) {
    return {
      url,
      error: err.message,
      latencyMs: Date.now() - t0,
    };
  }
}

(async () => {
  console.log('Testing Health Endpoints...\n');

  // Primary Custom Domain: GET /api/v1/health
  const r1 = await testEndpoint('https://api.invesmentclub.top/api/v1/health');
  console.log('1. https://api.invesmentclub.top/api/v1/health:');
  console.log('   Status:', r1.status, 'Latency:', r1.latencyMs + 'ms');
  console.log('   Body:', JSON.stringify(r1.body, null, 2));

  // Primary Custom Domain: GET /health
  const r2 = await testEndpoint('https://api.invesmentclub.top/health');
  console.log('\n2. https://api.invesmentclub.top/health:');
  console.log('   Status:', r2.status, 'Latency:', r2.latencyMs + 'ms');
  console.log('   Body:', JSON.stringify(r2.body, null, 2));

  // Render Fallback URL: GET /api/v1/health
  const r3 = await testEndpoint('https://diu-investment-club-api.onrender.com/api/v1/health');
  console.log('\n3. https://diu-investment-club-api.onrender.com/api/v1/health:');
  console.log('   Status:', r3.status, 'Latency:', r3.latencyMs + 'ms');
  console.log('   Body:', JSON.stringify(r3.body, null, 2));

  // Render Fallback URL: GET /health
  const r4 = await testEndpoint('https://diu-investment-club-api.onrender.com/health');
  console.log('\n4. https://diu-investment-club-api.onrender.com/health:');
  console.log('   Status:', r4.status, 'Latency:', r4.latencyMs + 'ms');
  console.log('   Body:', JSON.stringify(r4.body, null, 2));
})();
