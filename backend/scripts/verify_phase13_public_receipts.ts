/**
 * Phase 13 Verification Script:
 * 1. Public Digital Receipts (Token validation, safe data exposure, 404 behavior, rate limiting)
 * 2. Payment Confirmation Email Template (Receipt URL pointing to https://invesmentclub.top/receipt/{token})
 * 3. System Diagnostics & Lightweight Health Check
 */

import { supabaseClient } from '../src/config/supabase';
import { memberPaymentsRepository } from '../src/modules/member-payments/member-payments.repository';
import { renderPaymentConfirmationEmail } from '../src/modules/email/email.templates';
import { createApp } from '../src/app';
import http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function runPhase13Verification() {
  console.log('====================================================');
  console.log('PHASE 13 PRODUCTION VERIFICATION: MONITORING & RECEIPTS');
  console.log('====================================================\n');

  // 1. Check Database Migration: receipt_token in member_payments
  try {
    const { data: payments, error } = await supabaseClient
      .from('member_payments')
      .select('id, payment_number, receipt_number, receipt_token, status')
      .eq('status', 'VERIFIED')
      .not('receipt_token', 'is', null)
      .limit(3);

    if (error) throw new Error(error.message);

    if (!payments || payments.length === 0) {
      throw new Error('No VERIFIED payments with receipt_token found in database');
    }

    const samplePayment = payments[0];
    const is64Hex = /^[a-f0-9]{64}$/i.test(samplePayment.receipt_token);

    results.push({
      name: '1. Database Token Migration',
      passed: is64Hex,
      details: `Sample payment ${samplePayment.payment_number} has 64-char hex token: ${samplePayment.receipt_token.slice(0, 16)}...`,
    });
  } catch (err: any) {
    results.push({
      name: '1. Database Token Migration',
      passed: false,
      error: err.message,
    });
  }

  // 2. Start Test Server & Test Public Receipt Endpoint (Without Auth)
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 2A. Find a verified payment token
    const verifiedPayment = await supabaseClient
      .from('member_payments')
      .select('receipt_token, payment_number')
      .eq('status', 'VERIFIED')
      .not('receipt_token', 'is', null)
      .limit(1)
      .single();

    const validToken = verifiedPayment.data?.receipt_token;

    if (validToken) {
      const res = await fetch(`${baseUrl}/api/v1/public/receipts/${validToken}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const json: any = await res.json();
      const hasSafeFields =
        json.success === true &&
        json.data?.receiptNumber &&
        json.data?.member?.fullName &&
        json.data?.amount &&
        json.data?.status === 'CONFIRMED' &&
        json.data?.club?.name === 'DIU Investment Club';

      // Ensure NO sensitive fields leaked
      const noSensitiveLeaks =
        !json.data?.financial_account_id &&
        !json.data?.income_id &&
        !json.data?.transaction_id &&
        !json.data?.created_by;

      results.push({
        name: '2. Public Receipt Endpoint (Unauthenticated)',
        passed: res.status === 200 && hasSafeFields && noSensitiveLeaks,
        details: `HTTP ${res.status}, Receipt #${json.data?.receiptNumber}, Amount: ৳${json.data?.amount}, Zero internal financial IDs exposed.`,
      });
    }

    // 2B. Test Invalid Token -> 404
    const fakeToken = 'a'.repeat(64);
    const res404 = await fetch(`${baseUrl}/api/v1/public/receipts/${fakeToken}`, {
      method: 'GET',
    });
    const json404: any = await res404.json();

    results.push({
      name: '3. Invalid Receipt Token 404 Security',
      passed: res404.status === 404 && json404.error?.code === 'RECEIPT_NOT_FOUND',
      details: `HTTP ${res404.status}, Error Code: ${json404.error?.code}`,
    });

    // 2C. Test Malformed Token -> 404
    const resMalformed = await fetch(`${baseUrl}/api/v1/public/receipts/predictable-id-123`, {
      method: 'GET',
    });
    results.push({
      name: '4. Malformed Token Rejection',
      passed: resMalformed.status === 404,
      details: `HTTP ${resMalformed.status} - Predictable / non-hex token rejected safely`,
    });

    // 2D. Test Health Endpoint
    const resHealth = await fetch(`${baseUrl}/api/v1/health`, { method: 'GET' });
    const jsonHealth: any = await resHealth.json();

    results.push({
      name: '5. Lightweight Production Health Check',
      passed: resHealth.status === 200 && jsonHealth.status === 'operational',
      details: `HTTP ${resHealth.status}, uptime: ${jsonHealth.uptimeSeconds}s, service: ${jsonHealth.service}`,
    });

    // 2E. Test System Diagnostics Endpoint
    const resDiag = await fetch(`${baseUrl}/api/v1/system/diagnostics`, { method: 'GET' });
    const jsonDiag: any = await resDiag.json();

    const hasIndicators =
      jsonDiag.indicators?.apiStatus &&
      jsonDiag.indicators?.databaseStatus &&
      jsonDiag.indicators?.emailStatus &&
      jsonDiag.indicators?.backgroundJobsStatus;

    results.push({
      name: '6. System Diagnostics & Subsystem Indicators',
      passed: resDiag.status === 200 && Boolean(hasIndicators),
      details: `API: ${jsonDiag.indicators?.apiStatus} | DB: ${jsonDiag.indicators?.databaseStatus} | Email: ${jsonDiag.indicators?.emailStatus} | BG Jobs: ${jsonDiag.indicators?.backgroundJobsStatus}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Public Receipt & Diagnostics Suite',
      passed: false,
      error: err.message,
    });
  } finally {
    server.close();
  }

  // 3. Test Email Template Generation with Receipt Token
  try {
    const testToken = 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';
    const email = renderPaymentConfirmationEmail({
      memberName: 'Test Member',
      amount: 500,
      paymentReference: 'PAY-2026-99999',
      paymentDate: '2026-09-10',
      receiptNumber: 'RCT-2026-99999',
      receiptToken: testToken,
      recipientEmail: 'member@example.com',
    });

    const expectedUrl = `https://invesmentclub.top/receipt/${testToken}`;
    const containsHtmlUrl = email.html.includes(expectedUrl);
    const containsTextUrl = email.text.includes(expectedUrl);
    const noOldDomain = !email.html.includes('investmentclub.top') && !email.text.includes('investmentclub.top');

    results.push({
      name: '7. Payment Email Digital Receipt Link & Domain Rule',
      passed: containsHtmlUrl && containsTextUrl && noOldDomain,
      details: `Button & text link correctly set to: ${expectedUrl}. No old domain occurrences.`,
    });
  } catch (err: any) {
    results.push({
      name: '7. Payment Email Digital Receipt Link',
      passed: false,
      error: err.message,
    });
  }

  // Summary
  console.log('\n====================================================');
  console.log('PHASE 13 TEST RESULTS SUMMARY:');
  console.log('====================================================');
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? '✅' : '❌';
    console.log(`${mark} ${r.name}`);
    if (r.details) console.log(`   Details: ${r.details}`);
    if (r.error) console.log(`   Error: ${r.error}`);
    if (!r.passed) allPassed = false;
  }
  console.log('====================================================');
  console.log(allPassed ? '🎉 ALL PHASE 13 TESTS PASSED SUCCESSFULLY' : '⚠️ SOME TESTS FAILED');
  console.log('====================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runPhase13Verification();
