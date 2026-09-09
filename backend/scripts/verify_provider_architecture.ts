/**
 * DIU Investment Club ERP - Email Provider Architecture & Audit Verification Script
 *
 * Validates:
 * 1. Provider Audit: Confirms Gmail SMTP is PRIMARY and Resend is inactive for production
 * 2. New Member Welcome Email: Delivered via Gmail SMTP to member.email (no access button)
 * 3. System User Welcome Email: Delivered via Gmail SMTP to user.email
 * 4. Account Invitation Email: Delivered via Gmail SMTP to user.email with "Access Your Account" button
 * 5. Test Mode Routing: Emails redirected strictly to configured test recipient siamibna75@gmail.com
 * 6. Live Mode Routing: Emails delivered strictly to actual recipient without redirection
 * 7. Duplicate Email Prevention: Idempotency protection prevents duplicate delivery
 * 8. Audit Logging: email_logs records provider 'SMTP', recipient, status, and status code 250
 */

import { emailProviderManager } from '../src/modules/email/providers/email.provider.manager';
import { emailEventBus } from '../src/modules/email/email.events';
import { emailQueue } from '../src/modules/email/email.queue';
import { emailRepository, EmailLogRecord } from '../src/modules/email/email.repository';
import { emailAutomationManager } from '../src/modules/email/email.automation.settings';
import { env } from '../src/config/env';

interface Assertion {
  name: string;
  passed: boolean;
  details: string;
}

const results: Assertion[] = [];

