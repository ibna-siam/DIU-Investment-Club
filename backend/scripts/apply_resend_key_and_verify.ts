/**
 * DIU Investment Club - Apply Resend API Key & End-to-End Delivery Verification
 *
 * 1. Validates Resend API Key against Resend
 * 2. Transmits test verification email to siamibna75@gmail.com
 * 3. Transmits official Welcome Email to newly registered member Ibna (yemem60488@airhemp.com)
 * 4. Verifies database persistence in public.email_logs
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Resend } from 'resend';
import { emailService } from '../src/modules/email/email.service';
import { emailQueue } from '../src/modules/email/email.queue';
import { emailRepository } from '../src/modules/email/email.repository';
import { emailEventBus } from '../src/modules/email/email.events';
import { DEFAULT_FROM_EMAIL } from '../src/modules/email/email.config';

async function main() {
  const apiKey = process.argv[2] || process.env.RESEND_API_KEY;

  if (!apiKey || !apiKey.startsWith('re_')) {
    console.error('❌ Error: Please provide a valid Resend API key starting with "re_".');
    console.error('Usage: npx tsx scripts/apply_resend_key_and_verify.ts <YOUR_RESEND_API_KEY>');
    process.exit(1);
  }

  process.env.RESEND_API_KEY = apiKey;
  process.env.EMAIL_MODE = 'LIVE';

  console.log('========================================================================');
  console.log('🚀 DIU INVESTMENT CLUB - LIVE EMAIL AUTOMATION VERIFICATION');
  console.log('========================================================================\n');

  console.log(`🔑 Testing API Key: ${apiKey.substring(0, 7)}...${apiKey.slice(-4)}`);
  console.log(`🌐 Official Sender: ${DEFAULT_FROM_EMAIL}`);
  console.log(`Mode:            ${process.env.EMAIL_MODE}`);

  const resend = new Resend(apiKey);

  // STEP 1: Controlled Test Transmission to Admin / Developer
  console.log('\n------------------------------------------------------------------------');
  console.log('TEST 1: Controlled Manual Test Email');
  console.log('Recipient: siamibna75@gmail.com');
  console.log('------------------------------------------------------------------------');

  const testResult = await emailService.sendTestEmail({
    to: 'siamibna75@gmail.com',
    recipientName: 'Ibna Siam',
    notes: 'Official live transmission test from verified domain invesmentclub.top via Resend API.',
  });

  if (!testResult.success) {
    console.error('❌ TEST 1 FAILED:', testResult.error);
    process.exit(1);
  }

  console.log('✅ TEST 1 PASSED!');
  console.log(`   Resend Message ID: ${testResult.id}`);
  console.log(`   Recipient:         ${JSON.stringify(testResult.recipient)}`);
  console.log(`   Sent At:           ${testResult.sentAt}`);

  // STEP 2: Live Member Welcome Email Dispatch for Ibna
  console.log('\n------------------------------------------------------------------------');
  console.log('TEST 2: Live Welcome Email for Newly Created Member');
  console.log('Member Code: DIC-2026-00035');
  console.log('Recipient:   yemem60488@airhemp.com');
  console.log('------------------------------------------------------------------------');

  const memberPayload = {
    memberId: '166445f5-388d-4f16-b6ee-e5bbe6036f0a',
    memberCode: 'DIC-2026-00035',
    fullName: 'Ibna',
    email: 'yemem60488@airhemp.com',
    studentId: '252-58-346',
    department: 'Software Engineering',
    batch: '3rd',
  };

  console.log('⚡ Emitting MEMBER_CREATED event...');
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: memberPayload,
  });

  // Wait 3 seconds for asynchronous queue to process and log
  console.log('⏳ Waiting for background queue processing...');
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // STEP 3: Verify Supabase Log Persistence
  console.log('\n------------------------------------------------------------------------');
  console.log('TEST 3: Checking Supabase email_logs Record');
  console.log('------------------------------------------------------------------------');

  const idempotencyKey = `MEMBER_CREATED:${memberPayload.memberId}`;
  const log = await emailRepository.findByIdempotencyKey(idempotencyKey);

  if (!log) {
    console.error(`❌ TEST 3 FAILED: No log found for idempotency key "${idempotencyKey}".`);
    process.exit(1);
  }

  console.log(`✅ TEST 3 PASSED: Log record retrieved from Supabase:`);
  console.log(`   ID:                  ${log.id}`);
  console.log(`   Email Type:          ${log.email_type}`);
  console.log(`   Recipient:           ${log.recipient}`);
  console.log(`   Status:              ${log.status}`);
  console.log(`   Provider:            ${log.provider}`);
  console.log(`   Provider Message ID: ${log.provider_message_id}`);
  console.log(`   Sent At:             ${log.sent_at}`);

  if (log.status === 'SENT') {
    console.log('\n========================================================================');
    console.log('🎉 END-TO-END VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('========================================================================');
  } else {
    console.error(`\n⚠️ Delivery status is "${log.status}": ${log.error_message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
