/**
 * DIU Investment Club ERP - Email Automation System Verification Script
 * Validates:
 * 1. Member creation sends ONLY Welcome Email to member.email
 * 2. User creation sends BOTH Welcome Email + Invitation Email to user.email
 * 3. Dynamic enable/disable of automation rules via EmailAutomationManager
 * 4. Disabled rule cleanly skips email dispatch (status: SKIPPED)
 * 5. Re-enabled rule sends email normally
 * 6. Manual Test Email dispatches to configured test address (siamibna75@gmail.com) with status: TEST
 * 7. Real live emails are NEVER redirected to test email in LIVE mode
 * 8. Invalid recipient email rejects safely (status: FAILED, error: INVALID_RECIPIENT)
 */

import { emailAutomationManager } from '../src/modules/email/email.automation.settings';
import { emailRepository, EmailLogRecord } from '../src/modules/email/email.repository';
import { emailService } from '../src/modules/email/email.service';
import { emailEventBus } from '../src/modules/email/email.events';

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
  console.log('STARTING EMAIL AUTOMATION SYSTEM VERIFICATION');
  console.log('==================================================');

  // Ensure default state: LIVE mode, all rules enabled
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

  const memberTestEmail = `test_member_${Date.now()}@diu.edu.bd`;
  const userTestEmail = `test_user_${Date.now()}@diu.edu.bd`;

  // --------------------------------------------------
  // TEST 1: Member Directory Rule (Welcome Email ONLY to member.email)
  // --------------------------------------------------
  console.log('\n--- TEST 1: Member Directory Email Rule ---');
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId: `mem_${Date.now()}`,
      memberCode: 'DIU-2026-999',
      fullName: 'Dr. Shakil Khan',
      email: memberTestEmail,
      studentId: '191-15-9999',
      department: 'CSE',
      batch: '51st',
      loginUrl: null,
      createdBy: 'super_admin'
    }
  });

  const memberWelcomeEmail = await waitForLog(
    (l) => l.recipient === memberTestEmail && l.email_type === 'WELCOME'
  );

  assert(
    Boolean(memberWelcomeEmail),
    'Member Directory: Welcome Email sent to member.email',
    `Found log with email_type ${memberWelcomeEmail?.email_type} to ${memberWelcomeEmail?.recipient}`
  );

  const memberInviteEmail = await waitForLog(
    (l) => l.recipient === memberTestEmail && l.email_type === 'ACCOUNT_INVITATION',
    1500
  );

  assert(
    !memberInviteEmail,
    'Member Directory: NO Account Activation / Invitation sent to member',
    'Confirmed no account invitation or credentials sent to member'
  );

  // Verify recipient was NOT redirected to test email in live mode
  const testEmailLogs = await emailRepository.findAll({
    search: 'siamibna75@gmail.com',
    limit: 20
  });
  const leakedToTestEmail = testEmailLogs.data.find((l) => l.subject?.includes('DIU-2026-999'));
  assert(
    !leakedToTestEmail,
    'Live Mode: Member Welcome was NOT redirected to test email',
    'Member email cleanly delivered to member.email only'
  );

  // --------------------------------------------------
  // TEST 2: User Account Creation Rule (Welcome + Activation to user.email)
  // --------------------------------------------------
  console.log('\n--- TEST 2: User Account Creation Email Rule ---');
  const userId = `usr_${Date.now()}`;
  // Emulate User creation which emits USER_CREATED and USER_INVITED
  emailEventBus.emitEvent({
    type: 'USER_CREATED',
    payload: {
      userId,
      fullName: 'Tanvir Ahmed',
      email: userTestEmail,
      loginUrl: 'https://erp.diuic.org/login',
      createdBy: 'super_admin'
    }
  });

  emailEventBus.emitEvent({
    type: 'USER_INVITED',
    payload: {
      userId,
      fullName: 'Tanvir Ahmed',
      email: userTestEmail,
      setupUrl: 'https://erp.diuic.org/auth/activate?token=sample_token_123',
      roleName: 'MEMBER',
      invitedBy: 'super_admin'
    }
  });

  const userWelcome = await waitForLog(
    (l) => l.recipient === userTestEmail && l.email_type === 'WELCOME'
  );
  assert(
    Boolean(userWelcome),
    'User Account: Professional Welcome Email sent to user.email',
    `Found user welcome email to ${userTestEmail}`
  );

  const userInvite = await waitForLog(
    (l) => l.recipient === userTestEmail && l.email_type === 'ACCOUNT_INVITATION'
  );
  assert(
    Boolean(userInvite),
    'User Account: Account Activation / Invitation Email sent to user.email',
    `Found user activation email to ${userTestEmail}`
  );

  // --------------------------------------------------
  // TEST 3 & 4: Automation Enable/Disable Toggle
  // --------------------------------------------------
  console.log('\n--- TEST 3 & 4: Automation Rule Enable / Disable ---');
  // Disable newMemberWelcome rule
  await emailAutomationManager.updateSettings({
    rules: {
      newMemberWelcome: false
    }
  });

  const disabledMemberEmail = `disabled_member_${Date.now()}@diu.edu.bd`;
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId: `mem_dis_${Date.now()}`,
      memberCode: 'DIU-2026-000',
      fullName: 'Disabled Test Member',
      email: disabledMemberEmail,
      studentId: '191-15-0000',
      department: 'BBA',
      batch: '40th',
      loginUrl: null,
      createdBy: 'super_admin'
    }
  });

  const skippedLog = await waitForLog(
    (l) => l.recipient === disabledMemberEmail && l.status === 'SKIPPED'
  );
  assert(
    Boolean(skippedLog),
    'Automation Toggle: Disabled automation cleanly skips email',
    `Email correctly skipped with status SKIPPED: ${skippedLog?.error_message}`
  );

  // Re-enable rule
  await emailAutomationManager.updateSettings({
    rules: {
      newMemberWelcome: true
    }
  });
  const reenabledMemberEmail = `reenabled_member_${Date.now()}@diu.edu.bd`;
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId: `mem_reen_${Date.now()}`,
      memberCode: 'DIU-2026-001',
      fullName: 'Reenabled Test Member',
      email: reenabledMemberEmail,
      studentId: '191-15-0001',
      department: 'BBA',
      batch: '40th',
      loginUrl: null,
      createdBy: 'super_admin'
    }
  });

  const reenabledLog = await waitForLog(
    (l) => l.recipient === reenabledMemberEmail && l.status !== 'SKIPPED'
  );
  assert(
    Boolean(reenabledLog),
    'Automation Toggle: Re-enabled rule sends email normally',
    `Email correctly processed with status ${reenabledLog?.status}`
  );

  // --------------------------------------------------
  // TEST 5: Manual Test Email (Super Admin button)
  // --------------------------------------------------
  console.log('\n--- TEST 5: Manual Test Email Function ---');
  const testEmailResult = await emailService.sendTestEmail({
    to: 'siamibna75@gmail.com',
    recipientName: 'Super Admin Diagnostic Tester',
    notes: 'Super Admin manual verification test trigger'
  });

  assert(
    Boolean(testEmailResult.success && testEmailResult.recipient === 'siamibna75@gmail.com'),
    'Manual Test Email: Sent successfully with TEST status',
    `Result: recipient=${testEmailResult.recipient}, messageId=${testEmailResult.id}`
  );

  // Verify log recorded as TEST
  const recentTestLogs = await emailRepository.findAll({
    search: 'siamibna75@gmail.com',
    limit: 5
  });
  const testLog = recentTestLogs.data.find((l) => l.status === 'TEST');
  assert(
    Boolean(testLog),
    'Email Logging: Test email recorded with status TEST',
    `Found log with status: ${testLog?.status}, recipient: ${testLog?.recipient}`
  );

  // --------------------------------------------------
  // TEST 6: Invalid Recipient Handling
  // --------------------------------------------------
  console.log('\n--- TEST 6: Invalid Recipient Handling ---');
  const invalidEmailResult = await emailService.sendEmail({
    to: 'not-an-email-address',
    subject: 'Invalid Recipient Test',
    html: '<p>Test</p>',
    emailType: 'TRANSACTIONAL'
  });

  assert(
    Boolean(!invalidEmailResult.success && invalidEmailResult.error?.toLowerCase().includes('invalid')),
    'Invalid Recipient: Rejected safely without redirecting to fallback user',
    `Handled cleanly: error=${invalidEmailResult.error}`
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
