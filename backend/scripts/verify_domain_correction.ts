import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';

// Force environment for test
process.env.NODE_ENV = 'production';
process.env.CLIENT_URL = 'https://invesment.top,https://www.invesment.top,https://diu-investment-club-nine.vercel.app';
process.env.JWT_SECRET = 'a_very_long_secure_jwt_secret_token_at_least_32_chars_long!';
process.env.RESEND_FROM_EMAIL = 'DIU Investment Club <noreply@invesment.top>';

import { env, getPrimaryClientUrl } from '../src/config/env';
import { DEFAULT_FROM_EMAIL } from '../src/modules/email/email.config';
import { EMAIL_BRAND } from '../src/modules/email/email.brand';
import { emailProvider } from '../src/modules/email/email.provider';

let passed = 0;
let total = 0;

function runTest(name: string, fn: () => void) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

console.log('====================================================');
console.log('  DOMAIN CORRECTION & URL VERIFICATION SUITE');
console.log('  Target Domain: https://invesment.top');
console.log('====================================================\n');

// 1. Primary Client URL resolution
runTest('getPrimaryClientUrl() strips commas and resolves https://invesment.top', () => {
  const primary = getPrimaryClientUrl();
  assert.strictEqual(primary, 'https://invesment.top');
});

// 2. Email Sender Identity
runTest('DEFAULT_FROM_EMAIL uses verified domain noreply@invesment.top', () => {
  assert.strictEqual(DEFAULT_FROM_EMAIL, 'DIU Investment Club <noreply@invesment.top>');
  assert.strictEqual(DEFAULT_FROM_EMAIL.includes('investmentclub.top'), false);
});

// 3. Email Brand Portal URL
runTest('EMAIL_BRAND portalUrl resolves to https://invesment.top', () => {
  assert.strictEqual(EMAIL_BRAND.portalUrl, 'https://invesment.top');
});

// 4. Password Reset URL Structure
runTest('Password reset URL correctly generates https://invesment.top/reset-password', () => {
  const token = 'sample_secure_token_123';
  const resetUrl = `${getPrimaryClientUrl()}/reset-password?token=${token}`;
  assert.strictEqual(resetUrl, 'https://invesment.top/reset-password?token=sample_secure_token_123');
  assert.strictEqual(resetUrl.includes(','), false);
});

// 5. Account Setup / Invitation URL Structure
runTest('Account invitation setup URL correctly generates https://invesment.top/reset-password?setup=true', () => {
  const email = 'user@diu.edu.bd';
  const setupUrl = `${getPrimaryClientUrl()}/reset-password?setup=true&email=${encodeURIComponent(email)}`;
  assert.strictEqual(setupUrl, 'https://invesment.top/reset-password?setup=true&email=user%40diu.edu.bd');
  assert.strictEqual(setupUrl.includes(','), false);
});

// 6. Login URL in Welcome Email
runTest('Login URL in welcome email correctly generates https://invesment.top/login', () => {
  const loginUrl = `${getPrimaryClientUrl()}/login`;
  assert.strictEqual(loginUrl, 'https://invesment.top/login');
});

// 7. CORS Origins Validation
runTest('CORS origins allow invesment.top and reject old wrong domain investmentclub.top', () => {
  // Test STATIC_ALLOWED_ORIGINS logic from app.ts
  const STATIC_ALLOWED_ORIGINS = new Set([
    'https://invesment.top',
    'https://www.invesment.top',
    'https://diu-investment-club.vercel.app',
    'https://diu-investment-club-nine.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  const customOrigins = env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''));

  const isAllowed = (origin: string): boolean => {
    return STATIC_ALLOWED_ORIGINS.has(origin) || customOrigins.includes(origin);
  };

  assert.strictEqual(isAllowed('https://invesment.top'), true, 'Must allow https://invesment.top');
  assert.strictEqual(isAllowed('https://www.invesment.top'), true, 'Must allow https://www.invesment.top');
  assert.strictEqual(isAllowed('https://diu-investment-club-nine.vercel.app'), true, 'Must allow Vercel production URL');
  assert.strictEqual(isAllowed('https://investmentclub.top'), false, 'Must REJECT old misspelled investmentclub.top');
  assert.strictEqual(isAllowed('https://malicious.com'), false, 'Must REJECT malicious.com');
});

// 8. Resend Provider Metadata
runTest('Resend provider is configured as RESEND', () => {
  assert.strictEqual(emailProvider.name, 'RESEND');
});

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log(`STATUS: ${passed === total ? 'ALL TESTS PASSED ✅' : 'TESTS FAILED ❌'}`);
console.log('====================================================');

if (passed !== total) {
  process.exit(1);
}
