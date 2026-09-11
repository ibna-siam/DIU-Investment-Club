/**
 * DIU Investment Club - Domain Notification Resolver & RBAC Target Engine
 *
 * Implements:
 * - Intelligent recipient resolution based on Role, Permission, Assignment, Event/Meeting participation, Ownership
 * - Event/Resource idempotency to prevent duplicate notifications
 * - In-app notification delivery linked to action URLs
 */

import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';
import { notificationsRepository } from './notifications.repository';
import {
  TaskAssignedEvent,
  ExpenseSubmittedEvent,
  ExpenseApprovedEvent,
  ExpenseRejectedEvent,
  MeetingScheduledEvent,
  EventCreatedEvent,
  PaymentConfirmedEvent,
  MemberCreatedEvent,
} from '../email/email.events';

export class DomainNotificationResolver {
  /**
   * Helper: Resolve User IDs matching specific role names
   */
  async resolveUserIdsByRoles(roleNames: string[]): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const lowerRoles = roleNames.map((r) => r.toLowerCase().replace(/_/g, ' '));
      const { data, error } = await getDbAdmin()
        .from('roles')
        .select('id, name')
        .or(lowerRoles.map((r) => `name.ilike.%${r}%`).join(','));

      if (error || !data || data.length === 0) {
        // Fallback to Super Admins if no specific role found
        return this.resolveSuperAdminUserIds();
      }

      const roleIds = data.map((r: any) => r.id);
      const { data: userRoles, error: urErr } = await getDbAdmin()
        .from('user_roles')
        .select('user_id')
        .in('role_id', roleIds);

      if (urErr || !userRoles || userRoles.length === 0) {
        // Fallback to Super Admin users
        return this.resolveSuperAdminUserIds();
      }

