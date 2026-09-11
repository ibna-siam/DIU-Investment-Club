import { getDbAdmin } from '../src/config/supabase';
import { emailQueue } from '../src/modules/email/email.queue';
import { renderMemberWelcomeEmail } from '../src/modules/email/email.templates';
import { emailRepository } from '../src/modules/email/email.repository';
import { isValidEmail } from '../src/modules/email/email.security';

async function sendWelcomeToIsha() {
  console.log('================================================================');
  console.log('SENDING OFFICIAL WELCOME EMAIL TO MEMBER DIC-2026-00058');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const supabase = getDbAdmin();

  // 1. Fetch member record
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('*')
    .eq('member_code', 'DIC-2026-00058')
    .single();

  if (memberErr || !member) {
    throw new Error(`Member DIC-2026-00058 not found: ${memberErr?.message}`);
  }

  console.log(`📋 Verified Member Record:`);
  console.log(`   ID: ${member.id}`);
  console.log(`   Member Code: ${member.member_code}`);
  console.log(`   Full Name: ${member.full_name}`);
  console.log(`   Email: ${member.email}`);
  console.log(`   Department: ${member.department}`);
  console.log(`   Student ID: ${member.student_id}`);

  if (member.department !== 'Department of Accounting') {
    throw new Error(`Expected department to be 'Department of Accounting', but found '${member.department}'`);
  }

  if (!isValidEmail(member.email)) {
    throw new Error(`Invalid email address format: ${member.email}`);
  }

  // 2. Idempotency Key for this specific welcome delivery
  const idempotencyKey = `WELCOME_UPDATE:${member.member_code}:${member.id}:${member.email}`;
  const existingLog = await emailRepository.findByIdempotencyKey(idempotencyKey);

  if (existingLog && existingLog.status === 'SENT') {
    console.log(`🛑 Welcome email already sent under key: ${idempotencyKey}`);
    console.log(`   Log ID: ${existingLog.id} | Resend Message ID: ${existingLog.provider_message_id}`);
    return;
  }

  // 3. Render template
  console.log('\nRendering official Member Welcome template...');
  const { subject, html, text } = renderMemberWelcomeEmail({
    userName: member.full_name,
    recipientEmail: member.email,
    department: member.department,
    batch: member.batch || '58',
    memberCode: member.member_code,
  });

  // 4. Dispatch via EmailQueue
  console.log(`Dispatching welcome email to ${member.email} via EmailQueue.executeJob...`);
  const result = await emailQueue.executeJob({
    id: crypto.randomUUID(),
    idempotencyKey,
    emailType: 'MEMBER_WELCOME',
    category: 'GENERAL',
    recipient: member.email,
    subject,
    html,
    text,
    relatedEntityType: 'member',
    relatedEntityId: member.id,
    triggerSource: 'DEPARTMENT_UPDATE_WELCOME',
  });

  console.log('📬 Dispatch Result:', result);

  if (!result.success) {
    throw new Error(`Failed to send Welcome Email: ${result.error}`);
  }

  console.log(`\n✅ SUCCESS: Welcome email sent to ${member.email}!`);
  console.log(`   Provider: Resend`);
  console.log(`   Provider Message ID: ${result.providerMessageId}`);
  console.log(`   Idempotency Key: ${idempotencyKey}`);

  // 5. Test duplicate prevention
  console.log('\n--- Verifying Duplicate Prevention ---');
  const retest = await emailQueue.executeJob({
    id: crypto.randomUUID(),
    idempotencyKey,
    emailType: 'MEMBER_WELCOME',
    category: 'GENERAL',
    recipient: member.email,
    subject,
    html,
    text,
  });

  console.log(`🛡️ Re-dispatch result: isDuplicate = ${retest.isDuplicate} | success = ${retest.success}`);
  if (!retest.isDuplicate) {
    throw new Error('CRITICAL: Duplicate welcome email was not suppressed!');
  }

  console.log('\n🎉 ALL CHECKS PASSED: Exactly one welcome email dispatched and duplicate prevention verified.');
}

sendWelcomeToIsha()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
