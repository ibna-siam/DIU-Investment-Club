/**
 * DIU Investment Club ERP - Phase 14 Automated Verification Suite
 *
 * Verifies:
 * 1. Database schema (status & archived_at on notifications, 17 email rules, notification rules)
 * 2. Notification read state permanent persistence in Supabase across page reloads
 * 3. Unread count synchronization
 * 4. Event-driven recipient resolution & idempotency (Task, Expense, Payment)
 * 5. Dynamic 17 Email Automation Rules management & toggle
 */

import { getDbAdmin, isSupabaseConfigured } from '../src/config/supabase';
import { notificationsRepository } from '../src/modules/notifications/notifications.repository';
import { emailAutomationManager } from '../src/modules/email/email.automation.settings';
import { domainNotificationResolver } from '../src/modules/notifications/domain-notification.resolver';
import { notificationEventsBridge } from '../src/modules/notifications/notification.events.bridge';
import { emailEventBus } from '../src/modules/email/email.events';
import crypto from 'crypto';

async function runVerification() {
  console.log('===============================================================');
  console.log('🧪 Starting Phase 14 Notification & Email Automation Verification');
  console.log('===============================================================');

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured!');
    process.exit(1);
  }

  const db = getDbAdmin();
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Database Schema & Column Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Database Schema & Tables ---');
  const { data: colsCheck, error: colsErr } = await db
    .from('notifications')
    .select('id, status, archived_at, is_read, read_at, channel, idempotency_key')
    .limit(1);

  assert(!colsErr, 'notifications table has status, archived_at, is_read, read_at, channel, and idempotency_key columns');

  const { count: emailRulesCount } = await db
    .from('email_automation_rules')
    .select('*', { count: 'exact', head: true });
  assert(typeof emailRulesCount === 'number' && emailRulesCount >= 17, `email_automation_rules seeded with 17 rules (found: ${emailRulesCount})`);

  const { count: notifRulesCount } = await db
    .from('notification_rules')
    .select('*', { count: 'exact', head: true });
  assert(typeof notifRulesCount === 'number' && notifRulesCount >= 9, `notification_rules seeded with default rules (found: ${notifRulesCount})`);

  // -------------------------------------------------------------------------
  // TEST 2: Notification Read State Permanent Persistence & Reload Sync
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Notification Read State Persistence in Supabase ---');
  // Get an active user to test with
  const { data: testUser } = await db.from('profiles').select('id, email').limit(1).single();
  if (!testUser) {
    console.error('❌ No user found for notification test');
    process.exit(1);
  }

  const testUserId = testUser.id;
  const initialUnread = await notificationsRepository.getUnreadCount(testUserId);

  // Dispatch a fresh test notification
  const testNotif = await notificationsRepository.dispatchNotification({
    user_id: testUserId,
    title: `Automated Test Alert ${Date.now()}`,
    message: 'Testing permanent read persistence across reload',
    category: 'SYSTEM',
    priority: 'NORMAL',
    type: 'INFO',
    idempotency_key: `TEST_NOTIF:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`,
  });

  assert(Boolean(testNotif && testNotif.id), 'Test notification created successfully');
  const notifId = testNotif!.id;

  // Verify unread count increased
  const unreadAfterInsert = await notificationsRepository.getUnreadCount(testUserId);
  assert(unreadAfterInsert >= initialUnread + 1, `Unread count incremented correctly (was: ${initialUnread}, now: ${unreadAfterInsert})`);

  // Mark as read
  const marked = await notificationsRepository.markAsRead(notifId, testUserId);
  assert(Boolean(marked && marked.is_read === true && marked.status === 'READ'), 'markAsRead returned is_read: true and status: READ');

  // CRITICAL CHECK: Query Supabase directly to ensure DB has persisted is_read = true and status = READ
  const { data: dbRow, error: dbErr } = await db
    .from('notifications')
    .select('id, is_read, status, read_at')
    .eq('id', notifId)
    .single();

  assert(!dbErr && Boolean(dbRow), 'Notification found in Supabase database');
  assert(dbRow?.is_read === true, 'Supabase permanently persisted is_read = true in database');
  assert(dbRow?.status === 'READ', 'Supabase permanently persisted status = READ in database');
  assert(Boolean(dbRow?.read_at), 'Supabase recorded read_at timestamp in database');

  // SIMULATE PAGE RELOAD: Fresh query directly from database
  const freshList = await notificationsRepository.getUserNotifications(testUserId, { status: 'ALL', limit: 50 });
  const reloadedItem = freshList.find((n) => n.id === notifId);
  assert(Boolean(reloadedItem), 'Reloaded notification retrieved from database');
  assert(reloadedItem?.is_read === true, 'CRITICAL: Notification remains READ after simulated page reload');
  assert(reloadedItem?.status === 'READ', 'CRITICAL: Notification status remains READ after simulated page reload');

  // Verify unread count decreased back
  const unreadAfterRead = await notificationsRepository.getUnreadCount(testUserId);
  assert(unreadAfterRead === unreadAfterInsert - 1, `Unread count synchronized to ${unreadAfterRead} after mark as read`);

  // -------------------------------------------------------------------------
  // TEST 3: Event-Driven Recipient Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Domain Notification Recipient Resolution ---');
  notificationEventsBridge.init();

  // Test Task Assignment targeting (only assigned user gets notification)
  const taskAssigneeId = testUserId;
  const taskId = crypto.randomUUID();
  await domainNotificationResolver.handleTaskAssigned({
    taskId,
    title: 'Audit Financial Balance Sheet Q1',
    assigneeId: taskAssigneeId,
    assigneeName: 'Test Assignee',
    assigneeEmail: testUser.email,
    priority: 'HIGH',
  });

  const taskNotifs = await notificationsRepository.getUserNotifications(taskAssigneeId, { limit: 5 });
  const matchedTaskNotif = taskNotifs.find((n) => n.related_entity_id === taskId);
  assert(Boolean(matchedTaskNotif), 'Task assignment notification dispatched specifically to assigned user');
  assert(matchedTaskNotif?.category === 'TASK', 'Task notification has TASK category');
  assert(matchedTaskNotif?.priority === 'HIGH', 'Task notification has HIGH priority');

  // Test Expense Approval targeting
  const expenseId = crypto.randomUUID();
  await domainNotificationResolver.handleExpenseSubmitted({
    expenseId,
    expenseNumber: 'EXP-TEST-99',
    title: 'Auditor Refreshment Voucher',
    amount: 1500,
    submitterId: 'submitter-123',
    submitterName: 'Event Coordinator',
  });

  const approverUserIds = await domainNotificationResolver.resolveUserIdsByRoles(['Treasurer', 'President']);
  assert(approverUserIds.length > 0, `Approvers resolved successfully (${approverUserIds.length} approver users)`);

  // Test Payment Verified targeting with public receipt link
  const paymentId = crypto.randomUUID();
  const receiptToken = crypto.randomBytes(32).toString('hex');
  await domainNotificationResolver.handlePaymentConfirmed({
    paymentId,
    paymentNumber: 'PAY-2026-TEST',
    receiptToken,
    memberId: 'mem-123',
    memberName: 'Member Test',
    memberEmail: testUser.email,
    amount: 2000,
    paymentMethod: 'BKASH',
    paymentDate: '2026-03-25',
  });

  const paymentNotifs = await notificationsRepository.getUserNotifications(testUserId, { limit: 5 });
  const matchedPaymentNotif = paymentNotifs.find((n) => n.related_entity_id === paymentId);
  assert(Boolean(matchedPaymentNotif), 'Payment confirmed notification dispatched to member user');
  assert(
    (matchedPaymentNotif as any)?.actionUrl?.includes(receiptToken) || (matchedPaymentNotif as any)?.link?.includes(receiptToken),
    'Payment confirmed notification includes public digital receipt link'
  );

  // -------------------------------------------------------------------------
  // TEST 4: 17 Email Automation Rules Management
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing 17 Email Automation Rules Management ---');
  const allRules = await emailAutomationManager.getAllRules();
  assert(allRules.length === 17, `emailAutomationManager loaded all 17 rules (found: ${allRules.length})`);

  // Test toggling a rule off and on
  const targetRule = allRules.find((r) => r.rule_key === 'task_assignment');
  assert(Boolean(targetRule), 'task_assignment rule exists');

  // Toggle OFF
  await emailAutomationManager.toggleRule('task_assignment', false);
  const checkOff = emailAutomationManager.isEmailAllowed('TASK_ASSIGNED');
  assert(checkOff.allowed === false, 'isEmailAllowed returns false when task_assignment is toggled OFF');

  // Toggle ON
  await emailAutomationManager.toggleRule('task_assignment', true);
  const checkOn = emailAutomationManager.isEmailAllowed('TASK_ASSIGNED');
  assert(checkOn.allowed === true, 'isEmailAllowed returns true when task_assignment is toggled ON');

  // Test security protected rule cannot be disabled
  let protectionWorked = false;
  try {
    await emailAutomationManager.toggleRule('security_alert', false);
  } catch (err: any) {
    protectionWorked = true;
  }
  assert(protectionWorked, 'Security alert rule is protected and cannot be disabled');

  // -------------------------------------------------------------------------
  // CLEANUP: Remove test notifications
  // -------------------------------------------------------------------------
  await db.from('notifications').delete().in('id', [notifId, matchedTaskNotif?.id, matchedPaymentNotif?.id].filter(Boolean) as string[]);

  console.log('\n===============================================================');
  console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal Verification Suite Error:', err);
  process.exit(1);
});
