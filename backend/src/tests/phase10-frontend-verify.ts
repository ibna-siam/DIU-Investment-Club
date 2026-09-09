const FRONTEND_BASE = 'http://localhost:3000';

async function verifyFrontendPages() {
  console.log('====================================================');
  console.log('PHASE 10: FRONTEND PAGES VERIFICATION SUITE');
  console.log('====================================================\n');

  const routes = [
    '/audit',
    '/audit/reports',
    '/reconciliation',
    '/bank-reconciliation',
    '/internal-controls',
    '/compliance',
    '/exceptions',
    '/risk-flags',
    '/communication-templates',
    '/integrations',
    '/webhooks',
  ];

  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const res = await fetch(`${FRONTEND_BASE}${route}`);
      if (res.status === 200) {
        console.log(`✅ PASS: [200 OK] ${route}`);
        passed++;
      } else {
        console.error(`❌ FAIL: [${res.status}] ${route}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`❌ FAIL: ${route} - ${err.message}`);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(`FRONTEND VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

verifyFrontendPages();
