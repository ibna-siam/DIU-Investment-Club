export {};

const FRONTEND_URL = 'http://localhost:3000';

const routes = [
  '/automation',
  '/automation/rules',
  '/automation/logs',
  '/recurring-operations',
  '/reminders',
  '/month-end',
];

async function verifyFrontendRoutes() {
  console.log('=============================================================================');
  console.log('🌐 DIU INVESTMENT CLUB - PHASE 9 FRONTEND ROUTES VERIFICATION');
  console.log('=============================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const res = await fetch(`${FRONTEND_URL}${route}`);
      if (res.status === 200) {
        console.log(`✅ [PASS] Route: ${route} -> Status: 200 OK`);
        passed++;
      } else {
        console.error(`❌ [FAIL] Route: ${route} -> Status: ${res.status}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`❌ [ERROR] Route: ${route} -> ${err.message}`);
      failed++;
    }
  }

  console.log('\n=============================================================================');
  console.log(`📊 FRONTEND ROUTES SUMMARY: ${passed}/${routes.length} PASSED, ${failed} FAILED`);
  console.log('=============================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyFrontendRoutes();
