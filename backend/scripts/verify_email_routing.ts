import { emailQueue } from '../src/modules/email/email.queue';
import { emailService } from '../src/modules/email/email.service';
import { emailEventBus } from '../src/modules/email/email.events';
import { isValidEmail } from '../src/modules/email/email.security';
import { DEFAULT_ADMIN_EMAIL } from '../src/modules/email/email.config';

async function testEmailRouting() {
  console.log('--- 1. Testing Recipient Validation (isValidEmail) ---');
  const validCases = [
    'member.student123@diu.edu.bd',
    'president@diu.edu.bd',
    'newuser.test@example.com',
    'siamibna75@gmail.com'
  ];
  const invalidCases = [
    '',
    '   ',
    'plainaddress',
    '@missingusername.com',
    'username@.com',
    null as any,
    undefined as any
  ];

  for (const email of validCases) {
    if (!isValidEmail(email)) {
      throw new Error(`Expected "${email}" to be valid, but got invalid!`);
    }
  }
  for (const email of invalidCases) {
    if (isValidEmail(email)) {
      throw new Error(`Expected "${email}" to be invalid, but got valid!`);
    }
  }
  console.log('✅ Recipient email format validator works accurately.');

  console.log('\n--- 2. Testing Member Creation Email Event Routing ---');
  const testMemberEmail = `verified.member.${Date.now()}@diu.edu.bd`;
  let capturedMemberJob: any = null;

  // Intercept enqueue to inspect job parameters
  const origEnqueue = emailQueue.enqueue.bind(emailQueue);
  emailQueue.enqueue = function(job) {
    if (job.emailType === 'WELCOME' && job.relatedEntityType === 'member') {
      capturedMemberJob = job;
    }
    return origEnqueue(job);
  };

  emailEventBus.emitEvent({
    type: 'MEMBER_CREATED',
    payload: {
      memberId: 'm-test-12345',
      memberCode: 'MEM-9999',
      fullName: 'Test Candidate Member',
      email: testMemberEmail,
      studentId: '221-15-9999',
      department: 'CSE',
      batch: '58th',
      createdBy: 'admin-001',
    }
  });

  // Give short moment for event listener
  await new Promise(r => setTimeout(r, 100));

  if (!capturedMemberJob) {
    throw new Error('MEMBER_CREATED event did not trigger email enqueue!');
  }
  console.log(`Enqueued member job recipient: "${capturedMemberJob.recipient}"`);
  if (capturedMemberJob.recipient !== testMemberEmail) {
    throw new Error(`Expected member job recipient to be "${testMemberEmail}", but got "${capturedMemberJob.recipient}"!`);
  }
  if (capturedMemberJob.recipient.includes('siamibna75@gmail.com')) {
    throw new Error('Member email was incorrectly routed to hardcoded test recipient!');
  }
  console.log('✅ Member Welcome Email successfully routed strictly to member.email.');

  console.log('\n--- 3. Testing User Invitation Email Event Routing ---');
  const testUserEmail = `verified.user.${Date.now()}@diu.edu.bd`;
  let capturedUserJob: any = null;

  emailQueue.enqueue = function(job) {
    if (job.emailType === 'ACCOUNT_INVITATION') {
      capturedUserJob = job;
    }
    return origEnqueue(job);
  };

  emailEventBus.emitEvent({
    type: 'USER_INVITED',
    payload: {
      userId: 'u-test-67890',
      email: testUserEmail,
      fullName: 'New System Operator',
      setupUrl: 'https://club.diu.ac/setup?token=xyz',
      roleName: 'EXECUTIVE',
      invitedBy: 'admin-001',
      expiresInHours: 48,
    }
  });

  await new Promise(r => setTimeout(r, 100));

  if (!capturedUserJob) {
    throw new Error('USER_INVITED event did not trigger email enqueue!');
  }
  console.log(`Enqueued user job recipient: "${capturedUserJob.recipient}"`);
  if (capturedUserJob.recipient !== testUserEmail) {
    throw new Error(`Expected user job recipient to be "${testUserEmail}", but got "${capturedUserJob.recipient}"!`);
  }
  if (capturedUserJob.recipient.includes('siamibna75@gmail.com')) {
    throw new Error('User email was incorrectly routed to hardcoded test recipient!');
  }
  console.log('✅ User Invitation Email successfully routed strictly to user.email.');

  console.log('\n--- 4. Testing Admin Notification Routing (Expense Submission) ---');
  let capturedExpenseJob: any = null;

  emailQueue.enqueue = function(job) {
    if (job.emailType === 'EXPENSE_SUBMITTED') {
      capturedExpenseJob = job;
    }
    return origEnqueue(job);
  };

  emailEventBus.emitEvent({
    type: 'EXPENSE_SUBMITTED',
    payload: {
      expenseId: 'exp-12345',
      expenseNumber: 'EXP-2026-001',
      title: 'Club Hackathon Banners',
      amount: 4500,
      categoryName: 'Events',
      submitterId: 'user-001',
      submitterName: 'Event Organizer',
      approverEmails: [], // No specific approvers specified
    }
  });

  await new Promise(r => setTimeout(r, 100));

  if (!capturedExpenseJob) {
    throw new Error('EXPENSE_SUBMITTED event did not trigger email enqueue!');
  }
  console.log(`Enqueued expense admin notification recipient: "${capturedExpenseJob.recipient}"`);
  if (capturedExpenseJob.recipient !== DEFAULT_ADMIN_EMAIL) {
    throw new Error(`Expected admin notification to route to "${DEFAULT_ADMIN_EMAIL}", but got "${capturedExpenseJob.recipient}"!`);
  }
  if (capturedExpenseJob.recipient.includes('siamibna75@gmail.com')) {
    throw new Error('Admin notification was incorrectly routed to personal email!');
  }
  console.log('✅ Admin notifications route cleanly and only to intended administrator email.');

  console.log('\n--- 5. Testing Invalid Recipient Handling (No Silent Fallback) ---');
  emailQueue.enqueue = origEnqueue; // restore

  const invalidJobResult = await emailQueue.executeJob({
    id: `job-inv-${Date.now()}`,
    idempotencyKey: `INVALID_TEST_${Date.now()}`,
    emailType: 'WELCOME',
    category: 'SECURITY',
    recipient: 'not-a-valid-email',
    subject: 'Welcome to Club',
    html: '<p>Test</p>',
    text: 'Test',
  });

  if (invalidJobResult.success) {
    throw new Error('Expected invalid recipient job to fail, but it reported success!');
  }
  if (invalidJobResult.error !== 'INVALID_RECIPIENT') {
    throw new Error(`Expected error 'INVALID_RECIPIENT', got: ${invalidJobResult.error}`);
  }
  console.log('✅ Invalid recipient was rejected cleanly with error INVALID_RECIPIENT without silent rerouting.');

  console.log('\n--- 6. Testing Direct emailService.sendEmail Validation ---');
  const directInvalid = await emailService.sendEmail({
    to: 'invalid-recipient',
    subject: 'Direct send test',
    html: '<p>Test</p>',
    text: 'Test',
  });

  if (directInvalid.success) {
    throw new Error('Expected direct send with invalid recipient to fail, but succeeded!');
  }
  console.log(`Direct send error correctly returned: "${directInvalid.error}"`);
  console.log('✅ Direct send validates recipient and blocks dispatch without rerouting.');

  console.log('\n=========================================');
  console.log('ALL EMAIL RECIPIENT ROUTING TESTS PASSED!');
  console.log('=========================================');
}

testEmailRouting()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
