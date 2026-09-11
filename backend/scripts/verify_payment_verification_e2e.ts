import { emailEventBus } from '../src/modules/email/email.events';
import { emailQueue } from '../src/modules/email/email.queue';
import { emailRepository } from '../src/modules/email/email.repository';
import { emailAutomationManager } from '../src/modules/email/email.automation.settings';

async function testPaymentVerificationE2E() {
  console.log('================================================================');
  console.log('VERIFYING PAYMENT VERIFICATION EVENT-DRIVEN EMAIL PIPELINE');
  console.log('================================================================\n');

  // 0. Ensure EmailQueue is initialized
  console.log('0. EmailQueue initialized. Initial size:', emailQueue.getQueueSize());

  // 1. Verify Automation Rules
  const ruleCheck = emailAutomationManager.isEmailAllowed('PAYMENT_VERIFIED', 'payment');
  console.log('1. Checking isEmailAllowed for PAYMENT_VERIFIED:', ruleCheck);
  if (!ruleCheck.allowed) {
    throw new Error(`isEmailAllowed failed: ${ruleCheck.reason}`);
  }

  const ruleCheckConfirmed = emailAutomationManager.isEmailAllowed('PAYMENT_CONFIRMED', 'payment');
  console.log('2. Checking isEmailAllowed for PAYMENT_CONFIRMED:', ruleCheckConfirmed);
  if (!ruleCheckConfirmed.allowed) {
    throw new Error(`isEmailAllowed failed: ${ruleCheckConfirmed.reason}`);
  }

  // 2. Test event emission with a dedicated synthetic test payment ID
  const testPaymentId = `test_e2e_${Date.now()}`;
  const testRecipient = 'siamibna75@gmail.com'; // Admin/Test recipient for safety
  const idempotencyKey = `PAYMENT_CONFIRMED:${testPaymentId}`;

  console.log(`3. Emitting PAYMENT_CONFIRMED event via emailEventBus...`);
  emailEventBus.emitEvent({
    type: 'PAYMENT_CONFIRMED',
    payload: {
      paymentId: testPaymentId,
      paymentNumber: 'PAY-TEST-99999',
      memberId: 'test_member_id',
      memberName: 'Test Member',
      memberEmail: testRecipient,
      amount: 500,
      paymentMethod: 'BKASH',
      paymentDate: '2026-09-11',
      referenceNumber: 'REF-99999',
      receiptToken: 'token_test_abc123',
      verifiedBy: 'admin_test',
    },
  });

  // Wait for background queue processing (up to 5s)
  console.log('4. Waiting for queue processor to dispatch...');
  let log = null;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500));
    log = await emailRepository.findByIdempotencyKey(idempotencyKey);
    if (log && (log.status === 'SENT' || log.status === 'TEST' || log.status === 'FAILED')) {
      break;
    }
  }

  console.log('5. Checked email log for event dispatch:', {
    idempotencyKey,
    status: log?.status,
    recipient: log?.recipient,
    provider: log?.provider,
    providerMessageId: log?.provider_message_id,
  });

  if (!log || (log.status !== 'SENT' && log.status !== 'TEST')) {
    throw new Error(`Queue processing did not complete with SENT/TEST status! Status: ${log?.status}, Error: ${log?.error_message}`);
  }

  console.log('✅ PASS: PAYMENT_CONFIRMED event triggered queue, rendered template, and was successfully processed!');

  // Cleanup the synthetic test log from Supabase to keep DB pristine
  if (log?.id) {
    const { getDbAdmin } = await import('../src/config/supabase');
    await getDbAdmin().from('email_logs').delete().eq('id', log.id);
    console.log('6. Cleaned up synthetic test log from email_logs.');
  }

  console.log('\n🎉 ALL PIPELINE GATES VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

testPaymentVerificationE2E().catch((err) => {
  console.error('❌ E2E verification failed:', err);
  process.exit(1);
});
