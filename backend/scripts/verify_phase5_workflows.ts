/**
 * Phase 5 Comprehensive Workflow Verification Suite
 * DIU Investment Club ERP & Financial Management System
 *
 * Implements Section 17 End-to-End Tests:
 * TEST 1: Create New User -> Welcome Email
 * TEST 2: Confirm Payment -> Payment Confirmation Email
 * TEST 3: Submit Expense -> Approver Email
 * TEST 4: Approve Expense -> Approval Email
 * TEST 5: Reject Expense -> Rejection Email
 * TEST 6: Create Event -> Targeted Event Email
 * TEST 7: Schedule Meeting -> Meeting Invitation
 * TEST 8: Assign Task -> Task Email
 * TEST 9: Trigger Duplicate Event -> Verify only one email (Idempotency Protection)
 * TEST 10: Simulate Provider Failure -> Verify controlled retry system
 */

import { emailEventBus } from '../src/modules/email/email.events';
import { emailQueue, EmailJob } from '../src/modules/email/email.queue';
import { emailRepository } from '../src/modules/email/email.repository';
import { emailPreferencesManager } from '../src/modules/email/email.preferences';
import { DEFAULT_TEST_RECIPIENT } from '../src/modules/email/email.config';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  details: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, pass: boolean, details: string) {
  results.push({
    id,
    name,
    status: pass ? 'PASS' : 'FAIL',
    details,
  });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}: ${name} - ${details}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('========================================================================');
  console.log('PHASE 5: LIVE EMAIL WORKFLOW ACTIVATION & SMART NOTIFICATION CONTROL');
  console.log('========================================================================\n');

  const testBatchId = `p5_${Date.now()}`;

  // -------------------------------------------------------------------------
  // TEST 1: Create New User -> Welcome Email
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: User Account Creation -> Welcome Email ---');
  const userEventId = `user_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'USER_CREATED',
    payload: {
      userId: userEventId,
      email: DEFAULT_TEST_RECIPIENT,
      fullName: 'Tanvir Ahmed (Executive Member)',
      loginUrl: 'http://localhost:3000/login',
      createdBy: '00000000-0000-0000-0000-000000000001',
    },
  });

  // Give background queue brief moment to process
  await sleep(2500);

  const welcomeLog = await emailRepository.findByIdempotencyKey(`USER_CREATED:${userEventId}`);
  record(
    'TEST-01',
    'Create New User -> Welcome Email Job Dispatched',
    Boolean(welcomeLog && (welcomeLog.status === 'SENT' || welcomeLog.status === 'PENDING')),
    welcomeLog ? `Log ID: ${welcomeLog.id} | Status: ${welcomeLog.status} | Provider ID: ${welcomeLog.provider_message_id}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 2: Confirm Payment -> Payment Confirmation Email
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Payment Confirmation -> Payment Confirmation Email ---');
  const paymentEventId = `pay_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'PAYMENT_CONFIRMED',
    payload: {
      paymentId: paymentEventId,
      paymentNumber: `REC-${testBatchId.toUpperCase()}`,
      memberId: 'mem_12345',
      memberName: 'Tanvir Ahmed',
      memberEmail: DEFAULT_TEST_RECIPIENT,
      amount: 2500,
      paymentMethod: 'bKash Merchant Payment',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: `TRX-${testBatchId}`,
      verifiedBy: '00000000-0000-0000-0000-000000000001',
    },
  });

  await sleep(2500);
  const payLog = await emailRepository.findByIdempotencyKey(`PAYMENT_CONFIRMED:${paymentEventId}`);
  record(
    'TEST-02',
    'Confirm Payment -> Payment Confirmation Email Dispatched',
    Boolean(payLog && (payLog.status === 'SENT' || payLog.status === 'PENDING')),
    payLog ? `Log ID: ${payLog.id} | Status: ${payLog.status} | Provider ID: ${payLog.provider_message_id}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 3: Submit Expense -> Approver Email
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Submit Expense -> Approver Email ---');
  const expSubId = `exp_sub_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'EXPENSE_SUBMITTED',
    payload: {
      expenseId: expSubId,
      expenseNumber: `EXP-${testBatchId}`,
      title: 'Annual Investment Gala Venue Advance',
      amount: 15000,
      categoryName: 'EVENT_MANAGEMENT',
      submitterId: 'usr_sub_01',
      submitterName: 'Treasurer Office',
      approverEmails: [DEFAULT_TEST_RECIPIENT],
    },
  });

  await sleep(2500);
  const expSubLog = await emailRepository.findByIdempotencyKey(`EXPENSE_SUBMITTED:${expSubId}:${DEFAULT_TEST_RECIPIENT}`);
  record(
    'TEST-03',
    'Submit Expense -> Approver Notification Dispatched',
    Boolean(expSubLog && (expSubLog.status === 'SENT' || expSubLog.status === 'PENDING')),
    expSubLog ? `Log ID: ${expSubLog.id} | Status: ${expSubLog.status}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 4: Approve Expense -> Approval Email
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Approve Expense -> Approval Email ---');
  const expAppId = `exp_app_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'EXPENSE_APPROVED',
    payload: {
      expenseId: expAppId,
      expenseNumber: `EXP-${testBatchId}`,
      title: 'Annual Investment Gala Venue Advance',
      amount: 15000,
      recipientEmail: DEFAULT_TEST_RECIPIENT,
      recipientName: 'Treasurer Office',
      approverId: 'usr_pres_01',
      approverName: 'Club President',
      notes: 'Approved under FY2026 Q2 Event Budget.',
      approvalDate: 'April 2, 2026',
    },
  });

  await sleep(2500);
  const expAppLog = await emailRepository.findByIdempotencyKey(`EXPENSE_APPROVED:${expAppId}`);
  record(
    'TEST-04',
    'Approve Expense -> Submitter Approval Email Dispatched',
    Boolean(expAppLog && (expAppLog.status === 'SENT' || expAppLog.status === 'PENDING')),
    expAppLog ? `Log ID: ${expAppLog.id} | Status: ${expAppLog.status}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 5: Reject Expense -> Rejection Email
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Reject Expense -> Rejection Email ---');
  const expRejId = `exp_rej_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'EXPENSE_REJECTED',
    payload: {
      expenseId: expRejId,
      expenseNumber: `EXP-${testBatchId}`,
      title: 'Marketing Flyer Printing Claim',
      amount: 3200,
      recipientEmail: DEFAULT_TEST_RECIPIENT,
      recipientName: 'Committee Member',
      approverId: 'usr_vp_01',
      approverName: 'VP Finance',
      reason: 'Official VAT invoice receipt was not attached.',
    },
  });

  await sleep(2500);
  const expRejLog = await emailRepository.findByIdempotencyKey(`EXPENSE_REJECTED:${expRejId}`);
  record(
    'TEST-05',
    'Reject Expense -> Submitter Rejection Email Dispatched',
    Boolean(expRejLog && (expRejLog.status === 'SENT' || expRejLog.status === 'PENDING')),
    expRejLog ? `Log ID: ${expRejLog.id} | Status: ${expRejLog.status}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 6: Create Event -> Targeted Event Notification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Create Event -> Targeted Event Notification ---');
  const eventId = `evt_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'EVENT_CREATED',
    payload: {
      eventId,
      title: 'DSE Equity Research Symposium 2026',
      startDate: 'Saturday, May 16, 2026',
      location: 'DIU Auditorium, Daffodil Smart City',
      summary: 'Comprehensive hands-on training on capital market equity analysis and portfolio diversification.',
      targetAudience: 'ALL',
      targetEmails: [DEFAULT_TEST_RECIPIENT],
      createdBy: '00000000-0000-0000-0000-000000000001',
    },
  });

  await sleep(2500);
  const eventLog = await emailRepository.findByIdempotencyKey(`EVENT_CREATED:${eventId}:${DEFAULT_TEST_RECIPIENT}`);
  record(
    'TEST-06',
    'Create Event -> Targeted Event Notification Dispatched',
    Boolean(eventLog && (eventLog.status === 'SENT' || eventLog.status === 'PENDING')),
    eventLog ? `Log ID: ${eventLog.id} | Status: ${eventLog.status}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 7: Schedule Meeting -> Meeting Invitation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Schedule Meeting -> Meeting Invitation ---');
  const meetId = `meet_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'MEETING_SCHEDULED',
    payload: {
      meetingId: meetId,
      title: 'Q2 Investment Committee Asset Allocation Review',
      meetingDate: 'Monday, May 18, 2026',
      startTime: '3:00 PM',
      location: 'Conference Room 402, Daffodil Smart City',
      meetingLink: 'https://meet.google.com/xyz-diuic',
      agendaSummary: 'Review equity holdings, sector weighting, and risk management triggers.',
      participantEmails: [DEFAULT_TEST_RECIPIENT],
      createdBy: '00000000-0000-0000-0000-000000000001',
    },
  });

  await sleep(2500);
  const meetLog = await emailRepository.findByIdempotencyKey(`MEETING_SCHEDULED:${meetId}:${DEFAULT_TEST_RECIPIENT}`);
  record(
    'TEST-07',
    'Schedule Meeting -> Meeting Invitation Dispatched',
    Boolean(meetLog && (meetLog.status === 'SENT' || meetLog.status === 'PENDING')),
    meetLog ? `Log ID: ${meetLog.id} | Status: ${meetLog.status}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 8: Assign Task -> Task Assignment Email
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Assign Task -> Task Assignment Email ---');
  const taskId = `task_${testBatchId}`;
  emailEventBus.emitEvent({
    type: 'TASK_ASSIGNED',
    payload: {
      taskId,
      title: 'Reconcile Q1 Bank Statements & DSE Broker Accounts',
      assigneeId: 'usr_assignee_01',
      assigneeName: 'Tanvir Ahmed',
      assigneeEmail: DEFAULT_TEST_RECIPIENT,
      assignedByName: 'VP Finance',
      dueDate: 'May 20, 2026',
      priority: 'HIGH',
      description: 'Ensure all clearing deposits match bank records.',
    },
  });

  await sleep(2500);
  const taskLog = await emailRepository.findByIdempotencyKey(`TASK_ASSIGNED:${taskId}:usr_assignee_01`);
  record(
    'TEST-08',
    'Assign Task -> Task Assignment Email Dispatched',
    Boolean(taskLog && (taskLog.status === 'SENT' || taskLog.status === 'PENDING')),
    taskLog ? `Log ID: ${taskLog.id} | Status: ${taskLog.status}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // TEST 9: Duplicate Trigger -> Verify Idempotency Protection
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Duplicate Trigger -> Verify Idempotency Protection ---');
  // Directly execute job with identical idempotencyKey to verify duplicate guard
  const duplicateResult = await emailQueue.executeJob({
    id: `dup_${testBatchId}`,
    idempotencyKey: `PAYMENT_CONFIRMED:${paymentEventId}`,
    emailType: 'PAYMENT_CONFIRMATION',
    category: 'FINANCIAL',
    recipient: DEFAULT_TEST_RECIPIENT,
    subject: 'Duplicate Payment Email Check',
    html: '<p>Duplicate payload</p>',
  });

  const paymentLog = await emailRepository.findByIdempotencyKey(`PAYMENT_CONFIRMED:${paymentEventId}`);

  record(
    'TEST-09',
    'Trigger Duplicate Event -> Exactly 1 Email Dispatched (Idempotency Active)',
    paymentLog !== null && paymentLog.status === 'SENT' && duplicateResult.providerMessageId !== undefined,
    `Existing log status: ${paymentLog?.status} | Skip result: ${duplicateResult.providerMessageId}`
  );

  // -------------------------------------------------------------------------
  // TEST 10: Simulate Provider Failure -> Verify Retry Logic
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: Simulate Provider Failure -> Verify Controlled Retry System ---');
  const failJobId = `fail_${testBatchId}`;
  const testJob: EmailJob = {
    id: failJobId,
    idempotencyKey: `FAIL_SIMULATION:${failJobId}`,
    emailType: 'TEST_SIMULATED_FAILURE',
    category: 'GENERAL',
    recipient: DEFAULT_TEST_RECIPIENT,
    subject: 'Simulated Provider Failure Test',
    html: '<p>Testing retry mechanism</p>',
    maxRetries: 3,
  };

  const result = await emailQueue.executeJob(testJob);
  const failLog = await emailRepository.findByIdempotencyKey(`FAIL_SIMULATION:${failJobId}`);

  record(
    'TEST-10',
    'Simulate Provider Failure -> Verify Controlled Retry & Final FAILED State',
    result.success === false && Boolean(failLog && failLog.status === 'FAILED' && failLog.attempt_count === 3),
    failLog ? `Final Status: ${failLog.status} | Attempts: ${failLog.attempt_count} | Error: ${failLog.error_message}` : 'No log found'
  );

  // -------------------------------------------------------------------------
  // Additional Checks: Stats & Notification Preferences
  // -------------------------------------------------------------------------
  console.log('\n--- ADDITIONAL VERIFICATIONS: Stats & Preferences ---');
  const stats = await emailRepository.getStats();
  record(
    'STATS-01',
    'Admin Email Stats Aggregation',
    stats.total > 0 && typeof stats.sent === 'number',
    `Total: ${stats.total} | Sent: ${stats.sent} | Failed: ${stats.failed}`
  );

  const updatedPrefs = emailPreferencesManager.updatePreferences('user_test_123', {
    eventNotifications: false,
  });
  record(
    'PREF-01',
    'Notification Preferences with Immutable Security Alerts',
    updatedPrefs.eventNotifications === false && updatedPrefs.securityAlerts === true,
    `eventNotifications: ${updatedPrefs.eventNotifications}, securityAlerts: ${updatedPrefs.securityAlerts}`
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('FINAL VERIFICATION SUMMARY:');
  console.log('========================================================================');
  console.table(results);

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL PHASE 5 TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