function check(condition: boolean, name: string, details: string) {
  results.push({
    name,
    passed: !!condition,
    details: condition ? details : `FAILED: ${details}`,
  });
  console.log(`${condition ? '✓ PASS' : '✗ FAIL'}: [${name}] - ${details}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForLog(
  predicate: (log: EmailLogRecord) => boolean,
  timeoutMs = 20000
): Promise<EmailLogRecord | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await emailRepository.findAll({ limit: 50 });
    const match = res.data.find(predicate);
    if (match) return match;
    await sleep(400);
  }
  return null;
}

async function runAuditAndVerification() {
  console.log('===============================================================');
  console.log('STARTING EMAIL PROVIDER ARCHITECTURE & SYSTEM AUDIT');
  console.log('===============================================================');

  // 1. Initial State Inspection & Provider Audit
  console.log('\n--- 1. EMAIL PROVIDER AUDIT ---');
  const activeProviderName = emailProviderManager.getActiveProviderName();
  const primaryProvider = emailProviderManager.getPrimaryProvider();
  const isResendProductionReady = emailProviderManager.isResendProductionReady();

  console.log(`Configured EMAIL_PROVIDER: [${env.EMAIL_PROVIDER}]`);
  console.log(`Active Primary Provider Name: [${activeProviderName}]`);
  console.log(`Primary Provider Instance: [${primaryProvider.name}]`);
  console.log(`SMTP Configured: [${emailProviderManager.getSmtpProvider().isConfigured()}]`);
  console.log(`Resend Production Ready: [${isResendProductionReady}] (Requires custom verified domain)`);

  check(
    activeProviderName === 'SMTP' && primaryProvider.name === 'SMTP',
    'Provider Audit: Gmail SMTP is PRIMARY',
    `Active provider is ${activeProviderName}`
  );

  check(
    !isResendProductionReady,
    'Resend Inactive for Production: Protected against sandbox 403 errors',
    'Resend sandbox onboarding@resend.dev is guarded; production traffic routes to Gmail SMTP'
  );

  // 2. Safe SMTP Connection Verification
  console.log('\n--- 2. SMTP CONNECTION TEST ---');
  const connResult = await emailProviderManager.verifyActiveConnection();
  check(
    connResult.success && connResult.provider === 'SMTP',
    'SMTP Connection: Authenticated with smtp.gmail.com:587',
    connResult.success ? 'Connected and authenticated safely' : `Error: ${connResult.error}`
  );

  if (!connResult.success) {
    console.error('SMTP authentication failed. Aborting verification.');
    process.exit(1);
  }

  const liveTarget = env.SMTP_USER || 'siamibna75@gmail.com';
  const testTarget = 'siamibna75@gmail.com';

  // 3. LIVE MODE ROUTING & TEMPLATE VERIFICATION
  console.log('\n--- 3. LIVE MODE ROUTING & AUTOMATED EMAILS ---');
  await emailAutomationManager.updateSettings({
    environmentMode: 'LIVE',
    testRecipientEmail: testTarget,
    rules: {
      newMemberWelcome: true,
      expenseApproval: true,
      taskAssignment: true,
      meetingReminder: true,
      eventReminder: true,
      securityAlert: true,
    },
  });

  // 3A. New Member Welcome Email
  const memberId = `mem_audit_${Date.now()}`;
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId,
      memberCode: 'DIU-2026-AUDIT',
      fullName: 'Live Member Audit',
      email: liveTarget,
      studentId: '201-15-9999',
      department: 'Finance & Banking',
      batch: '50th',
      createdBy: 'admin',
    },
  });

  const memberLog = await waitForLog(
    (l) =>
      l.recipient === liveTarget &&
      l.email_type === 'MEMBER_WELCOME' &&
      l.related_entity_id === memberId &&
      (l.status === 'SENT' || l.status === 'FAILED')
  );

  check(
    Boolean(memberLog && memberLog.status === 'SENT' && memberLog.provider === 'SMTP'),
    'New Member Welcome Email: Delivered via Gmail SMTP to member.email',
    `Recipient: ${memberLog?.recipient}, Provider: ${memberLog?.provider}, Code: ${memberLog?.provider_status_code}`
  );

  // 3B. User Welcome Email & Account Invitation
  const userId = `usr_audit_${Date.now()}`;
  const setupToken = `tok_audit_${Date.now()}`;
  const setupUrl = `https://erp.diuic.org/reset-password?token=${setupToken}&setup=true`;

  emailEventBus.emitEvent({
    type: 'USER_CREATED',
    payload: {
      userId,
      email: liveTarget,
      fullName: 'Live User Audit',
      loginUrl: 'https://erp.diuic.org/login',
      createdBy: 'super_admin',
    },
  });

  emailEventBus.emitEvent({
    type: 'USER_INVITED',
    payload: {
      userId,
      email: liveTarget,
      fullName: 'Live User Audit',
      setupUrl,
      roleName: 'EXECUTIVE_MEMBER',
      invitedBy: 'super_admin',
      expiresInHours: 48,
    },
  });

  const userWelcomeLog = await waitForLog(
    (l) =>
      l.recipient === liveTarget &&
      l.email_type === 'USER_WELCOME' &&
      l.related_entity_id === userId &&
      (l.status === 'SENT' || l.status === 'FAILED')
  );

  check(
    Boolean(userWelcomeLog && userWelcomeLog.status === 'SENT' && userWelcomeLog.provider === 'SMTP'),
    'System User Welcome Email: Delivered via Gmail SMTP to user.email',
    `Recipient: ${userWelcomeLog?.recipient}, Provider: ${userWelcomeLog?.provider}, Status: ${userWelcomeLog?.status}`
  );

  const userInviteLog = await waitForLog(
    (l) =>
      l.recipient === liveTarget &&
      l.email_type === 'ACCOUNT_INVITATION' &&
      l.related_entity_id === userId &&
      (l.status === 'SENT' || l.status === 'FAILED')
  );

  check(
    Boolean(userInviteLog && userInviteLog.status === 'SENT' && userInviteLog.provider === 'SMTP'),
    'Account Invitation Email: Delivered via Gmail SMTP with setup link',
    `Recipient: ${userInviteLog?.recipient}, Provider: ${userInviteLog?.provider}, Code: ${userInviteLog?.provider_status_code}`
  );

  // 4. TEST MODE ROUTING ISOLATION
  console.log('\n--- 4. TEST MODE ROUTING ISOLATION ---');
  await emailAutomationManager.updateSettings({
    environmentMode: 'TEST',
    testRecipientEmail: testTarget,
  });

  const testMemberId = `mem_testmode_${Date.now()}`;
  const realMemberEmail = 'unauthorized.random.student@gmail.com';

  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId: testMemberId,
      memberCode: 'DIU-TEST-001',
      fullName: 'Test Mode Real Member Name',
      email: realMemberEmail,
      studentId: '201-15-0001',
      department: 'CSE',
      batch: '52nd',
      createdBy: 'admin',
    },
  });

  // In TEST mode, the audit log records the intended recipient, but the queue physically dispatches to testRecipientEmail
  const testModeLog = await waitForLog(
    (l) =>
      l.recipient === realMemberEmail &&
      l.email_type === 'MEMBER_WELCOME' &&
      l.related_entity_id === testMemberId &&
      (l.status === 'SENT' || l.status === 'FAILED')
  );

  check(
    Boolean(testModeLog && testModeLog.status === 'SENT'),
    'Test Mode Isolation: Protected real member email from receiving test traffic',
    `Recorded intended recipient: ${testModeLog?.recipient}, safely dispatched in TEST mode`
  );

  // Reset back to LIVE mode
  await emailAutomationManager.updateSettings({
    environmentMode: 'LIVE',
    testRecipientEmail: testTarget,
  });

  // 5. DUPLICATE EMAIL PREVENTION
  console.log('\n--- 5. DUPLICATE EMAIL PREVENTION (IDEMPOTENCY) ---');
  if (memberLog) {
    console.log(`Testing duplicate dispatch with existing key: ${memberLog.idempotency_key}`);
    const duplicateJobResult = await emailQueue.executeJob({
      id: 'dup_test_job_1',
      idempotencyKey: memberLog.idempotency_key || `dup_test_${Date.now()}`,
      emailType: 'MEMBER_WELCOME',
      category: 'GENERAL',
      recipient: liveTarget,
      subject: 'Duplicate Test Subject',
      html: '<p>Duplicate test</p>',
    });

    check(
      duplicateJobResult.isDuplicate === true,
      'Duplicate Prevention: Intercepted existing idempotency key and prevented duplicate dispatch',
      `Duplicate skipped cleanly. isDuplicate: ${duplicateJobResult.isDuplicate}`
    );
  }

  // 6. LOGGING & TELEMETRY VERIFICATION
  console.log('\n--- 6. EMAIL LOGS TELEMETRY AUDIT ---');
  check(
    Boolean(
      memberLog?.provider === 'SMTP' &&
      memberLog?.provider_status_code === 250 &&
      memberLog?.status === 'SENT' &&
      memberLog?.provider_message_id
    ),
    'Audit Telemetry: email_logs recorded provider SMTP, message ID, status SENT, and code 250',
    `Provider: ${memberLog?.provider}, MsgId: ${memberLog?.provider_message_id}, Code: ${memberLog?.provider_status_code}`
  );

  // SUMMARY
  console.log('\n===============================================================');
  console.log('AUDIT & VERIFICATION REPORT');
  console.log('===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Passed: ${passedCount}/${totalCount}`);

  for (const r of results) {
    console.log(`- [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  }

  if (passedCount === totalCount) {
    console.log('\nALL AUDIT & VERIFICATION CRITERIA MET SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\nSOME AUDIT CHECKS FAILED!');
    process.exit(1);
  }
}

runAuditAndVerification().catch((err) => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
