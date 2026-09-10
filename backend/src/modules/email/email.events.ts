/**
 * DIU Investment Club - Centralized Domain Event Bus for Emails
 *
 * Implements Section 1: Central Event-Driven Architecture.
 * Business Action -> Domain Event -> Notification/Event Handler -> Email Service
 *
 * All events are emitted strictly AFTER database operations succeed.
 */

import { EventEmitter } from 'events';

export interface UserCreatedEvent {
  userId: string;
  email: string;
  fullName: string;
  loginUrl?: string;
  createdBy?: string;
}

export interface PaymentConfirmedEvent {
  paymentId: string;
  paymentNumber: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  receiptToken?: string;
  verifiedBy?: string;
}

export interface ExpenseSubmittedEvent {
  expenseId: string;
  expenseNumber: string;
  title: string;
  amount: number;
  categoryName?: string;
  submitterId: string;
  submitterName: string;
  submitterEmail?: string;
  approverEmails?: string[];
}

export interface ExpenseApprovedEvent {
  expenseId: string;
  expenseNumber: string;
  title: string;
  amount: number;
  recipientEmail: string;
  recipientName: string;
  approverId: string;
  approverName: string;
  notes?: string;
  approvalDate?: string;
}

export interface ExpenseRejectedEvent {
  expenseId: string;
  expenseNumber: string;
  title: string;
  amount: number;
  recipientEmail: string;
  recipientName: string;
  approverId: string;
  approverName: string;
  reason: string;
}

export interface EventCreatedEvent {
  eventId: string;
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
  summary?: string;
  bannerUrl?: string;
  targetAudience?: 'ALL' | 'EXECUTIVE' | 'TIER' | 'CUSTOM';
  targetEmails?: string[];
  createdBy?: string;
}

export interface MeetingScheduledEvent {
  meetingId: string;
  title: string;
  meetingDate: string;
  startTime: string;
  endTime?: string;
  location?: string;
  meetingLink?: string;
  agendaSummary?: string;
  participantEmails: string[];
  createdBy?: string;
}

export interface TaskAssignedEvent {
  taskId: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assignedByName?: string;
  dueDate?: string;
  priority?: string;
  description?: string;
}

export interface ReminderTriggeredEvent {
  reminderId: string;
  reminderType: string;
  title: string;
  message: string;
  recipientId: string;
  recipientEmail: string;
  recipientName?: string;
  actionUrl?: string;
}

export interface UserInvitedEvent {
  userId: string;
  email: string;
  fullName: string;
  setupUrl: string;
  roleName?: string;
  invitedBy?: string;
  expiresInHours?: number;
}

export interface EmailVerificationRequestedEvent {
  userId: string;
  email: string;
  fullName: string;
  verificationUrl: string;
  expiresInMinutes?: number;
}

export interface PasswordResetRequestedEvent {
  email: string;
  fullName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export interface PasswordChangedEvent {
  userId: string;
  email: string;
  fullName: string;
  changedAt?: string;
  ipAddress?: string;
}

export interface UserRoleChangedEvent {
  userId: string;
  email: string;
  fullName: string;
  newRoleName: string;
  changedBy?: string;
}

export interface AccountStatusChangedEvent {
  userId: string;
  email: string;
  fullName: string;
  status: 'active' | 'suspended' | 'inactive';
  reason?: string;
  changedBy?: string;
}

export interface EventCancelledEvent {
  eventId: string;
  title: string;
  reason?: string;
  cancelledBy?: string;
}

export interface MeetingCancelledEvent {
  meetingId: string;
  title: string;
  reason?: string;
  cancelledBy?: string;
}

export interface TaskCompletedEvent {
  taskId: string;
  title: string;
  completedBy?: string;
}

export interface MemberDuePaidEvent {
  dueId: string;
  memberId: string;
  amount: number;
}

export interface MemberCreatedEvent {
  memberId: string;
  memberCode: string;
  fullName: string;
  email: string;
  studentId: string;
  department?: string | null;
  batch?: string | null;
  loginUrl?: string | null;
  createdBy?: string | null;
}

export type EmailDomainEvent =
  | { type: 'MEMBER_CREATED'; payload: MemberCreatedEvent }
  | { type: 'USER_CREATED'; payload: UserCreatedEvent }
  | { type: 'USER_INVITED'; payload: UserInvitedEvent }
  | { type: 'EMAIL_VERIFICATION_REQUESTED'; payload: EmailVerificationRequestedEvent }
  | { type: 'PASSWORD_RESET_REQUESTED'; payload: PasswordResetRequestedEvent }
  | { type: 'PASSWORD_CHANGED'; payload: PasswordChangedEvent }
  | { type: 'USER_ROLE_CHANGED'; payload: UserRoleChangedEvent }
  | { type: 'ACCOUNT_STATUS_CHANGED'; payload: AccountStatusChangedEvent }
  | { type: 'PAYMENT_CONFIRMED'; payload: PaymentConfirmedEvent }
  | { type: 'EXPENSE_SUBMITTED'; payload: ExpenseSubmittedEvent }
  | { type: 'EXPENSE_APPROVED'; payload: ExpenseApprovedEvent }
  | { type: 'EXPENSE_REJECTED'; payload: ExpenseRejectedEvent }
  | { type: 'EVENT_CREATED'; payload: EventCreatedEvent }
  | { type: 'EVENT_CANCELLED'; payload: EventCancelledEvent }
  | { type: 'MEETING_SCHEDULED'; payload: MeetingScheduledEvent }
  | { type: 'MEETING_CANCELLED'; payload: MeetingCancelledEvent }
  | { type: 'TASK_ASSIGNED'; payload: TaskAssignedEvent }
  | { type: 'TASK_COMPLETED'; payload: TaskCompletedEvent }
  | { type: 'MEMBER_DUE_PAID'; payload: MemberDuePaidEvent }
  | { type: 'REMINDER_TRIGGERED'; payload: ReminderTriggeredEvent };

export class EmailEventBus extends EventEmitter {
  emitEvent(event: EmailDomainEvent): boolean {
    console.log(`⚡ [EmailEventBus] Emitting event: ${event.type}`);
    return this.emit(event.type, event.payload);
  }
}

export const emailEventBus = new EmailEventBus();
