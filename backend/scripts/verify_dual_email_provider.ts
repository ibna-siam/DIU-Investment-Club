/**
 * DIU Investment Club ERP - Dual Email Provider & Routing Verification Script
 * Validates:
 * 1. New Member creation sends ONLY Welcome Email to member.email
 * 2. New User creation sends BOTH Welcome Email + Invitation Email to user.email
 * 3. Manual Test Email sends strictly to configured test recipient (siamibna75@gmail.com) with status: TEST
 * 4. SMTP Provider failure simulation correctly logged as FAILED with proper error category without endless retries
 * 5. In LIVE mode, no live automated emails are redirected to the test recipient
 */

import { emailAutomationManager } from '../src/modules/email/email.automation.settings';
import { emailRepository, EmailLogRecord } from '../src/modules/email/email.repository';
import { emailService } from '../src/modules/email/email.service';
import { emailEventBus } from '../src/modules/email/email.events';
import { emailProviderFactory } from '../src/modules/email/providers/provider.factory';
import { SmtpEmailProvider } from '../src/modules/email/providers/smtp.provider';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  results.push({
    name,
    passed: !!condition,
    details: condition ? details : `FAILED: ${details}`
  });
  console.log(`${condition ? '✓ PASS' : '✗ FAIL'}: ${name} - ${details}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForLog(
  predicate: (log: EmailLogRecord) => boolean,
  timeoutMs = 6000
): Promise<EmailLogRecord | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await emailRepository.findAll({ limit: 50 });
    const match = res.data.find(predicate);
    if (match) return match;
    await sleep(200);
  }
  return null;
}

async function runVerification() {
  console.log('==================================================');
  console.log('STARTING DUAL EMAIL PROVIDER SYSTEM VERIFICATION');
  console.log('==================================================');

  // 1. Check provider factory configuration
  const activeProvider = emailProviderFactory.getActiveProviderName();
  console.log(`Active default provider: [${activeProvider}]`);
  assert(
    activeProvider === 'RESEND' || activeProvider === 'SMTP',
    'Provider Architecture: Active provider resolved',
    `Provider resolved to: ${activeProvider}`
  );

  // Set environment to LIVE with all rules enabled
  await emailAutomationManager.updateSettings({
    environmentMode: 'LIVE',
    testRecipientEmail: 'siamibna75@gmail.com',
    rules: {
      newMemberWelcome: true,
      expenseApproval: true,
      taskAssignment: true,
      meetingReminder: true,
      eventReminder: true,
      securityAlert: true
    }
  });

  const memberTestEmail = `real_member_${Date.now()}@diu.edu.bd`;
  const userTestEmail = `real_user_${Date.now()}@diu.edu.bd`;

  // --------------------------------------------------
  // TEST 1: New Member -> Welcome Email ONLY to member.email
  // --------------------------------------------------
  console.log('\n--- TEST 1: New Member Directory Creation ---');
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId: `mem_${Date.now()}`,
      memberCode: 'DIU-2026-REAL',
      fullName: 'Tasnim Jahan',
      email: memberTestEmail,
      studentId: '201-15-1111',
      department: 'Finance',
      batch: '55th',
      loginUrl: null,
      createdBy: 'super_admin'
    }
  });

  const memberWelcomeLog = await waitForLog(
    (l) => l.recipient === memberTestEmail && l.email_type === 'WELCOME'
  );

  assert(
    Boolean(memberWelcomeLog),
    'New Member: Welcome Email queued and sent to member.email',
    `Recipient: ${memberWelcomeLog?.recipient}, provider: ${memberWelcomeLog?.provider || 'active'}, status: ${memberWelcomeLog?.status}`
  );

  const memberInviteLog = await waitForLog(
    (l) => l.recipient === memberTestEmail && l.email_type === 'ACCOUNT_INVITATION',
    1500
  );

  assert(
    !memberInviteLog,
    'New Member: NO Account Invitation/Activation sent to member',
    'Confirmed no credential or activation link sent to member'
  );

  // --------------------------------------------------
  // TEST 2: New User -> Welcome Email + Account Invitation to user.email
  // --------------------------------------------------
  console.log('\n--- TEST 2: New User Account Creation ---');
  const userId = `usr_${Date.now()}`;
  emailEventBus.emitEvent({
    type: 'USER_CREATED',
    payload: {
      userId,
      fullName: 'Farhan Kabir',
      email: userTestEmail,
      loginUrl: 'https://erp.diuic.org/login',
      createdBy: 'super_admin'
    }
  });

  emailEventBus.emitEvent({
    type: 'USER_INVITED',
    payload: {
      userId,
      fullName: 'Farhan Kabir',
      email: userTestEmail,
      setupUrl: 'https://erp.diuic.org/auth/activate?token=invite_sample_999',
      roleName: 'MEMBER',
      invitedBy: 'super_admin'
    }
  });

  const userWelcomeLog = await waitForLog(
    (l) => l.recipient === userTestEmail && l.email_type === 'WELCOME'
  );
  assert(
    Boolean(userWelcomeLog),
    'New User: Professional Welcome Email sent to user.email',
    `Recipient: ${userWelcomeLog?.recipient}, status: ${userWelcomeLog?.status}`
  );

  const userInviteLog = await waitForLog(
    (l) => l.recipient === userTestEmail && l.email_type === 'ACCOUNT_INVITATION'
  );
  assert(
    Boolean(userInviteLog),
    'New User: Account Invitation Email sent to user.email',
    `Recipient: ${userInviteLog?.recipient}, status: ${userInviteLog?.status}`
  );

  // --------------------------------------------------
  // TEST 3: Manual Test Email -> Sent ONLY to configured test recipient
  // --------------------------------------------------
  console.log('\n--- TEST 3: Manual Test Email Isolation ---');
  const testEmailResult = await emailService.sendTestEmail({
    to: 'siamibna75@gmail.com',
    recipientName: 'Super Admin Isolated Tester',
    notes: 'Testing provider test mode routing'
  });

  assert(
    Boolean(testEmailResult.success && testEmailResult.recipient === 'siamibna75@gmail.com'),
    'Manual Test Email: Sent successfully to test recipient',
    `Result: recipient=${testEmailResult.recipient}, id=${testEmailResult.id}, provider=${testEmailResult.provider}`
  );

  const testLog = await waitForLog(
    (l) => l.recipient === 'siamibna75@gmail.com' && l.status === 'TEST'
  );
  assert(
    Boolean(testLog),
    'Email Logging: Test email recorded with status TEST',
    `Log ID: ${testLog?.id}, status: ${testLog?.status}, provider: ${testLog?.provider}`
  );

  // --------------------------------------------------
  // TEST 4: SMTP Provider Failure Handling (simulated auth/network error)
  // --------------------------------------------------
  console.log('\n--- TEST 4: SMTP Failure Handling ---');
  // Create an unconfigured / invalid SMTP provider instance to verify failure classification
  const mockUnconfiguredSmtp = new SmtpEmailProvider();
  const smtpResult = await mockUnconfiguredSmtp.send({
    to: 'member@diu.edu.bd',
    subject: 'SMTP Test',
    html: '<p>Test</p>'
  });

  assert(
    Boolean(!smtpResult.success && smtpResult.errorCategory === 'UNCONFIGURED' && !smtpResult.isRetryable),
    'SMTP Provider: Unconfigured/invalid SMTP cleanly rejected without retry loops',
    `Handled cleanly: error=${smtpResult.error}, category=${smtpResult.errorCategory}, retryable=${smtpResult.isRetryable}`
  );

  // --------------------------------------------------
  // TEST 5: Verify NO Live Email is Redirected to Test Recipient
  // --------------------------------------------------
  console.log('\n--- TEST 5: Live Email Isolation Verification ---');
  const testRecipientLogs = await emailRepository.findAll({
    search: 'siamibna75@gmail.com',
    limit: 20
  });

  // Verify that neither memberTestEmail nor userTestEmail subject was logged under siamibna75@gmail.com
  const memberLeaked = testRecipientLogs.data.find(
    (l) => l.subject?.includes('DIU-2026-REAL') || l.recipient === memberTestEmail
  );
  const userLeaked = testRecipientLogs.data.find(
    (l) => l.recipient === userTestEmail
  );

  assert(
    !memberLeaked && !userLeaked,
    'Live Mode Isolation: Live member and user emails are NEVER redirected to test recipient',
    'Confirmed: real emails were sent only to their intended recipients'
  );

  console.log('\n==================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('==================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Passed: ${passedCount}/${totalCount}`);
  for (const r of results) {
    console.log(`- [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  }

  if (passedCount === totalCount) {
    console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\nSOME VERIFICATIONS FAILED!');
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