      const userIds = Array.from(new Set(userRoles.map((ur: any) => ur.user_id)));
      if (userIds.length === 0) {
        return this.resolveSuperAdminUserIds();
      }
      return userIds;
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] resolveUserIdsByRoles failed:', (err as any)?.message);
      return [];
    }
  }

  /**
   * Helper: Resolve Super Admin User IDs
   */
  async resolveSuperAdminUserIds(): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data: roles } = await getDbAdmin()
        .from('roles')
        .select('id')
        .ilike('name', '%super%admin%');

      if (!roles || roles.length === 0) return [];
      const roleIds = roles.map((r: any) => r.id);

      const { data: userRoles } = await getDbAdmin()
        .from('user_roles')
        .select('user_id')
        .in('role_id', roleIds);

      return userRoles ? Array.from(new Set(userRoles.map((ur: any) => ur.user_id))) : [];
    } catch {
      return [];
    }
  }

  /**
   * Helper: Resolve User ID by Email address
   */
  async resolveUserIdByEmail(email: string): Promise<string | null> {
    if (!isSupabaseConfigured() || !email) return null;
    try {
      const { data, error } = await getDbAdmin()
        .from('profiles')
        .select('id')
        .ilike('email', email.trim())
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }
    } catch {}
    return null;
  }

  /**
   * Helper: Resolve User IDs for Meeting or Event Participants
   */
  async resolveUserIdsByEmails(emails: string[]): Promise<string[]> {
    if (!isSupabaseConfigured() || !emails || emails.length === 0) return [];
    try {
      const cleaned = emails.map((e) => e.trim().toLowerCase());
      const { data, error } = await getDbAdmin()
        .from('profiles')
        .select('id, email')
        .in('email', cleaned);

      if (!error && data) {
        return data.map((d: any) => d.id);
      }
    } catch {}
    return [];
  }

  /**
   * Check if in-app notification rule is enabled
   */
  async isNotificationRuleEnabled(ruleKey: string): Promise<boolean> {
    const rules = await notificationsRepository.getNotificationRules();
    const rule = rules.find((r) => r.rule_key === ruleKey);
    if (!rule) return true; // Default true if not explicitly configured
    if (!rule.enabled) return false;
    const channels = Array.isArray(rule.delivery_channels) ? rule.delivery_channels : [];
    return channels.includes('IN_APP') || channels.length === 0;
  }

  // =========================================================================
  // DOMAIN EVENT HANDLERS
  // =========================================================================

  /**
   * TASK_ASSIGNED: Notify assigned user ONLY. Never notify the whole club.
   */
  async handleTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    try {
      const enabled = await this.isNotificationRuleEnabled('notif_task_assigned');
      if (!enabled) return;

      const recipientId = event.assigneeId || (await this.resolveUserIdByEmail(event.assigneeEmail));
      if (!recipientId) return;

      await notificationsRepository.dispatchNotification({
        user_id: recipientId,
        title: `Task Assigned: ${event.title}`,
        message: `You have been assigned to task "${event.title}". Priority: ${event.priority || 'NORMAL'}${event.dueDate ? ` • Due: ${event.dueDate}` : ''}`,
        category: 'TASK',
        priority: (event.priority as any) || 'NORMAL',
        type: 'TASK',
        actionUrl: `/tasks`,
        related_entity_type: 'task',
        related_entity_id: event.taskId,
        idempotency_key: `TASK_ASSIGNED:${event.taskId}:${recipientId}`,
        deduplicateHours: 24,
      });
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleTaskAssigned failed:', (err as any)?.message);
    }
  }

  /**
   * EXPENSE_SUBMITTED: Notify responsible financial approvers (Treasurer & President).
   */
  async handleExpenseSubmitted(event: ExpenseSubmittedEvent): Promise<void> {
    try {
      const enabled = await this.isNotificationRuleEnabled('notif_expense_submitted');
      if (!enabled) return;

      const approverIds = await this.resolveUserIdsByRoles(['Treasurer', 'President']);
      for (const approverId of approverIds) {
        if (approverId === event.submitterId) continue; // Do not notify submitter that they submitted
        await notificationsRepository.dispatchNotification({
          user_id: approverId,
          title: `Expense Approval Required: ${event.title}`,
          message: `Expense of ৳${event.amount.toLocaleString()} submitted by ${event.submitterName} requires your review and approval.`,
          category: 'APPROVAL',
          priority: 'HIGH',
          type: 'APPROVAL',
          actionUrl: `/approvals`,
          related_entity_type: 'expense',
          related_entity_id: event.expenseId,
          idempotency_key: `EXPENSE_SUBMITTED:${event.expenseId}:${approverId}`,
          deduplicateHours: 24,
        });
      }
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleExpenseSubmitted failed:', (err as any)?.message);
    }
  }

  /**
   * EXPENSE_APPROVED: Notify claimant / expense creator.
   */
  async handleExpenseApproved(event: ExpenseApprovedEvent): Promise<void> {
    try {
      const enabled = await this.isNotificationRuleEnabled('notif_expense_approved');
      if (!enabled) return;

      const recipientId = await this.resolveUserIdByEmail(event.recipientEmail);
      if (!recipientId) return;

      await notificationsRepository.dispatchNotification({
        user_id: recipientId,
        title: `Expense Approved: ${event.title}`,
        message: `Your expense #${event.expenseNumber || ''} (৳${event.amount.toLocaleString()}) has been officially approved by ${event.approverName}.`,
        category: 'FINANCIAL',
        priority: 'NORMAL',
        type: 'FINANCIAL',
        actionUrl: `/expenses`,
        related_entity_type: 'expense',
        related_entity_id: event.expenseId,
        idempotency_key: `EXPENSE_APPROVED:${event.expenseId}:${recipientId}`,
        deduplicateHours: 48,
      });
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleExpenseApproved failed:', (err as any)?.message);
    }
  }

  /**
   * EXPENSE_REJECTED: Notify claimant / expense creator with reason.
   */
  async handleExpenseRejected(event: ExpenseRejectedEvent): Promise<void> {
    try {
      const enabled = await this.isNotificationRuleEnabled('notif_expense_rejected');
      if (!enabled) return;

      const recipientId = await this.resolveUserIdByEmail(event.recipientEmail);
      if (!recipientId) return;

      await notificationsRepository.dispatchNotification({
        user_id: recipientId,
        title: `Expense Rejected: ${event.title}`,
        message: `Your expense #${event.expenseNumber || ''} (৳${event.amount.toLocaleString()}) was rejected by ${event.approverName}. Reason: ${event.reason || 'Not specified'}`,
        category: 'FINANCIAL',
        priority: 'HIGH',
        type: 'FINANCIAL',
        actionUrl: `/expenses`,
        related_entity_type: 'expense',
        related_entity_id: event.expenseId,
        idempotency_key: `EXPENSE_REJECTED:${event.expenseId}:${recipientId}`,
        deduplicateHours: 48,
      });
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleExpenseRejected failed:', (err as any)?.message);
    }
  }

  /**
   * MEETING_SCHEDULED: Immediately notify invited participants ONLY.
   */
  async handleMeetingScheduled(event: MeetingScheduledEvent): Promise<void> {
    try {
      const enabled = await this.isNotificationRuleEnabled('notif_meeting_scheduled');
      if (!enabled) return;

      const participantIds = await this.resolveUserIdsByEmails(event.participantEmails || []);
      for (const participantId of participantIds) {
        await notificationsRepository.dispatchNotification({
          user_id: participantId,
          title: `Meeting Scheduled: ${event.title}`,
          message: `You are invited to a club meeting on ${event.meetingDate} at ${event.startTime}.${event.location ? ` Location: ${event.location}` : ''}`,
          category: 'MEETING',
          priority: 'NORMAL',
          type: 'MEETING',
          actionUrl: `/meetings`,
          related_entity_type: 'meeting',
          related_entity_id: event.meetingId,
          idempotency_key: `MEETING_SCHEDULED:${event.meetingId}:${participantId}`,
          deduplicateHours: 24,
        });
      }
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleMeetingScheduled failed:', (err as any)?.message);
    }
  }

  /**
   * EVENT_CREATED: Target audience resolution.
   */
  async handleEventCreated(event: EventCreatedEvent): Promise<void> {
    try {
      const enabled = await this.isNotificationRuleEnabled('notif_event_created');
      if (!enabled) return;

      // Strictly suppress notifications if audience is NONE or not enabled
      if (!event.targetAudience || event.targetAudience === 'NONE') {
        return;
      }

      let targetUserIds: string[] = [];

      if (event.targetAudience === 'EXECUTIVE') {
        targetUserIds = await this.resolveUserIdsByRoles([
          'President',
          'General Secretary',
          'Treasurer',
          'Executive Member',
          'Event Manager',
        ]);
      } else if (event.targetAudience === 'ROLES' && (event as any).targetRoles && (event as any).targetRoles.length > 0) {
        targetUserIds = await this.resolveUserIdsByRoles((event as any).targetRoles);
      } else if ((event.targetAudience === 'CUSTOM' || event.targetAudience === 'MEMBERS') && event.targetEmails && event.targetEmails.length > 0) {
        targetUserIds = await this.resolveUserIdsByEmails(event.targetEmails);
      } else if (event.targetAudience === 'ALL_ACTIVE_MEMBERS' || event.targetAudience === 'ALL') {
        // Only if explicitly requested to notify ALL active members
        if (isSupabaseConfigured()) {
          const { data } = await getDbAdmin()
            .from('profiles')
            .select('id')
            .eq('status', 'active')
            .limit(200);
          if (data) targetUserIds = data.map((d: any) => d.id);
        }
      }

      for (const userId of targetUserIds) {
        await notificationsRepository.dispatchNotification({
          user_id: userId,
          title: `Upcoming Event: ${event.title}`,
          message: `Join us for "${event.title}" on ${event.startDate}.${event.location ? ` Location: ${event.location}` : ''}`,
          category: 'EVENT',
          priority: 'NORMAL',
          type: 'EVENT',
          actionUrl: `/events`,
          related_entity_type: 'event',
          related_entity_id: event.eventId,
          idempotency_key: `EVENT_CREATED:${event.eventId}:${userId}`,
          deduplicateHours: 48,
        });
      }
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleEventCreated failed:', (err as any)?.message);
    }
  }

  /**
   * PAYMENT_CONFIRMED: Notify paying member with digital receipt link.
   */
  async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    try {
      const enabled = await this.isNotificationRuleEnabled('notif_payment_confirmed');
      if (!enabled) return;

      const recipientId = await this.resolveUserIdByEmail(event.memberEmail);
      if (!recipientId) return;

      const receiptUrl = event.receiptToken ? `/receipt/${event.receiptToken}` : `/member-payments`;

      await notificationsRepository.dispatchNotification({
        user_id: recipientId,
        title: `Payment Verified & Digital Receipt Ready`,
        message: `Your payment of ৳${event.amount.toLocaleString()} has been verified. Official receipt #${event.paymentNumber || ''} is available.`,
        category: 'FINANCIAL',
        priority: 'NORMAL',
        type: 'FINANCIAL',
        actionUrl: receiptUrl,
        related_entity_type: 'payment',
        related_entity_id: event.paymentId,
        idempotency_key: `PAYMENT_CONFIRMED:${event.paymentId}:${recipientId}`,
        deduplicateHours: 72,
      });
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handlePaymentConfirmed failed:', (err as any)?.message);
    }
  }

  /**
   * MEMBER_CREATED: Notify new member with welcome message.
   */
  async handleMemberCreated(event: MemberCreatedEvent): Promise<void> {
    try {
      const recipientId = await this.resolveUserIdByEmail(event.email);
      if (!recipientId) return;

      await notificationsRepository.dispatchNotification({
        user_id: recipientId,
        title: `Welcome to DIU Investment Club!`,
        message: `Hello ${event.fullName}, your club membership #${event.memberCode} has been registered successfully.`,
        category: 'GENERAL',
        priority: 'NORMAL',
        type: 'MEMBERSHIP',
        actionUrl: `/dashboard`,
        related_entity_type: 'member',
        related_entity_id: event.memberId,
        idempotency_key: `MEMBER_CREATED:${event.memberId}:${recipientId}`,
        deduplicateHours: 168,
      });
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleMemberCreated failed:', (err as any)?.message);
    }
  }

  /**
   * SECURITY_ALERT: Notify Super Admins & affected user.
   */
  async handleSecurityAlert(alert: {
    title: string;
    message: string;
    affectedUserId?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const superAdminIds = await this.resolveSuperAdminUserIds();
      const targetIds = new Set<string>(superAdminIds);
      if (alert.affectedUserId) targetIds.add(alert.affectedUserId);

      const timestamp = Math.floor(Date.now() / 300000); // 5-minute window dedup
      for (const userId of targetIds) {
        await notificationsRepository.dispatchNotification({
          user_id: userId,
          title: `Security Alert: ${alert.title}`,
          message: alert.message,
          category: 'SECURITY',
          priority: 'URGENT',
          type: 'SECURITY',
          actionUrl: `/settings`,
          idempotency_key: `SECURITY_ALERT:${timestamp}:${userId}`,
          deduplicateHours: 1,
        });
      }
    } catch (err) {
      console.warn('⚠️ [DomainNotificationResolver] handleSecurityAlert failed:', (err as any)?.message);
    }
  }
}

export const domainNotificationResolver = new DomainNotificationResolver();
