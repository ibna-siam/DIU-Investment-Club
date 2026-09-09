/**
 * DIU Investment Club ERP - Gmail SMTP Live Integration Verification Script
 * Validates:
 * 1. Verify SMTP connection safely via transporter.verify()
 * 2. Send a direct test email via SMTP
 * 3. Test New Member Welcome Email (routed strictly to member.email via SMTP)
 * 4. Test New User Welcome Email (routed strictly to user.email via SMTP)
 * 5. Test Account Activation / Invitation Email (routed strictly to user.email via SMTP)
 * 6. Verify all emails go to their correct recipient
 * 7. Verify email logs correctly record provider: 'SMTP' and status: 'SENT'
 */

import { smtpProvider } from '../src/modules/email/providers/smtp.provider';
import { emailProviderFactory } from '../src/modules/email/providers/provider.factory';
import { emailAutomationManager } from '../src/modules/email/email.automation.settings';
import { emailRepository, EmailLogRecord } from '../src/modules/email/email.repository';
import { emailEventBus } from '../src/modules/email/email.events';
import { emailService } from '../src/modules/email/email.service';
import { emailQueue } from '../src/modules/email/email.queue';
import { env } from '../src/config/env';

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
  console.log('==================================================');
  console.log('STARTING GMAIL SMTP LIVE INTEGRATION VERIFICATION');
  console.log('==================================================');

  // Ensure EmailQueue is active and listeners registered
  console.log(`Email Queue status: initialized, active queue length = ${emailQueue.getQueueSize()}`);

  // STEP 1: Verify Active Provider Configuration
  const activeProvider = emailProviderFactory.getActiveProviderName();
  console.log(`\nActive Provider: [${activeProvider}]`);
  assert(
    activeProvider === 'SMTP',
    'Provider Architecture: Gmail SMTP is the active default provider',
    `Active provider is configured as: ${activeProvider}`
  );

  // STEP 2: Safely Verify SMTP Connection
  console.log('\n--- STEP 1: Verifying SMTP Connection ---');
  const verifyResult = await smtpProvider.verifyConnection();
  assert(
    verifyResult.success,
    'SMTP Connection: Successfully authenticated with smtp.gmail.com',
    verifyResult.success ? 'SMTP connection and authentication verified' : `Verification error: ${verifyResult.error}`
  );

  if (!verifyResult.success) {
    console.error('❌ SMTP connection failed. Aborting further tests.');
    process.exit(1);
  }

  // Ensure settings are in LIVE mode with all automation rules enabled
  await emailAutomationManager.updateSettings({
    environmentMode: 'LIVE',
    testRecipientEmail: env.RESEND_TEST_RECIPIENT || 'siamibna75@gmail.com',
    rules: {
      newMemberWelcome: true,
      expenseApproval: true,
      taskAssignment: true,
      meetingReminder: true,
      eventReminder: true,
      securityAlert: true,
    }
  });

  const memberTestEmail = 'siamibna75@gmail.com'; // Deliver to accessible inbox for live delivery verification
  const userTestEmail = 'siamibna75@gmail.com';

  // STEP 3: Direct SMTP Test Email
  console.log('\n--- STEP 2: Direct SMTP Test Email ---');
  const directSendResult = await smtpProvider.send({
    to: memberTestEmail,
    subject: 'Gmail SMTP Direct Verification | DIU Investment Club',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #10b981;">DIU Investment Club</h2>
        <p>This is a live diagnostic message confirming that Gmail SMTP is active and operating.</p>
        <p style="color: #94a3b8; font-size: 12px;">Sent via Nodemailer Gmail Transport</p>
      </div>
    `,
    text: 'DIU Investment Club - Gmail SMTP diagnostic message'
  });

  assert(
    directSendResult.success,
    'Direct Test Email: Sent successfully via Gmail SMTP',
    `Message ID: ${directSendResult.id}, provider: ${directSendResult.provider}, statusCode: ${directSendResult.statusCode}`
  );

  // STEP 4: Member Registration Automated Welcome Email
  console.log('\n--- STEP 3: New Member Welcome Email via Automation ---');
  const memberId = `mem_gmail_${Date.now()}`;
  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId,
      memberCode: 'DIU-2026-LIVE',
      fullName: 'Siam Ibna (Club Member)',
      email: memberTestEmail,
      studentId: '201-15-5555',
      department: 'Software Engineering',
      batch: '55th',
      loginUrl: null,
      createdBy: 'super_admin'
    }
  });

  const memberWelcomeLog = await waitForLog(
    (l) => l.recipient === memberTestEmail && l.email_type === 'WELCOME' && l.related_entity_id === memberId && (l.status === 'SENT' || l.status === 'FAILED')
  );

  assert(
    Boolean(memberWelcomeLog && memberWelcomeLog.status === 'SENT'),
    'Member Registration: Welcome Email delivered via SMTP',
    `Recipient: ${memberWelcomeLog?.recipient}, provider: ${memberWelcomeLog?.provider}, status: ${memberWelcomeLog?.status}, msgId: ${memberWelcomeLog?.provider_message_id}`
  );

  const memberInviteLog = await waitForLog(
    (l) => l.recipient === memberTestEmail && l.email_type === 'ACCOUNT_INVITATION' && l.related_entity_id === memberId,
    1500
  );

  assert(
    !memberInviteLog,
    'Member Registration: NO Account Activation / Credentials sent to member',
    'Confirmed: member directory registration dispatches Welcome Email only'
  );

  // STEP 5: New User Welcome Email & Account Invitation Email
  console.log('\n--- STEP 4 & 5: New User Welcome & Invitation via Automation ---');
  const userId = `usr_gmail_${Date.now()}`;
  emailEventBus.emitEvent({
    type: 'USER_CREATED',
    payload: {
      userId,
      fullName: 'Siam Ibna (Club User)',
      email: userTestEmail,
      loginUrl: 'https://erp.diuic.org/login',
      createdBy: 'super_admin'
    }
  });

  emailEventBus.emitEvent({
    type: 'USER_INVITED',
    payload: {
      userId,
      fullName: 'Siam Ibna (Club User)',
      email: userTestEmail,
      setupUrl: 'https://erp.diuic.org/auth/activate?token=sample_gmail_invite_123',
      roleName: 'EXECUTIVE_MEMBER',
      invitedBy: 'super_admin'
    }
  });

  const userWelcomeLog = await waitForLog(
    (l) => l.recipient === userTestEmail && l.email_type === 'WELCOME' && l.related_entity_id === userId && (l.status === 'SENT' || l.status === 'FAILED')
  );

  assert(
    Boolean(userWelcomeLog && userWelcomeLog.status === 'SENT'),
    'User Account: Professional Welcome Email delivered via SMTP',
    `Recipient: ${userWelcomeLog?.recipient}, provider: ${userWelcomeLog?.provider}, status: ${userWelcomeLog?.status}`
  );

  const userInviteLog = await waitForLog(
    (l) => l.recipient === userTestEmail && l.email_type === 'ACCOUNT_INVITATION' && l.related_entity_id === userId && (l.status === 'SENT' || l.status === 'FAILED')
  );

  assert(
    Boolean(userInviteLog && userInviteLog.status === 'SENT'),
    'User Account: Account Activation / Invitation Email delivered via SMTP',
    `Recipient: ${userInviteLog?.recipient}, provider: ${userInviteLog?.provider}, status: ${userInviteLog?.status}`
  );

  // STEP 6: Verify Telemetry in Email Logs
  console.log('\n--- STEP 6 & 7: Telemetry & Recipient Verification ---');
  assert(
    Boolean(
      memberWelcomeLog?.provider === 'SMTP' &&
      memberWelcomeLog?.recipient === memberTestEmail &&
      memberWelcomeLog?.provider_status_code === 250
    ),
    'Email Logging Telemetry: Correctly logs provider SMTP and status code 250',
    `Provider: ${memberWelcomeLog?.provider}, Status Code: ${memberWelcomeLog?.provider_status_code}, Recipient: ${memberWelcomeLog?.recipient}`
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
    console.log('\nALL GMAIL SMTP VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\nSOME GMAIL SMTP VERIFICATIONS FAILED!');
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
