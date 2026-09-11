import { getDbAdmin } from '../src/config/supabase';
import { emailQueue } from '../src/modules/email/email.queue';
import { renderMemberWelcomeEmail, renderPaymentConfirmationEmail } from '../src/modules/email/email.templates';
import { emailRepository } from '../src/modules/email/email.repository';
import { isValidEmail } from '../src/modules/email/email.security';

async function recoverJunnatEmails() {
  console.log('================================================================');
  console.log('RECOVERING TRANSACTIONAL EMAILS FOR JUNNAT ARA JUI');
  console.log('Target Email: 252-58-082@diu.edu.bd');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const supabase = getDbAdmin();

  // 1. Fetch current verified member record
  const memberId = '7d92037d-bc0e-46c6-ae10-0d73f7e481a3';
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('id, member_code, student_id, full_name, email, department, batch, membership_status')
    .eq('id', memberId)
    .single();

  if (memberErr || !member) {
    throw new Error(`Member not found: ${memberErr?.message}`);
  }

  console.log(`📋 Member Record: ${member.full_name} (${member.email})`);
  console.log(`   Member Code: ${member.member_code} | Student ID: ${member.student_id}`);
  console.log(`   Department: ${member.department} | Status: ${member.membership_status}`);

  if (member.email !== '252-58-082@diu.edu.bd') {
    throw new Error(`Member email in DB is "${member.email}", expected "252-58-082@diu.edu.bd"`);
  }

  if (!isValidEmail(member.email)) {
    throw new Error(`Invalid member email format: ${member.email}`);
  }

  // 2. Fetch payment record
  const paymentId = '415af06d-2d58-4187-ad00-c462b2019eec';
  const { data: payment, error: paymentErr } = await supabase
    .from('member_payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (paymentErr || !payment) {
    throw new Error(`Payment not found: ${paymentErr?.message}`);
  }

  console.log(`\n💳 Payment Record: ${payment.payment_number}`);
  console.log(`   Amount: ৳${payment.amount} | Method: ${payment.payment_method} | Status: ${payment.status}`);
  console.log(`   Receipt Token: ${payment.receipt_token}`);

  if (payment.status !== 'VERIFIED') {
    throw new Error(`Payment status is ${payment.status}, expected VERIFIED`);
  }

  // --- EMAIL 1: MEMBER_WELCOME ---
  console.log('\n----------------------------------------------------------------');
  console.log('EMAIL 1: MEMBER WELCOME EMAIL RECOVERY');
  console.log('----------------------------------------------------------------');

  const welcomeIdempotencyKey = `RECOVERY:MEMBER_WELCOME:${member.id}:${member.email}`;
  const existingWelcomeLog = await emailRepository.findByIdempotencyKey(welcomeIdempotencyKey);

  if (existingWelcomeLog && existingWelcomeLog.status === 'SENT') {
    console.log(`🛑 Welcome email already sent under idempotency key: ${welcomeIdempotencyKey}`);
    console.log(`   Log ID: ${existingWelcomeLog.id} | Resend Message ID: ${existingWelcomeLog.provider_message_id}`);
  } else {
    console.log(`Rendering Member Welcome template...`);
    const { subject: welcomeSubject, html: welcomeHtml, text: welcomeText } = renderMemberWelcomeEmail({
      userName: member.full_name,
      recipientEmail: member.email,
      department: member.department,
      batch: member.batch || '58',
      memberCode: member.member_code,
    });

    console.log(`Dispatching Member Welcome email via EmailQueue.executeJob...`);
    const welcomeResult = await emailQueue.executeJob({
      id: crypto.randomUUID(),
      idempotencyKey: welcomeIdempotencyKey,
      emailType: 'MEMBER_WELCOME',
      category: 'GENERAL',
      recipient: member.email,
      subject: welcomeSubject,
      html: welcomeHtml,
      text: welcomeText,
      relatedEntityType: 'member',
      relatedEntityId: member.id,
      triggerSource: 'MEMBER_RECOVERY',
    });

    console.log(`📬 Welcome Email Result:`, welcomeResult);
    if (!welcomeResult.success) {
      throw new Error(`Failed to send Welcome Email: ${welcomeResult.error}`);
    }
    console.log(`✅ Welcome Email SENT successfully! Provider Message ID: ${welcomeResult.providerMessageId}`);
  }

  // --- EMAIL 2: PAYMENT_VERIFIED ---
  console.log('\n----------------------------------------------------------------');
  console.log('EMAIL 2: PAYMENT VERIFICATION & RECEIPT EMAIL RECOVERY');
  console.log('----------------------------------------------------------------');

  const paymentIdempotencyKey = `RECOVERY:PAYMENT_CONFIRMED:${payment.id}:${member.email}`;
  const existingPaymentLog = await emailRepository.findByIdempotencyKey(paymentIdempotencyKey);

  if (existingPaymentLog && existingPaymentLog.status === 'SENT') {
    console.log(`🛑 Payment email already sent under idempotency key: ${paymentIdempotencyKey}`);
    console.log(`   Log ID: ${existingPaymentLog.id} | Resend Message ID: ${existingPaymentLog.provider_message_id}`);
  } else {
    console.log(`Rendering Payment Confirmation template...`);
    const { subject: paySubject, html: payHtml, text: payText } = renderPaymentConfirmationEmail({
      memberName: member.full_name,
      amount: Number(payment.amount),
      paymentReference: payment.payment_number,
      paymentType: payment.payment_method,
      paymentDate: payment.payment_date,
      receiptNumber: payment.receipt_number || payment.payment_number,
      receiptToken: payment.receipt_token,
      recipientEmail: member.email,
    });

    console.log(`Dispatching Payment Confirmation email via EmailQueue.executeJob...`);
    const paymentResult = await emailQueue.executeJob({
      id: crypto.randomUUID(),
      idempotencyKey: paymentIdempotencyKey,
      emailType: 'PAYMENT_VERIFIED',
      category: 'FINANCIAL',
      recipient: member.email,
      subject: paySubject,
      html: payHtml,
      text: payText,
      relatedEntityType: 'payment',
      relatedEntityId: payment.id,
      triggerSource: 'PAYMENT_RECOVERY',
      sentByUserId: payment.verified_by,
    });

    console.log(`📬 Payment Email Result:`, paymentResult);
    if (!paymentResult.success) {
      throw new Error(`Failed to send Payment Confirmation Email: ${paymentResult.error}`);
    }
    console.log(`✅ Payment Confirmation Email SENT successfully! Provider Message ID: ${paymentResult.providerMessageId}`);
  }

  // --- GATE 3: VERIFY IDEMPOTENCY BY RE-ATTEMPTING ---
  console.log('\n----------------------------------------------------------------');
  console.log('VERIFYING DUPLICATE SUPPRESSION / IDEMPOTENCY');
  console.log('----------------------------------------------------------------');

  const retestWelcome = await emailQueue.executeJob({
    id: crypto.randomUUID(),
    idempotencyKey: welcomeIdempotencyKey,
    emailType: 'MEMBER_WELCOME',
    category: 'GENERAL',
    recipient: member.email,
    subject: 'Duplicate Test',
    html: '<p>duplicate</p>',
  });
  console.log(`🛡️ Re-dispatch Welcome: isDuplicate = ${retestWelcome.isDuplicate} | success = ${retestWelcome.success}`);
  if (!retestWelcome.isDuplicate) {
    throw new Error('CRITICAL: Welcome email duplicate was NOT suppressed!');
  }

  const retestPayment = await emailQueue.executeJob({
    id: crypto.randomUUID(),
    idempotencyKey: paymentIdempotencyKey,
    emailType: 'PAYMENT_VERIFIED',
    category: 'FINANCIAL',
    recipient: member.email,
    subject: 'Duplicate Test',
    html: '<p>duplicate</p>',
  });
  console.log(`🛡️ Re-dispatch Payment: isDuplicate = ${retestPayment.isDuplicate} | success = ${retestPayment.success}`);
  if (!retestPayment.isDuplicate) {
    throw new Error('CRITICAL: Payment email duplicate was NOT suppressed!');
  }

  console.log('\n🎉 ALL RECOVERY CHECKS PASSED PERFECTLY!');
}

recoverJunnatEmails()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Recovery script failed:', err);
    process.exit(1);
  });
