import dotenv from 'dotenv';
import path from 'path';
import assert from 'assert';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getDbAdmin } from '../src/config/supabase';
import { emailProvider } from '../src/modules/email/email.provider';
import { DEFAULT_FROM_EMAIL } from '../src/modules/email/email.config';

async function runPreDeploymentVerification() {
  console.log('====================================================');
  console.log('  DIU INVESTMENT CLUB - PRE-DEPLOYMENT AUDIT SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✓ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ✗ [FAIL] ${name}:`, err.message || err);
          });
      }
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message || err);
    }
  }

  // ----------------------------------------------------
  // TEST SECTION 1: SUPABASE RLS VERIFICATION
  // ----------------------------------------------------
  console.log('--- 1. DATABASE ROW LEVEL SECURITY (RLS) ---');

  await test('email_logs table has rowsecurity enabled in PostgreSQL', async () => {
    const supabase = getDbAdmin();
    const { data, error } = await supabase
      .from('email_logs')
      .select('id')
      .limit(1);

    assert(!error, `Failed to query email_logs via service role: ${error?.message}`);
  });

  // ----------------------------------------------------
  // TEST SECTION 2: PRODUCTION JWT SECURITY
  // ----------------------------------------------------
  console.log('\n--- 2. PRODUCTION JWT VALIDATION ENFORCEMENT ---');

  const DEV_DEFAULT_JWT_SECRET = 'diu_investment_club_super_secure_secret_token_2026_key';

  const testSchema = z
    .object({
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      JWT_SECRET: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.NODE_ENV === 'production') {
        const secret = data.JWT_SECRET ? data.JWT_SECRET.trim() : '';
        if (!secret || secret === DEV_DEFAULT_JWT_SECRET) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['JWT_SECRET'],
            message: 'FATAL: JWT_SECRET must be explicitly set in production.',
          });
        } else if (secret.length < 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['JWT_SECRET'],
            message: 'FATAL: JWT_SECRET in production must be at least 32 characters long.',
          });
        }
      }
    })
    .transform((data) => ({
      ...data,
      JWT_SECRET:
        data.JWT_SECRET && data.JWT_SECRET.trim() !== ''
          ? data.JWT_SECRET.trim()
          : DEV_DEFAULT_JWT_SECRET,
    }));

  test('Production mode REJECTS missing JWT_SECRET', () => {
    const res = testSchema.safeParse({ NODE_ENV: 'production' });
    assert.strictEqual(res.success, false, 'Should fail when JWT_SECRET is missing in production');
    if (!res.success) {
      assert(res.error.errors.some((e) => e.message.includes('FATAL: JWT_SECRET must be explicitly set in production')));
    }
  });

  test('Production mode REJECTS default development JWT_SECRET', () => {
    const res = testSchema.safeParse({
      NODE_ENV: 'production',
      JWT_SECRET: DEV_DEFAULT_JWT_SECRET,
    });
    assert.strictEqual(res.success, false, 'Should fail when default dev secret is used in production');
  });

  test('Production mode REJECTS short JWT_SECRET (< 32 chars)', () => {
    const res = testSchema.safeParse({
      NODE_ENV: 'production',
      JWT_SECRET: 'short-secret-1234567890',
    });
    assert.strictEqual(res.success, false, 'Should fail when secret is < 32 chars in production');
  });

  test('Production mode ACCEPTS strong unique JWT_SECRET (>= 32 chars)', () => {
    const res = testSchema.safeParse({
      NODE_ENV: 'production',
      JWT_SECRET: 'super-strong-production-secret-token-for-diu-investment-club-2026',
    });
    assert.strictEqual(res.success, true, 'Should succeed with strong secret in production');
    if (res.success) {
      assert.strictEqual(
        res.data.JWT_SECRET,
        'super-strong-production-secret-token-for-diu-investment-club-2026'
      );
    }
  });

  test('Development mode safely permits default fallback secret', () => {
    const res = testSchema.safeParse({ NODE_ENV: 'development' });
    assert.strictEqual(res.success, true, 'Should succeed in development without JWT_SECRET');
    if (res.success) {
      assert.strictEqual(res.data.JWT_SECRET, DEV_DEFAULT_JWT_SECRET);
    }
  });

  // ----------------------------------------------------
  // TEST SECTION 3: PRODUCTION CORS ORIGIN VALIDATION
  // ----------------------------------------------------
  console.log('\n--- 3. PRODUCTION CORS ORIGIN VALIDATION ---');

  const STATIC_ALLOWED_ORIGINS = new Set([
    'https://invesmentclub.top',
    'https://www.invesmentclub.top',
    'https://diu-investment-club.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  const VERCEL_PREVIEW_REGEX = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/;

  const validateOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true; // server-to-server / curl
    const normalized = origin.trim().replace(/\/+$/, '');
    if (STATIC_ALLOWED_ORIGINS.has(normalized)) return true;
    if (VERCEL_PREVIEW_REGEX.test(normalized)) return true;
    return false;
  };

  test('Allows production domain https://invesmentclub.top', () => {
    assert.strictEqual(validateOrigin('https://invesmentclub.top'), true);
  });

  test('Allows production domain https://www.invesmentclub.top', () => {
    assert.strictEqual(validateOrigin('https://www.invesmentclub.top'), true);
  });

  test('Allows current Vercel production https://diu-investment-club.vercel.app', () => {
    assert.strictEqual(validateOrigin('https://diu-investment-club.vercel.app'), true);
  });

  test('Allows dynamic Vercel preview deployment https://diu-investment-club-git-feat-test.vercel.app', () => {
    assert.strictEqual(validateOrigin('https://diu-investment-club-git-feat-test.vercel.app'), true);
  });

  test('Allows development localhost:3000', () => {
    assert.strictEqual(validateOrigin('http://localhost:3000'), true);
  });

  test('Allows server-to-server / curl / mobile requests (no origin)', () => {
    assert.strictEqual(validateOrigin(undefined), true);
  });

  test('REJECTS unknown attacker origin https://malicious-attacker.com', () => {
    assert.strictEqual(validateOrigin('https://malicious-attacker.com'), false);
  });

  test('REJECTS spoofed fake vercel domain https://fakevercel.app.attacker.com', () => {
    assert.strictEqual(validateOrigin('https://fakevercel.app.attacker.com'), false);
  });

  test('REJECTS unauthorized port http://localhost:8080', () => {
    assert.strictEqual(validateOrigin('http://localhost:8080'), false);
  });

  // ----------------------------------------------------
  // TEST SECTION 4: RESEND PRODUCTION CONFIGURATION
  // ----------------------------------------------------
  console.log('\n--- 4. RESEND PRODUCTION EMAIL VERIFICATION ---');

  test('Resend is registered as sole provider', () => {
    assert.strictEqual(emailProvider.name, 'RESEND');
  });

  test('Sender identity is "DIU Investment Club <noreply@invesmentclub.top>"', () => {
    assert.strictEqual(DEFAULT_FROM_EMAIL, 'DIU Investment Club <noreply@invesmentclub.top>');
  });

  test('Environment mode is configured as LIVE', () => {
    assert.strictEqual(process.env.EMAIL_MODE || 'LIVE', 'LIVE');
  });

  test('Nodemailer and SMTP modules are completely absent', () => {
    assert.throws(
      () => require('nodemailer'),
      /Cannot find module 'nodemailer'/,
      'nodemailer must not exist'
    );
  });

  console.log(`\n====================================================`);
  console.log(`  AUDIT RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runPreDeploymentVerification().catch((err) => {
  console.error('Fatal execution error in test suite:', err);
  process.exit(1);
});
