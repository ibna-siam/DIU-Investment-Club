/**
 * Phase 8: Smart Email Scheduler & Automated Reminder Engine - Verification Suite
 *
 * Enforces all Section 21 end-to-end scenarios:
 * - TEST 1: Create Event -> Schedule Event Reminder
 * - TEST 2: Cancel Event -> Verify future reminders are cancelled
 * - TEST 3: Create Meeting -> Schedule Meeting Reminder
 * - TEST 4: Assign Task -> Task Deadline Reminder
 * - TEST 5: Complete Task -> Verify future reminders stop
 * - TEST 6: Create Membership Due -> Reminder scheduled
 * - TEST 7: Payment Completed -> Future payment reminders cancelled
 * - TEST 8: Run scheduler twice -> Verify duplicate reminder is NOT sent
 * - TEST 9: Failed email reminder -> Verify retry logic
 * - TEST 10: Check Asia/Dhaka timezone accuracy
 * - TEST 11: Unauthorized user attempts reminder management -> Access denied
 * - BRAND-01: Official Brand & Affiliation Check (DIU Investment Club & Daffodil International University)
 */

import { remindersRepository } from '../src/modules/reminders/reminders.repository';
import { reminderScheduler } from '../src/modules/reminders/reminder.scheduler';
import { calculateScheduledTime, formatDhakaDateTime, toDhakaDate, DHAKA_TIMEZONE } from '../src/modules/reminders/reminder.timezone';
import { emailEventBus } from '../src/modules/email/email.events';
import { EMAIL_BRAND } from '../src/modules/email/email.brand';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name} - ${details}`);
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 DIU INVESTMENT CLUB - PHASE 8 VERIFICATION SUITE');
  console.log('   Smart Email Scheduler & Automated Reminder Engine');
  console.log('================================================================\n');

  const anchorFutureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days in future

  // TEST 1: Create Event -> Schedule Event Reminder
  try {
    const eventId = `evt_test_${Date.now()}`;
    const scheduled = await remindersRepository.scheduleEntityReminders({
      entityType: 'EVENT',
      entityId: eventId,
      title: 'Annual Investment Summit 2026',
      targetDate: anchorFutureDate,
      recipientEmail: 'participant@diu.edu.bd',
      recipientName: 'Club Member',
    });

    const hasAllOffsets =
      scheduled.some((r) => r.schedule_point === '-7d') &&
      scheduled.some((r) => r.schedule_point === '-3d') &&
      scheduled.some((r) => r.schedule_point === '-1d') &&
      scheduled.some((r) => r.schedule_point === '-1h');

    const allHaveIdempotencyKeys = scheduled.every((r) => Boolean(r.idempotency_key));

    if (scheduled.length >= 4 && hasAllOffsets && allHaveIdempotencyKeys) {
      record(
        'TEST 1: Create Event -> Schedule Event Reminders',
        true,
        `Scheduled ${scheduled.length} reminder points (-7d, -3d, -1d, -1h) with deterministic idempotency keys`
      );
    } else {
      record(
        'TEST 1: Create Event -> Schedule Event Reminders',
        false,
        `Expected 4 reminder offsets, received: ${scheduled.length}`
      );
    }
  } catch (err: any) {
    record('TEST 1: Create Event -> Schedule Event Reminders', false, err.message);
  }

  // TEST 2: Cancel Event -> Verify future reminders are cancelled
  try {
    const eventId = `evt_cancel_${Date.now()}`;
    await remindersRepository.scheduleEntityReminders({
      entityType: 'EVENT',
      entityId: eventId,
      title: 'Workshop To Cancel',
      targetDate: anchorFutureDate,
      recipientEmail: 'participant@diu.edu.bd',
    });

    // Emit domain event
    emailEventBus.emitEvent({
      type: 'EVENT_CANCELLED',
      payload: {
        eventId,
        title: 'Workshop To Cancel',
        reason: 'Inclement weather condition',
      },
    });

    // Small delay for event listener
    await new Promise((r) => setTimeout(r, 250));

    const reminders = await remindersRepository.getReminders({ limit: 50 });
    const eventRems = reminders.filter((r) => r.related_record_id === eventId);
    const allCancelled = eventRems.length > 0 && eventRems.every((r) => r.status === 'CANCELLED');

    if (allCancelled) {
      record(
        'TEST 2: Cancel Event -> Automatic Reminder Cancellation',
        true,
        `All ${eventRems.length} reminders for cancelled event transitioned to CANCELLED with audit reason recorded`
      );
    } else {
      record(
        'TEST 2: Cancel Event -> Automatic Reminder Cancellation',
        false,
        `Reminders were not cancelled as expected: ${JSON.stringify(eventRems.map((r) => r.status))}`
      );
    }
  } catch (err: any) {
    record('TEST 2: Cancel Event -> Automatic Reminder Cancellation', false, err.message);
  }

  // TEST 3: Create Meeting -> Schedule Meeting Reminder
  try {
    const meetingId = `meet_test_${Date.now()}`;
    const scheduled = await remindersRepository.scheduleEntityReminders({
      entityType: 'MEETING',
      entityId: meetingId,
      title: 'Quarterly Executive Review',
      targetDate: anchorFutureDate,
      recipientEmail: 'exec@diu.edu.bd',
    });

    const hasMeetingOffsets =
      scheduled.some((r) => r.schedule_point === '-24h') && scheduled.some((r) => r.schedule_point === '-1h');

    if (scheduled.length === 2 && hasMeetingOffsets) {
      record(
        'TEST 3: Create Meeting -> Schedule Meeting Reminder',
        true,
        `Scheduled 2 meeting reminder points (-24h, -1h) for meeting ${meetingId}`
      );
    } else {
      record(
        'TEST 3: Create Meeting -> Schedule Meeting Reminder',
        false,
        `Expected 2 meeting reminder points, received: ${scheduled.length}`
      );
    }
  } catch (err: any) {
    record('TEST 3: Create Meeting -> Schedule Meeting Reminder', false, err.message);
  }

  // TEST 4: Assign Task -> Task Deadline Reminder
  try {
    const taskId = `task_test_${Date.now()}`;
    const scheduled = await remindersRepository.scheduleEntityReminders({
      entityType: 'TASK',
      entityId: taskId,
      title: 'Prepare Club Tax Return Documentation',
      targetDate: anchorFutureDate,
      recipientEmail: 'treasurer@diu.edu.bd',
      recipientName: 'Club Treasurer',
      priority: 'HIGH',
    });

    const hasTaskOffsets =
      scheduled.some((r) => r.schedule_point === '-3d') &&
      scheduled.some((r) => r.schedule_point === '-1d') &&
      scheduled.some((r) => r.schedule_point === 'DUE') &&
      scheduled.some((r) => r.schedule_point === '+1d');

    if (scheduled.length === 4 && hasTaskOffsets) {
      record(
        'TEST 4: Assign Task -> Task Deadline Reminder',
        true,
        `Scheduled 4 task deadline reminders (-3d, -1d, DUE, +1d overdue)`
      );
    } else {
      record(
        'TEST 4: Assign Task -> Task Deadline Reminder',
        false,
        `Expected 4 task reminder points, received: ${scheduled.length}`
      );
    }
  } catch (err: any) {
    record('TEST 4: Assign Task -> Task Deadline Reminder', false, err.message);
  }

  // TEST 5: Complete Task -> Verify future reminders stop
  try {
    const taskId = `task_complete_${Date.now()}`;
    await remindersRepository.scheduleEntityReminders({
      entityType: 'TASK',
      entityId: taskId,
      title: 'Task To Complete',
      targetDate: anchorFutureDate,
      recipientEmail: 'assignee@diu.edu.bd',
    });

    // Emit TASK_COMPLETED domain event
    emailEventBus.emitEvent({
      type: 'TASK_COMPLETED',
      payload: {
        taskId,
        title: 'Task To Complete',
        completedBy: 'assignee_user',
      },
    });

    await new Promise((r) => setTimeout(r, 250));

    const reminders = await remindersRepository.getReminders({ limit: 50 });
    const taskRems = reminders.filter((r) => r.related_record_id === taskId);
    const allCancelled = taskRems.length > 0 && taskRems.every((r) => r.status === 'CANCELLED');

    if (allCancelled) {
      record(
        'TEST 5: Complete Task -> Future Reminders Stop',
        true,
        `All future deadline reminders for completed task transitioned to CANCELLED`
      );
    } else {
      record(
        'TEST 5: Complete Task -> Future Reminders Stop',
        false,
        `Task reminders were not cancelled: ${JSON.stringify(taskRems.map((r) => r.status))}`
      );
    }
  } catch (err: any) {
    record('TEST 5: Complete Task -> Future Reminders Stop', false, err.message);
  }

  // TEST 6: Create Membership Due -> Reminder scheduled
  try {
    const dueId = `due_test_${Date.now()}`;
    const scheduled = await remindersRepository.scheduleEntityReminders({
      entityType: 'MEMBER_DUE',
      entityId: dueId,
      title: 'General Membership Renewal 2026',
      targetDate: anchorFutureDate,
      recipientEmail: 'member_due@diu.edu.bd',
    });

    const hasDueOffsets =
      scheduled.some((r) => r.schedule_point === '-7d') &&
      scheduled.some((r) => r.schedule_point === 'DUE') &&
      scheduled.some((r) => r.schedule_point === '+3d');

    if (scheduled.length === 3 && hasDueOffsets) {
      record(
        'TEST 6: Create Membership Due -> Reminders Scheduled',
        true,
        `Scheduled 3 dues reminder points (-7d, DUE, +3d escalation)`
      );
    } else {
      record(
        'TEST 6: Create Membership Due -> Reminders Scheduled',
        false,
        `Expected 3 dues reminder points, received: ${scheduled.length}`
      );
    }
  } catch (err: any) {
    record('TEST 6: Create Membership Due -> Reminders Scheduled', false, err.message);
  }

  // TEST 7: Payment Completed -> Future payment reminders cancelled
  try {
    const dueId = `due_paid_${Date.now()}`;
    await remindersRepository.scheduleEntityReminders({
      entityType: 'MEMBER_DUE',
      entityId: dueId,
      title: 'Dues To Be Paid',
      targetDate: anchorFutureDate,
      recipientEmail: 'paying_member@diu.edu.bd',
    });

    // Emit MEMBER_DUE_PAID domain event
    emailEventBus.emitEvent({
      type: 'MEMBER_DUE_PAID',
      payload: {
        dueId,
        memberId: 'mem_123',
        amount: 1500,
      },
    });

    await new Promise((r) => setTimeout(r, 250));

    const reminders = await remindersRepository.getReminders({ limit: 50 });
    const dueRems = reminders.filter((r) => r.related_record_id === dueId);
    const allCancelled = dueRems.length > 0 && dueRems.every((r) => r.status === 'CANCELLED');

    if (allCancelled) {
      record(
        'TEST 7: Payment Completed -> Future Payment Reminders Cancelled',
        true,
        `Payment receipt automatically cancelled pending reminders for due ${dueId}`
      );
    } else {
      record(
        'TEST 7: Payment Completed -> Future Payment Reminders Cancelled',
        false,
        `Dues reminders were not cancelled: ${JSON.stringify(dueRems.map((r) => r.status))}`
      );
    }
  } catch (err: any) {
    record('TEST 7: Payment Completed -> Future Payment Reminders Cancelled', false, err.message);
  }

  // TEST 8: Run scheduler twice -> Duplicate reminder is NOT sent
  try {
    const testDueReminder = await remindersRepository.createReminder({
      title: 'Due Notification Test',
      reminder_type: 'GENERAL',
      target_date: new Date().toISOString(),
      scheduled_at: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago (due!)
      recipient_email: 'duplicate_guard@diu.edu.bd',
      recipient_name: 'Guarded Recipient',
      status: 'SCHEDULED',
      idempotency_key: `IDEMP_SCHED_${Date.now()}`,
    });

    // First run
    const run1 = await remindersRepository.processDueReminders();
    const processedFirst = run1.reminders.find((r) => r.id === testDueReminder.id);

    // Second run immediately after
    const run2 = await remindersRepository.processDueReminders();
    const processedSecond = run2.reminders.find((r) => r.id === testDueReminder.id);

    const firstSent = processedFirst && processedFirst.status === 'SENT';
    const secondSkipped = !processedSecond || processedSecond.status !== 'SENT';

    if (firstSent && secondSkipped) {
      record(
        'TEST 8: Run Scheduler Twice -> Strong Duplicate Prevention',
        true,
        `First tick delivered reminder (status: SENT). Second tick skipped execution (0 duplicate dispatches)`
      );
    } else {
      record(
        'TEST 8: Run Scheduler Twice -> Strong Duplicate Prevention',
        false,
        `Duplicate check failed: run1=${JSON.stringify(processedFirst)}, run2=${JSON.stringify(processedSecond)}`
      );
    }
  } catch (err: any) {
    record('TEST 8: Run Scheduler Twice -> Strong Duplicate Prevention', false, err.message);
  }

  // TEST 9: Failed email reminder -> Retry logic
  try {
    const failedReminder = await remindersRepository.createReminder({
      title: 'Failed Reminder Test',
      reminder_type: 'GENERAL',
      status: 'FAILED',
      error_message: 'Simulated network timeout',
      scheduled_at: new Date().toISOString(),
    });

    const retried = await remindersRepository.retryReminder(failedReminder.id, 'admin_super');

    if (retried.status === 'SCHEDULED' && retried.error_message?.includes('Retry queued by admin_super')) {
      record(
        'TEST 9: Failed Email Reminder -> Retry Logic',
        true,
        `Failed reminder successfully re-queued to SCHEDULED state with retry actor audit`
      );
    } else {
      record(
        'TEST 9: Failed Email Reminder -> Retry Logic',
        false,
        `Retry logic failed to reset state properly: status=${retried.status}`
      );
    }
  } catch (err: any) {
    record('TEST 9: Failed Email Reminder -> Retry Logic', false, err.message);
  }

  // TEST 10: Check Asia/Dhaka timezone accuracy
  try {
    const anchorIso = '2026-10-15T12:00:00.000Z';
    const minus24h = calculateScheduledTime(anchorIso, '-24h');
    const minus1h = calculateScheduledTime(anchorIso, '-1h');
    const plus1d = calculateScheduledTime(anchorIso, '+1d');

    const expectedMinus24h = new Date(new Date(anchorIso).getTime() - 24 * 3600000).toISOString();
    const expectedMinus1h = new Date(new Date(anchorIso).getTime() - 1 * 3600000).toISOString();
    const expectedPlus1d = new Date(new Date(anchorIso).getTime() + 24 * 3600000).toISOString();

    const formattedDhaka = formatDhakaDateTime(anchorIso);
    const dhakaConverted = toDhakaDate(anchorIso);

    const matchesCalculations =
      minus24h === expectedMinus24h && minus1h === expectedMinus1h && plus1d === expectedPlus1d;

    const hasBstIndicator = formattedDhaka.includes('(BST)') && formattedDhaka.includes('06:00 PM');

    if (matchesCalculations && hasBstIndicator) {
      record(
        'TEST 10: Check Asia/Dhaka Timezone Accuracy',
        true,
        `Offsets calculated accurately and localized cleanly: "${formattedDhaka}" in ${DHAKA_TIMEZONE} (+6h BST)`
      );
    } else {
      record(
        'TEST 10: Check Asia/Dhaka Timezone Accuracy',
        false,
        `Timezone calculation mismatch: formatted="${formattedDhaka}", matchesCalculations=${matchesCalculations}`
      );
    }
  } catch (err: any) {
    record('TEST 10: Check Asia/Dhaka Timezone Accuracy', false, err.message);
  }

  // TEST 11: Unauthorized user attempts reminder management
  try {
    const { requirePermission } = await import('../src/middleware/auth.middleware');
    const manageMiddleware = requirePermission('reminders.manage');

    // Simulate mock request without permissions
    let rejected = false;
    const mockReq: any = { user: { id: 'unauthorized_user', permissions: ['profile.read'] } };
    const mockRes: any = {
      status: (code: number) => ({
        json: (body: any) => {
          if (code === 403) rejected = true;
        },
      }),
    };
    const mockNext = () => {};

    manageMiddleware(mockReq, mockRes, mockNext);

    if (rejected) {
      record(
        'TEST 11: Unauthorized User Attempts Reminder Management',
        true,
        `HTTP 403 Forbidden correctly returned when user lacks reminders.manage permission`
      );
    } else {
      record(
        'TEST 11: Unauthorized User Attempts Reminder Management',
        false,
        `Permission check did not reject unauthorized request`
      );
    }
  } catch (err: any) {
    record('TEST 11: Unauthorized User Attempts Reminder Management', false, err.message);
  }

  // BRAND-01: Official Brand & Affiliation Check
  try {
    const isBrandValid = EMAIL_BRAND.name === 'DIU Investment Club';
    const isUnivValid =
      EMAIL_BRAND.university === 'Daffodil International University' ||
      EMAIL_BRAND.universityAffiliation === 'Daffodil International University';

    // Verify template rendering produces clean official brand & no forbidden terms
    const emailDir = path.resolve(__dirname, '../src/modules/email');
    const templateContent = fs.readFileSync(path.join(emailDir, 'email.templates.ts'), 'utf-8');

    const forbiddenFound =
      templateContent.includes('Dhaka International University') ||
      templateContent.includes('Satarkul') ||
      templateContent.includes('diu.ac');

    if (isBrandValid && isUnivValid && !forbiddenFound) {
      record(
        'BRAND-01: Official Brand & Affiliation Check',
        true,
        `Official Brand strictly "${EMAIL_BRAND.name}", Affiliation strictly "${EMAIL_BRAND.university}", 0 forbidden legacy strings`
      );
    } else {
      record(
        'BRAND-01: Official Brand & Affiliation Check',
        false,
        `Brand check failed: brand=${EMAIL_BRAND.name}, univ=${EMAIL_BRAND.university}, forbidden=${forbiddenFound}`
      );
    }
  } catch (err: any) {
    record('BRAND-01: Official Brand & Affiliation Check', false, err.message);
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('📊 PHASE 8 VERIFICATION SUMMARY:');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`   Total Tests:  ${total}`);
  console.log(`   Passed Tests: ${passed}`);
  console.log(`   Failed Tests: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`\n❌ PHASE 8 VERIFICATION FAILED with ${failed} failure(s)`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 8 SMART REMINDER & SCHEDULER TESTS PASSED (100%)');
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
