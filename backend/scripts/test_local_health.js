require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const { createApp } = require('../dist/app');

async function testLocalHealth() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log('Local test server running on port:', port);

  try {
    const t0 = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    const latency = Date.now() - t0;
    const json = await res.json();
    console.log('\n--- LOCAL /api/v1/health RESULT ---');
    console.log('Status Code:', res.status);
    console.log('Latency:', latency + 'ms');
    console.log('Response Body:', JSON.stringify(json, null, 2));

    const resRoot = await fetch(`http://127.0.0.1:${port}/health`);
    console.log('\n--- LOCAL /health RESULT ---');
    console.log('Status Code:', resRoot.status);
    console.log('Response Body:', JSON.stringify(await resRoot.json(), null, 2));
  } finally {
    server.close();
  }
}

testLocalHealth().catch(console.error);
