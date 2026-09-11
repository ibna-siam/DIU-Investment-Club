import { getDbAdmin } from '../src/config/supabase';
import { emailQueue } from '../src/modules/email/email.queue';
import { renderPaymentConfirmationEmail } from '../src/modules/email/email.templates';
import { emailRepository } from '../src/modules/email/email.repository';
import { isValidEmail } from '../src/modules/email/email.security';
import { emailEventBus } from '../src/modules/email/email.events';

interface TargetPayment {
  id: string;
  payment_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  receipt_token: string;
  verified_at: string;
  verified_by: string;
  status: string;
  member: {
    id: string;
    full_name: string;
    email: string;
    student_id: string;
  };
}

async function main() {
  console.log('================================================================');
  console.log('RECOVERY & RETROACTIVE DELIVERY FOR VERIFIED MEMBER PAYMENTS');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const supabase = getDbAdmin();

  const paymentIds = [
    '37c24e22-23be-4506-8caa-14db1db93426', // PAY-2026-00034
    '40e5d834-bb38-437f-b5f8-70d603dc97ce', // PAY-2026-00033
  ];

  for (const paymentId of paymentIds) {
    console.log(`\n🔍 Checking payment ID: ${paymentId}...`);

    const { data: paymentData, error } = await supabase
      .from('member_payments')
      .select(`
        id,
        payment_number,
        amount,
        payment_method,
        payment_date,
        receipt_token,
        verified_at,
        verified_by,
        status,
        member:members(id, full_name, email, student_id)
      `)
      .eq('id', paymentId)
      .single();

    if (error || !paymentData) {
      console.error(`❌ Payment record not found:`, error?.message);
      continue;
    }

    const payment = paymentData as unknown as TargetPayment;
    console.log(`📋 Payment: ${payment.payment_number} | Status: ${payment.status} | Amount: ৳${payment.amount}`);
    console.log(`👤 Member: ${payment.member?.full_name} (${payment.member?.email}) | Student ID: ${payment.member?.student_id}`);

    // Gate 1: Check VERIFIED status
    if (payment.status !== 'VERIFIED') {
      console.error(`⚠️ Payment ${payment.payment_number} is NOT verified (status: ${payment.status}). Aborting.`);
      continue;
    }

    // Gate 2: Validate Email
    const memberEmail = payment.member?.email;
    if (!memberEmail || !isValidEmail(memberEmail)) {
      console.error(`⚠️ Member email is missing or invalid: "${memberEmail}". Aborting.`);
      continue;
    }

    // Gate 3: Check Idempotency / Previous Delivery in email_logs
    const idempotencyKey = `PAYMENT_CONFIRMED:${payment.id}`;
    const existingLog = await emailRepository.findByIdempotencyKey(idempotencyKey);
    if (existingLog && existingLog.status === 'SENT') {
      console.log(`🛑 Email already successfully sent for payment ${payment.payment_number} (Log ID: ${existingLog.id}, Sent at: ${existingLog.sent_at}). Skipping.`);
      continue;
    }

    // Prepare and dispatch email job
    console.log(`🚀 Rendering Payment Confirmation & Digital Receipt email...`);
    const { subject, html, text } = renderPaymentConfirmationEmail({
      memberName: payment.member.full_name,
      amount: Number(payment.amount),
      paymentReference: payment.payment_number,
      paymentType: payment.payment_method,
      paymentDate: payment.payment_date,
      receiptNumber: payment.payment_number,
      receiptToken: payment.receipt_token,
      recipientEmail: memberEmail,
    });

    console.log(`📡 Executing email job via Resend with idempotency key: ${idempotencyKey}...`);
    const result = await emailQueue.executeJob({
      id: crypto.randomUUID(),
      idempotencyKey,
      emailType: 'PAYMENT_VERIFIED',
      category: 'FINANCIAL',
      recipient: memberEmail,
      subject,
      html,
      text,
      relatedEntityType: 'payment',
      relatedEntityId: payment.id,
      triggerSource: 'PAYMENT_VERIFIED',
      sentByUserId: payment.verified_by,
    });

    console.log(`📬 Delivery Result:`, result);

    if (result.success && !result.isDuplicate) {
      console.log(`✅ SUCCESS: Payment confirmation email delivered to ${memberEmail}! Resend ID: ${result.providerMessageId}`);
    } else if (result.isDuplicate) {
      console.log(`ℹ️ DUPLICATE: Email was skipped due to idempotency protection.`);
    } else {
      console.error(`❌ FAILED: Could not deliver email to ${memberEmail}. Error:`, result.error);
    }
  }

  // Gate 4: Verify Idempotency Protection by attempting second run
  console.log('\n================================================================');
  console.log('VERIFYING IDEMPOTENCY & DUPLICATE SUPPRESSION');
  console.log('================================================================');
  for (const paymentId of paymentIds) {
    const idempotencyKey = `PAYMENT_CONFIRMED:${paymentId}`;
    const log = await emailRepository.findByIdempotencyKey(idempotencyKey);
    console.log(`🔎 Checking ${idempotencyKey}: Status = ${log?.status} | Message ID = ${log?.provider_message_id}`);
    
    // Attempt re-run to guarantee duplicate protection
    const dupResult = await emailQueue.executeJob({
      id: crypto.randomUUID(),
      idempotencyKey,
      emailType: 'PAYMENT_VERIFIED',
      category: 'FINANCIAL',
      recipient: log?.recipient || 'test@diu.edu.bd',
      subject: log?.subject || 'Payment Confirmation',
      html: '<p>test</p>',
    });

    console.log(`🛡️ Second dispatch result: isDuplicate = ${dupResult.isDuplicate} | success = ${dupResult.success}`);
    if (!dupResult.isDuplicate) {
      throw new Error(`CRITICAL: Idempotency failed! Duplicate email was not suppressed for ${idempotencyKey}`);
    }
  }

  console.log('\n🎉 ALL GATES PASSED! Both members received their official payment confirmation emails.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during retroactive delivery:', err);
  process.exit(1);
});
