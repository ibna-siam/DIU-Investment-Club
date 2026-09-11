/**
 * DIU Investment Club - Notification Events Bridge
 *
 * Implements Section 9 & 10: Unified Domain Event Flow.
 * Listens to domain events on emailEventBus and triggers targeted in-app notifications
 * via domainNotificationResolver while preventing duplicate dispatches.
 */

import { emailEventBus } from '../email/email.events';
import { domainNotificationResolver } from './domain-notification.resolver';

class NotificationEventsBridge {
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('📡 [NotificationEventsBridge] Binding domain events to in-app notification engine...');

    emailEventBus.on('TASK_ASSIGNED', (data) => {
      domainNotificationResolver.handleTaskAssigned(data).catch((err) =>
        console.warn('[NotificationEventsBridge] TASK_ASSIGNED error:', err?.message)
      );
    });

    emailEventBus.on('EXPENSE_SUBMITTED', (data) => {
      domainNotificationResolver.handleExpenseSubmitted(data).catch((err) =>
        console.warn('[NotificationEventsBridge] EXPENSE_SUBMITTED error:', err?.message)
      );
    });

    emailEventBus.on('EXPENSE_APPROVED', (data) => {
      domainNotificationResolver.handleExpenseApproved(data).catch((err) =>
        console.warn('[NotificationEventsBridge] EXPENSE_APPROVED error:', err?.message)
      );
    });

    emailEventBus.on('EXPENSE_REJECTED', (data) => {
      domainNotificationResolver.handleExpenseRejected(data).catch((err) =>
        console.warn('[NotificationEventsBridge] EXPENSE_REJECTED error:', err?.message)
      );
    });

    emailEventBus.on('MEETING_SCHEDULED', (data) => {
      domainNotificationResolver.handleMeetingScheduled(data).catch((err) =>
        console.warn('[NotificationEventsBridge] MEETING_SCHEDULED error:', err?.message)
      );
    });

    emailEventBus.on('EVENT_CREATED', (data) => {
      domainNotificationResolver.handleEventCreated(data).catch((err) =>
        console.warn('[NotificationEventsBridge] EVENT_CREATED error:', err?.message)
      );
    });

    emailEventBus.on('PAYMENT_CONFIRMED', (data) => {
      domainNotificationResolver.handlePaymentConfirmed(data).catch((err) =>
        console.warn('[NotificationEventsBridge] PAYMENT_CONFIRMED error:', err?.message)
      );
    });

    emailEventBus.on('MEMBER_CREATED', (data) => {
      domainNotificationResolver.handleMemberCreated(data).catch((err) =>
        console.warn('[NotificationEventsBridge] MEMBER_CREATED error:', err?.message)
      );
    });

    emailEventBus.on('SECURITY_ALERT' as any, (data: any) => {
      domainNotificationResolver.handleSecurityAlert(data).catch((err) =>
        console.warn('[NotificationEventsBridge] SECURITY_ALERT error:', err?.message)
      );
    });

    console.log('✅ [NotificationEventsBridge] Domain notification listeners active.');
  }
}

export const notificationEventsBridge = new NotificationEventsBridge();
