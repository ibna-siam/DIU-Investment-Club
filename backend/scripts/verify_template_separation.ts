/**
 * DIU Investment Club ERP - Template Separation & Event Routing Verification Script
 *
 * Validates:
 * 1. MEMBER DIRECTORY REGISTRATION:
 *    - MEMBER_CREATED emits and triggers MEMBER_WELCOME only
 *    - Recipient is member.email
 *    - Absolutely NO "Access Your Account" button, login link, activation link, or password setup
 * 2. SYSTEM USER CREATION:
 *    - USER_CREATED triggers USER_WELCOME (no access button)
 *    - USER_INVITED triggers ACCOUNT_INVITATION (contains "Access Your Account" button with secure token)
 * 3. TEMPLATE SEPARATION:
 *    - MEMBER_WELCOME: Welcome message only, zero account access elements
 *    - USER_WELCOME: Professional welcome for system user, no access button
 *    - ACCOUNT_INVITATION: Contains "Access Your Account" button with secure setup URL
 * 4. EVENT VALIDATION:
 *    - MEMBER_CREATED -> MEMBER_WELCOME only
 *    - USER_CREATED -> USER_WELCOME
 *    - USER_INVITED -> ACCOUNT_INVITATION
 *    - Member never receives USER_CREATED or USER_INVITED workflows
 * 5. EMAIL LOGS TELEMETRY:
 *    - email_logs correctly records email_type, provider (SMTP), and status
 */

import {
  renderMemberWelcomeEmail,
  renderUserWelcomeEmail,
  renderAccountInvitationEmail,
} from '../src/modules/email/email.templates';
import { emailEventBus } from '../src/modules/email/email.events';
import { emailQueue } from '../src/modules/email/email.queue';
import { emailRepository, EmailLogRecord } from '../src/modules/email/email.repository';
import { emailAutomationManager } from '../src/modules/email/email.automation.settings';
import { smtpProvider } from '../src/modules/email/providers/smtp.provider';
import { emailProviderFactory } from '../src/modules/email/providers/provider.factory';
import { env } from '../src/config/env';

interface TestAssertion {
  name: string;
  passed: boolean;
  details: string;
}

const assertions: TestAssertion[] = [];

function check(condition: boolean, name: string, details: string) {
  assertions.push({
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

async function runVerification() {
  console.log('===============================================================');
  console.log('STARTING EMAIL TEMPLATE SEPARATION & ROUTING VERIFICATION');
  console.log('===============================================================');

  // Verify EmailQueue is initialized and listeners registered
  console.log(`Email Queue status: initialized, active queue size = ${emailQueue.getQueueSize()}`);

  // Ensure automation settings are active
  await emailAutomationManager.updateSettings({
    environmentMode: 'LIVE',
    rules: {
      newMemberWelcome: true,
      expenseApproval: true,
      taskAssignment: true,
      meetingReminder: true,
      eventReminder: true,
      securityAlert: true,
    },
  });

  const testRecipient = env.SMTP_USER || 'siamibna75@gmail.com';

  // =========================================================================
  // TEST SECTION 1: Direct Template Rendering Inspection
  // =========================================================================
  console.log('\n--- TEST SECTION 1: Direct Template Structure Inspection ---');

  // 1A. Member Welcome Template Inspection
  const memberTpl = renderMemberWelcomeEmail({
    userName: 'Tanvir Hasan (Club Member)',
    recipientEmail: testRecipient,
    department: 'Software Engineering',
    batch: '55th',
    memberCode: 'DIU-2026-0042',
  });

  const memberHtmlHasAccessButton =
    memberTpl.html.includes('Access Your Account') ||
    memberTpl.html.includes('Set Up Your Account') ||
    memberTpl.html.includes('/login') ||
    memberTpl.html.includes('password') ||
    memberTpl.html.includes('token=');

  const memberTextHasAccessButton =
    memberTpl.text.includes('Access Your Account') ||
    memberTpl.text.includes('Set Up Your Account') ||
    memberTpl.text.includes('/login');

  check(
    !memberHtmlHasAccessButton && !memberTextHasAccessButton,
    'MEMBER_WELCOME Template: No Access Button or Login Links',
    'Confirmed: HTML and plain-text contain zero account access buttons, login links, or credentials'
  );

  check(
    memberTpl.html.includes('DIU-2026-0042') && memberTpl.html.includes('Software Engineering'),
    'MEMBER_WELCOME Template: Displays Club Membership Metadata',
    'Confirmed: Member ID, Department, and Affiliation are present in member registration briefing'
  );

  // 1B. User Welcome Template Inspection
  const userTpl = renderUserWelcomeEmail({
    userName: 'Fatima Rahman (System User)',
    recipientEmail: testRecipient,
  });

  const userHtmlHasAccessButton =
    userTpl.html.includes('Access Your Account') ||
    userTpl.html.includes('Set Up Your Account') ||
    userTpl.html.includes('token=');

  check(
    !userHtmlHasAccessButton,
    'USER_WELCOME Template: No Access Button (deferred to invitation)',
    'Confirmed: User Welcome contains professional onboarding notice without access button'
  );

  // 1C. Account Invitation Template Inspection
  const inviteToken = 'test_secure_invite_token_98765';
  const setupUrl = `https://erp.diuic.org/reset-password?token=${inviteToken}&setup=true`;
  const inviteTpl = renderAccountInvitationEmail({
    userName: 'Fatima Rahman (System User)',
    setupUrl,
    roleName: 'FINANCIAL_ADMIN',
    expiresInHours: 48,
    recipientEmail: testRecipient,
  });

  const inviteHtmlHasAccessButton =
    inviteTpl.html.includes('Access Your Account') &&
    inviteTpl.html.includes(inviteToken);

  const inviteTextHasAccessButton =
    inviteTpl.text.includes('Access Your Account') &&
    inviteTpl.text.includes(inviteToken);

  check(
    inviteHtmlHasAccessButton && inviteTextHasAccessButton,
    'ACCOUNT_INVITATION Template: Contains "Access Your Account" Button with Token',
    'Confirmed: Invitation email includes "Access Your Account" button pointing to user-specific setup URL'
  );

  // =========================================================================
  // TEST SECTION 2: Member Directory Registration Workflow
  // =========================================================================
  console.log('\n--- TEST SECTION 2: Member Directory Registration Event Flow ---');

  const testMemberId = `mem_test_${Date.now()}`;
  const memberEmail = testRecipient;

  // Emit MEMBER_CREATED (as done by members.controller.ts)
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId: testMemberId,
      memberCode: 'DIU-2026-MEM-01',
      fullName: 'Rafiqul Islam (Member)',
      email: memberEmail,
      studentId: '201-15-7788',
      department: 'Computer Science',
      batch: '56th',
      createdBy: 'admin_user',
    },
  });

  // Wait for MEMBER_WELCOME in email_logs
  const memberWelcomeLog = await waitForLog(
    (l) =>
      l.recipient === memberEmail &&
      l.email_type === 'MEMBER_WELCOME' &&
      l.related_entity_id === testMemberId &&
      (l.status === 'SENT' || l.status === 'FAILED')
  );

  check(
    Boolean(memberWelcomeLog && memberWelcomeLog.status === 'SENT'),
    'Member Directory: MEMBER_WELCOME delivered via SMTP',
    `Recipient: ${memberWelcomeLog?.recipient}, Type: ${memberWelcomeLog?.email_type}, Status: ${memberWelcomeLog?.status}, Provider: ${memberWelcomeLog?.provider}`
  );

  // Verify that NO ACCOUNT_INVITATION or USER_WELCOME was triggered for the member
  const memberInviteLog = await waitForLog(
    (l) =>
      l.recipient === memberEmail &&
      (l.email_type === 'ACCOUNT_INVITATION' || l.email_type === 'USER_WELCOME') &&
      l.related_entity_id === testMemberId,
    2000
  );

  check(
    !memberInviteLog,
    'Member Directory Security Guard: Zero Account Invitation or User Welcome sent',
    'Confirmed: Member received ONLY MEMBER_WELCOME. No login credentials or activation links.'
  );

  // =========================================================================
  // TEST SECTION 3: System User Creation Workflow
  // =========================================================================
  console.log('\n--- TEST SECTION 3: User Management Creation Event Flow ---');

  const testUserId = `usr_test_${Date.now()}`;
  const userEmail = testRecipient;
  const userSetupUrl = `https://erp.diuic.org/reset-password?token=user_token_${Date.now()}&setup=true`;

  // Emit USER_CREATED (as done by users.controller.ts)
  emailEventBus.emitEvent({
    type: 'USER_CREATED',
    payload: {
      userId: testUserId,
      email: userEmail,
      fullName: 'Tahmina Akhter (Admin User)',
      loginUrl: 'https://erp.diuic.org/login',
      createdBy: 'super_admin',
    },
  });

  // Emit USER_INVITED (as done by users.controller.ts)
  emailEventBus.emitEvent({
    type: 'USER_INVITED',
    payload: {
      userId: testUserId,
      email: userEmail,
      fullName: 'Tahmina Akhter (Admin User)',
      setupUrl: userSetupUrl,
      roleName: 'AUDITOR',
      invitedBy: 'super_admin',
      expiresInHours: 48,
    },
  });

  // Wait for USER_WELCOME in email_logs
  const userWelcomeLog = await waitForLog(
    (l) =>
      l.recipient === userEmail &&
      l.email_type === 'USER_WELCOME' &&
      l.related_entity_id === testUserId &&
      (l.status === 'SENT' || l.status === 'FAILED')
  );

  check(
    Boolean(userWelcomeLog && userWelcomeLog.status === 'SENT'),
    'User Management: USER_WELCOME delivered via SMTP',
    `Recipient: ${userWelcomeLog?.recipient}, Type: ${userWelcomeLog?.email_type}, Status: ${userWelcomeLog?.status}`
  );

  // Wait for ACCOUNT_INVITATION in email_logs
  const userInviteLog = await waitForLog(
    (l) =>
      l.recipient === userEmail &&
      l.email_type === 'ACCOUNT_INVITATION' &&
      l.related_entity_id === testUserId &&
      (l.status === 'SENT' || l.status === 'FAILED')
  );

  check(
    Boolean(userInviteLog && userInviteLog.status === 'SENT'),
    'User Management: ACCOUNT_INVITATION delivered via SMTP',
    `Recipient: ${userInviteLog?.recipient}, Type: ${userInviteLog?.email_type}, Status: ${userInviteLog?.status}`
  );

  // =========================================================================
  // TEST SECTION 4: Telemetry & Log Persistence
  // =========================================================================
  console.log('\n--- TEST SECTION 4: Email Logs Telemetry Validation ---');

  check(
    Boolean(
      memberWelcomeLog?.provider === 'SMTP' &&
      memberWelcomeLog?.provider_status_code === 250 &&
      memberWelcomeLog?.email_type === 'MEMBER_WELCOME'
    ),
    'Audit Telemetry: MEMBER_WELCOME correctly logged with provider SMTP & code 250',
    `Type: ${memberWelcomeLog?.email_type}, Provider: ${memberWelcomeLog?.provider}, Code: ${memberWelcomeLog?.provider_status_code}`
  );

  check(
    Boolean(
      userInviteLog?.provider === 'SMTP' &&
      userInviteLog?.provider_status_code === 250 &&
      userInviteLog?.email_type === 'ACCOUNT_INVITATION'
    ),
    'Audit Telemetry: ACCOUNT_INVITATION correctly logged with provider SMTP & code 250',
    `Type: ${userInviteLog?.email_type}, Provider: ${userInviteLog?.provider}, Code: ${userInviteLog?.provider_status_code}`
  );

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n===============================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('===============================================================');
  const passed = assertions.filter((a) => a.passed).length;
  const total = assertions.length;
  console.log(`Assertions Passed: ${passed}/${total}`);

  for (const a of assertions) {
    console.log(`- [${a.passed ? 'PASS' : 'FAIL'}] ${a.name}`);
  }

  if (passed === total) {
    console.log('\nALL TEMPLATE SEPARATION & ROUTING CHECKS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\nSOME CHECKS FAILED!');
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
