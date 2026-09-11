/**
 * DIU Investment Club - Centralized Asynchronous Email Queue & Retry Processor
 *
 * Implements:
 * - Section 11: Email Queue / Background Processing (Non-blocking)
 * - Section 12: Email Delivery Logging
 * - Section 13: Retry System (Up to 3 attempts with exponential backoff)
 * - Section 14: Duplicate Email Prevention (Idempotency Protection)
 * - Section 15: Email Preferences Check
 */

import {
  emailEventBus,
  UserCreatedEvent,
  UserInvitedEvent,
  MemberCreatedEvent,
  EmailVerificationRequestedEvent,
  PasswordResetRequestedEvent,
  PasswordChangedEvent,
  UserRoleChangedEvent,
  AccountStatusChangedEvent,
  PaymentConfirmedEvent,
  ExpenseSubmittedEvent,
  ExpenseApprovedEvent,
  ExpenseRejectedEvent,
  EventCreatedEvent,
  MeetingScheduledEvent,
  TaskAssignedEvent,
  ReminderTriggeredEvent,
} from './email.events';
import {
  renderMemberWelcomeEmail,
  renderUserWelcomeEmail,
  renderWelcomeEmail,
  renderAccountInvitationEmail,
  renderEmailVerificationEmail,
  renderPasswordResetEmail,
  renderPasswordChangedEmail,
  renderRoleChangedEmail,
  renderAccountStatusEmail,
  renderPaymentConfirmationEmail,
  renderExpenseSubmittedEmail,
  renderExpenseApprovedEmail,
  renderExpenseRejectedEmail,
  renderEventNotificationEmail,
  renderMeetingInvitationEmail,
  renderTaskAssignedEmail,
  renderReminderEmail,
} from './email.templates';
import { emailRepository } from './email.repository';
import { emailPreferencesManager, EmailCategory } from './email.preferences';
import { isValidEmail } from './email.security';
import { emailAutomationManager } from './email.automation.settings';
import { EMAIL_BRAND } from './email.brand';
import { emailProvider } from './email.provider';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@diu.edu.bd';

export type ClassifiedErrorType = 'TEMPORARY' | 'PERMANENT' | 'RATE_LIMIT' | 'INVALID_RECIPIENT' | 'UNKNOWN';

export interface ClassifiedError {
  type: ClassifiedErrorType;
  isRetryable: boolean;
  reason: string;
}

export function classifyEmailError(err: any): ClassifiedError {
  const message = (err?.message || (typeof err === 'string' ? err : '')).toLowerCase();
  const statusCode = err?.statusCode || err?.status || err?.raw?.statusCode || err?.response?.status || 0;

  // Invalid recipient
  if (
    message.includes('invalid email') ||
    message.includes('invalid recipient') ||
    message.includes('recipient is invalid') ||
    message.includes('syntax error') ||
    message.includes('address format')
  ) {
    return {
      type: 'INVALID_RECIPIENT',
      isRetryable: false,
      reason: 'Recipient email format is invalid or unroutable',
    };
  }

  // Rate limit
  if (
    statusCode === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('quota')
  ) {
    return {
      type: 'RATE_LIMIT',
      isRetryable: true,
      reason: 'Upstream rate limit reached. Eligible for backoff retry.',
    };
  }

  // Permanent client errors (unverified domain, 403, 400, etc.)
  if (
    statusCode === 400 ||
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode === 422 ||
    message.includes('blacklisted') ||
    message.includes('domain not found') ||
    message.includes('not verified') ||
    message.includes('unverified') ||
    message.includes('verify a domain') ||
    message.includes('only send testing emails')
  ) {
    return {
      type: 'PERMANENT',
      isRetryable: false,
      reason: 'Permanent rejection by upstream provider. Will not retry.',
    };
  }

  // Temporary network / server errors
  if (
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    message.includes('503') ||
    message.includes('outage') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('service unavailable')
  ) {
    return {
      type: 'TEMPORARY',
      isRetryable: true,
      reason: 'Temporary network or service outage. Eligible for retry.',
    };
  }

  return {
    type: 'UNKNOWN',
    isRetryable: true,
    reason: 'Unclassified error condition. Attempting retry within limit.',
  };
}

export interface EmailJob {
  id: string;
  idempotencyKey: string;
  emailType: string;
  category: EmailCategory;
  recipient: string;
  subject: string;
  html: string;
  text?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  triggerSource?: string;
  sentByUserId?: string;
  maxRetries?: number;
  userId?: string;
}

export class EmailQueue {
  private queue: EmailJob[] = [];
  private isProcessing = false;
  private readonly defaultMaxRetries = 3;

  constructor() {
    this.registerEventListeners();
  }

  /**
   * Enqueue a job for background delivery.
   * Returns immediately without blocking the caller.
   */
  enqueue(job: Omit<EmailJob, 'id'>): string {
    const jobId = crypto.randomUUID();
    const fullJob: EmailJob = {
      ...job,
      id: jobId,
      maxRetries: job.maxRetries ?? this.defaultMaxRetries,
    };

    this.queue.push(fullJob);
    console.log(`📥 [EmailQueue] Enqueued job: ${fullJob.emailType} | Idempotency: ${fullJob.idempotencyKey} | Queue size: ${this.queue.length}`);

    // Trigger queue processor without awaiting
    setImmediate(() => {
      this.processNext().catch((err) => {
        console.error('❌ [EmailQueue] Unhandled processing error:', err);
      });
    });

    return jobId;
  }

  /**
   * Returns current pending queue length
   */
  getQueueSize(): number {
    return this.queue.length;
  }


  /**
   * Continuous queue processor
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (job) {
          await this.executeJob(job);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single email job with idempotency and retry handling
   */
  async executeJob(job: EmailJob): Promise<{ success: boolean; providerMessageId?: string; error?: string; isDuplicate?: boolean }> {
    // 1. Check Idempotency First (Section 14)
    const existing = job.idempotencyKey ? await emailRepository.findByIdempotencyKey(job.idempotencyKey) : null;
    if (existing && existing.status === 'SENT') {
      console.warn(`🛑 [EmailQueue] DUPLICATE PREVENTED: Email with idempotencyKey "${job.idempotencyKey}" already SENT. Skipping.`);
      return { success: true, providerMessageId: existing.provider_message_id || 'DUPLICATE_SKIPPED', isDuplicate: true };
    }

    // 2. Recipient Validation Check (Fail cleanly and securely if invalid/missing)
    if (!isValidEmail(job.recipient)) {
      console.error(`❌ [EmailQueue] Invalid or missing recipient email address: "${job.recipient}". Aborting job.`);
      await emailRepository.create({
        idempotency_key: job.idempotencyKey,
        email_type: job.emailType,
        recipient: job.recipient || 'MISSING_RECIPIENT',
        subject: job.subject,
        related_entity_type: job.relatedEntityType,
        related_entity_id: job.relatedEntityId,
        trigger_source: job.triggerSource,
        status: 'FAILED',
        error_message: 'INVALID_RECIPIENT: Recipient email address is missing or malformed',
        attempt_count: 0,
      });
      return { success: false, error: 'INVALID_RECIPIENT' };
    }

    // 3. Check Dynamic Email Automation Rules (Super Admin Controls)
    const ruleCheck = emailAutomationManager.isEmailAllowed(job.emailType, job.relatedEntityType);
    if (!ruleCheck.allowed) {
      console.log(`⏸️ [EmailQueue] SKIPPED: ${ruleCheck.reason}`);
      await emailRepository.create({
        idempotency_key: job.idempotencyKey,
        email_type: job.emailType,
        recipient: job.recipient,
        subject: job.subject,
        related_entity_type: job.relatedEntityType,
        related_entity_id: job.relatedEntityId,
        trigger_source: job.triggerSource,
        status: 'SKIPPED',
        error_message: ruleCheck.reason || 'Automation rule disabled by Super Admin',
      });
      return { success: false, error: 'AUTOMATION_DISABLED' };
    }

    // 4. Check Preferences (Section 15)
    const canDeliver = emailPreferencesManager.canDeliver(job.category);
    if (!canDeliver) {
      console.log(`🚫 [EmailQueue] User opted out of category "${job.category}". Skipping.`);
      await emailRepository.create({
        idempotency_key: job.idempotencyKey,
        email_type: job.emailType,
        recipient: job.recipient,
        subject: job.subject,
        related_entity_type: job.relatedEntityType,
        related_entity_id: job.relatedEntityId,
        trigger_source: job.triggerSource,
        status: 'SKIPPED',
        error_message: `User preferences excluded category: ${job.category}`,
      });
      return { success: false, error: 'User opted out' };
    }

    // 2B. Provider Resolution: Resend is the SINGLE and exclusive provider for all transactional emails
    const provider = emailProvider;

    // 3. Create or reuse Log Record in PROCESSING state (Section 10)
    let logRecord = existing;
    if (!logRecord) {
      logRecord = await emailRepository.create({
        idempotency_key: job.idempotencyKey,
        email_type: job.emailType,
        recipient: job.recipient,
        subject: job.subject,
        related_entity_type: job.relatedEntityType,
        related_entity_id: job.relatedEntityId,
        trigger_source: job.triggerSource,
        provider: provider.name,
        status: 'PENDING',
        attempt_count: 1,
      });
    }

    // Mark as PROCESSING
    await emailRepository.update(logRecord.id, {
      status: 'PENDING',
      provider: provider.name,
      error_message: null,
    });

    // 4. Send with Retry Mechanism (Section 13)
    const maxRetries = job.maxRetries || this.defaultMaxRetries;
    let attempt = 1;
    let lastError = '';
    let lastStatusCode = 200;
    let lastCategory = 'PERMANENT';

    while (attempt <= maxRetries) {
      try {
        console.log(`📡 [EmailQueue] Dispatch attempt ${attempt}/${maxRetries} via [${provider.name}] for "${job.subject}"`);

        const settings = emailAutomationManager.getSettings();
        const isTestMode = settings.environmentMode === 'TEST';
        const effectiveRecipient = isTestMode
          ? (settings.testRecipientEmail || 'siamibna75@gmail.com')
          : job.recipient;

        if (isTestMode) {
          console.log(`🧪 [EmailQueue] TEST MODE ACTIVE: Isolating delivery from "${job.recipient}" -> test recipient "${effectiveRecipient}"`);
        } else {
          console.log(`🌐 [EmailQueue] LIVE MODE ACTIVE: Delivering directly to intended recipient "${effectiveRecipient}"`);
        }

        const result = await provider.send({
          to: effectiveRecipient,
          subject: isTestMode ? `[TEST MODE] ${job.subject}` : job.subject,
          html: job.html,
          text: job.text,
          replyTo: (job as any).replyTo || (EMAIL_BRAND as any).replyToEmail || EMAIL_BRAND.supportEmail || '252-58-083@diu.edu.bd',
        });

        if (!result.success) {
          lastError = result.error || 'Provider delivery rejection';
          lastStatusCode = result.statusCode || 500;
          lastCategory = result.errorCategory || 'PERMANENT';

          console.warn(`⚠️ [EmailQueue] Attempt ${attempt} failed [${result.provider}] (${lastCategory}): ${lastError}`);

          if (!result.isRetryable) {
            console.warn(`🛑 [EmailQueue] Non-retryable error (${lastCategory}): ${lastError}. Aborting retries.`);
            lastError = `[${lastCategory}] ${lastError}`;
            break;
          }

          if (attempt < maxRetries) {
            await emailRepository.update(logRecord.id, {
              status: 'RETRYING',
              provider: result.provider,
              provider_status_code: lastStatusCode,
              error_category: lastCategory,
              attempt_count: attempt,
              error_message: `Attempt ${attempt} failed [${lastCategory}]: ${lastError}`,
            });

            const backoffMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            attempt++;
          } else {
            break;
          }
          continue;
        }

        const providerMessageId = result.id || `msg_${Date.now()}`;
        console.log(`✅ [EmailQueue] Successfully delivered via [${result.provider}]! Provider ID: ${providerMessageId}`);

        // Update log to SENT or TEST
        const finalStatus = job.emailType === 'TEST_VERIFICATION' ? 'TEST' : 'SENT';
        await emailRepository.update(logRecord.id, {
          status: finalStatus,
          provider: result.provider,
          provider_message_id: providerMessageId,
          provider_status_code: result.statusCode || 200,
          attempt_count: attempt,
          sent_at: new Date().toISOString(),
          error_message: null,
        });

        return { success: true, providerMessageId };
      } catch (err: any) {
        lastError = err.message || 'Unknown delivery failure';
        const classified = classifyEmailError(err);
        lastStatusCode = err?.statusCode || err?.status || 500;
        lastCategory = classified.type;
        console.warn(`⚠️ [EmailQueue] Attempt ${attempt} failed [${classified.type}]: ${lastError}`);

        if (!classified.isRetryable) {
          console.warn(`🛑 [EmailQueue] Non-retryable error (${classified.type}): ${classified.reason}. Aborting retries.`);
          lastError = `[${classified.type}] ${lastError}`;
          break;
        }

        if (attempt < maxRetries) {
          await emailRepository.update(logRecord.id, {
            status: 'RETRYING',
            provider: provider.name,
            provider_status_code: lastStatusCode,
            error_category: lastCategory,
            attempt_count: attempt,
            error_message: `Attempt ${attempt} failed [${classified.type}]: ${lastError}`,
          });

          const backoffMs = job.emailType === 'TEST_SIMULATED_FAILURE' ? 50 : 1000 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          attempt++;
        } else {
          break;
        }
      }
    }

    // All retries exhausted or non-retryable error -> FAILED
    console.error(`❌ [EmailQueue] Final delivery failure for job "${job.idempotencyKey}". Marked FAILED.`);
    await emailRepository.update(logRecord.id, {
      status: 'FAILED',
      provider: provider.name,
      provider_status_code: lastStatusCode,
      error_category: lastCategory,
      attempt_count: attempt,
      error_message: `Delivery failed. Last error: ${lastError}`,
    });

    return { success: false, error: lastError };
  }

  /**
   * Safe Admin Retry for Failed/Retrying emails (Section 12)
   * Respects duplicate protection (never retries if already SENT)
   */
  async retryFailedLog(logId: string, requestedByUserId?: string): Promise<{ success: boolean; message: string }> {
    const log = await emailRepository.findById(logId);
    if (!log) {
      return { success: false, message: 'Email log record not found' };
    }

    if (log.status === 'SENT') {
      return { success: false, message: 'Email was already successfully delivered (duplicate prevention active)' };
    }

    // Reset log status to PENDING
    await emailRepository.update(log.id, {
      status: 'PENDING',
      attempt_count: 0,
      error_message: `Manual retry queued by admin (User: ${requestedByUserId || 'system'})`,
    });

    this.enqueue({
      idempotencyKey: log.idempotency_key ? `${log.idempotency_key}:RETRY:${Date.now()}` : `RETRY:${log.id}:${Date.now()}`,
      emailType: log.email_type,
      category: 'GENERAL',
      recipient: log.recipient,
      subject: log.subject,
      html: `<div style="font-family: Arial, sans-serif; padding: 24px; color: #f8fafc; background: #0f172a; border-radius: 8px;">
               <h3 style="color: #34d399;">${log.subject}</h3>
               <p style="color: #94a3b8;">This message has been re-dispatched via the DIU Investment Club Admin Control Center.</p>
             </div>`,
      relatedEntityType: log.related_entity_type || undefined,
      relatedEntityId: log.related_entity_id || undefined,
      triggerSource: 'ADMIN_MANUAL_RETRY',
      sentByUserId: requestedByUserId,
    });

    return { success: true, message: 'Email delivery retry has been queued' };
  }

  /**
   * Authorized Manual Resend of Transactional Email (Section 13)
   */
  async resendLog(logId: string, options: { reason?: string; requestedByUserId?: string }): Promise<{ success: boolean; message: string; newJobId?: string }> {
    const log = await emailRepository.findById(logId);
    if (!log) {
      return { success: false, message: 'Email log record not found' };
    }

    const resendKey = `${log.idempotency_key || log.id}:RESEND:${Date.now()}`;

    const jobId = this.enqueue({
      idempotencyKey: resendKey,
      emailType: log.email_type,
      category: 'GENERAL',
      recipient: log.recipient,
      subject: `${log.subject} [Resent Copy]`,
      html: `<div style="font-family: Arial, sans-serif; padding: 24px; color: #f8fafc; background: #0f172a; border-radius: 8px;">
               <h3 style="color: #34d399;">${log.subject}</h3>
               <p style="color: #94a3b8;">Resent copy. Reason: ${options.reason || 'Requested by authorized administration'}</p>
             </div>`,
      relatedEntityType: log.related_entity_type || undefined,
      relatedEntityId: log.related_entity_id || undefined,
      triggerSource: 'ADMIN_MANUAL_RESEND',
      sentByUserId: options.requestedByUserId,
    });

    return { success: true, message: 'Transactional email resend successfully queued', newJobId: jobId };
  }

  /**
   * Cancel an in-flight, pending, or retrying email log (Phase 7 Delivery Management)
   */
  async cancelPendingLog(logId: string, requestedByUserId?: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const log = await emailRepository.findById(logId);
    if (!log) {
      return { success: false, message: 'Email log record not found' };
    }

    if (log.status === 'SENT' || (log.status as string) === 'DELIVERED') {
      return { success: false, message: 'Cannot cancel an email that has already been delivered' };
    }

    if (log.status === 'CANCELLED') {
      return { success: false, message: 'Email log is already cancelled' };
    }

    // Remove from in-memory queue if queued
    const initialQueueLength = this.queue.length;
    this.queue = this.queue.filter((job) => job.idempotencyKey !== log.idempotency_key);
    const removedCount = initialQueueLength - this.queue.length;

    const cancelReason = reason || `Cancelled by ${requestedByUserId || 'admin'}`;
    const cancelled = await emailRepository.cancel(log.id, cancelReason);

    if (!cancelled) {
      return { success: false, message: 'Failed to update email record status to CANCELLED' };
    }

    console.log(`🛑 [EmailQueue] Email log ${log.id} successfully CANCELLED. Removed ${removedCount} pending queue items.`);
    return { success: true, message: `Email delivery cancelled: ${cancelReason}` };
  }

  /**
   * Register domain event handlers (Section 1)
   */
  private registerEventListeners(): void {
    // 1A. New System User Created -> User Welcome Email (No access button; activation is separate)
    emailEventBus.on('USER_CREATED', (data: UserCreatedEvent) => {
      try {
        const { subject, html, text } = renderUserWelcomeEmail({
          userName: data.fullName,
          recipientEmail: data.email,
        });

        this.enqueue({
          idempotencyKey: `USER_CREATED:${data.userId}`,
          emailType: 'USER_WELCOME',
          category: 'SECURITY', // Critical administrative onboarding
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'user',
          relatedEntityId: data.userId,
          triggerSource: 'USER_REGISTRATION',
          sentByUserId: data.createdBy,
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle USER_CREATED event:', err.message);
      }
    });

    // 1B. New User Invited -> Secure Account Invitation Email (Contains "Access Your Account" button)
    emailEventBus.on('USER_INVITED', (data: UserInvitedEvent) => {
      try {
        const { subject, html, text } = renderAccountInvitationEmail({
          userName: data.fullName,
          setupUrl: data.setupUrl,
          roleName: data.roleName,
          expiresInHours: data.expiresInHours,
          recipientEmail: data.email,
        });

        this.enqueue({
          idempotencyKey: `USER_INVITED:${data.userId}`,
          emailType: 'ACCOUNT_INVITATION',
          category: 'SECURITY',
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'user',
          relatedEntityId: data.userId,
          triggerSource: 'USER_INVITATION',
          sentByUserId: data.invitedBy,
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle USER_INVITED event:', err.message);
      }
    });

    // 1C. New Member Registered via Member Directory -> Dedicated Member Welcome Email
    // Strictly NO account access button, login URL, activation link, or password setup
    emailEventBus.on('MEMBER_CREATED', (data: MemberCreatedEvent) => {
      try {
        const { subject, html, text } = renderMemberWelcomeEmail({
          userName: data.fullName,
          recipientEmail: data.email,
          department: data.department,
          batch: data.batch,
          memberCode: data.memberCode,
        });

        this.enqueue({
          idempotencyKey: `MEMBER_CREATED:${data.memberId}`,
          emailType: 'MEMBER_WELCOME',
          category: 'GENERAL',
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'member',
          relatedEntityId: data.memberId,
          triggerSource: 'MEMBER_REGISTRATION',
          sentByUserId: data.createdBy || undefined,
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle MEMBER_CREATED event:', err.message);
      }
    });

    // 1C. Email Verification Requested (Section 4)
    emailEventBus.on('EMAIL_VERIFICATION_REQUESTED', (data: EmailVerificationRequestedEvent) => {
      try {
        const { subject, html, text } = renderEmailVerificationEmail({
          userName: data.fullName,
          verificationUrl: data.verificationUrl,
          expiresInMinutes: data.expiresInMinutes,
          recipientEmail: data.email,
        });

        // 5-minute bucket for rate/duplicate safety
        const timeBucket = Math.floor(Date.now() / (1000 * 60 * 5));
        this.enqueue({
          idempotencyKey: `EMAIL_VERIFY:${data.userId}:${timeBucket}`,
          emailType: 'EMAIL_VERIFICATION',
          category: 'SECURITY',
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'user',
          relatedEntityId: data.userId,
          triggerSource: 'EMAIL_VERIFICATION_REQUEST',
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle EMAIL_VERIFICATION_REQUESTED event:', err.message);
      }
    });

    // 1D. Password Reset Requested (Section 5 & 6)
    emailEventBus.on('PASSWORD_RESET_REQUESTED', (data: PasswordResetRequestedEvent) => {
      try {
        const { subject, html, text } = renderPasswordResetEmail({
          userName: data.fullName || 'Member',
          resetUrl: data.resetUrl,
          expiresInMinutes: data.expiresInMinutes,
          recipientEmail: data.email,
        });

        const timeBucket = Math.floor(Date.now() / (1000 * 60 * 5));
        this.enqueue({
          idempotencyKey: `PASSWORD_RESET:${data.email}:${timeBucket}`,
          emailType: 'PASSWORD_RESET',
          category: 'SECURITY',
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'auth',
          triggerSource: 'FORGOT_PASSWORD_REQUEST',
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle PASSWORD_RESET_REQUESTED event:', err.message);
      }
    });

    // 1E. Password Successfully Changed (Section 7)
    emailEventBus.on('PASSWORD_CHANGED', (data: PasswordChangedEvent) => {
      try {
        const { subject, html, text } = renderPasswordChangedEmail({
          userName: data.fullName,
          changedAt: data.changedAt,
          ipAddress: data.ipAddress,
          recipientEmail: data.email,
        });

        const timeBucket = Math.floor(Date.now() / (1000 * 60 * 5));
        this.enqueue({
          idempotencyKey: `PASSWORD_CHANGED:${data.userId}:${timeBucket}`,
          emailType: 'PASSWORD_CHANGED',
          category: 'SECURITY',
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'user',
          relatedEntityId: data.userId,
          triggerSource: 'PASSWORD_UPDATE',
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle PASSWORD_CHANGED event:', err.message);
      }
    });

    // 1F. User Role / Permissions Changed (Section 9)
    emailEventBus.on('USER_ROLE_CHANGED', (data: UserRoleChangedEvent) => {
      try {
        const { subject, html, text } = renderRoleChangedEmail({
          userName: data.fullName,
          newRoleName: data.newRoleName,
          changedBy: data.changedBy,
          recipientEmail: data.email,
        });

        this.enqueue({
          idempotencyKey: `ROLE_CHANGED:${data.userId}:${data.newRoleName}:${Date.now()}`,
          emailType: 'ROLE_CHANGED',
          category: 'SECURITY',
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'user',
          relatedEntityId: data.userId,
          triggerSource: 'ROLE_ASSIGNMENT',
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle USER_ROLE_CHANGED event:', err.message);
      }
    });

    // 1G. Account Status Changed (Disabled / Restored) (Section 10)
    emailEventBus.on('ACCOUNT_STATUS_CHANGED', (data: AccountStatusChangedEvent) => {
      try {
        const { subject, html, text } = renderAccountStatusEmail({
          userName: data.fullName,
          status: data.status,
          reason: data.reason,
          recipientEmail: data.email,
        });

        this.enqueue({
          idempotencyKey: `ACCOUNT_STATUS:${data.userId}:${data.status}:${Date.now()}`,
          emailType: 'ACCOUNT_STATUS',
          category: 'SECURITY',
          recipient: data.email,
          subject,
          html,
          text,
          relatedEntityType: 'user',
          relatedEntityId: data.userId,
          triggerSource: 'STATUS_UPDATE',
          sentByUserId: data.changedBy,
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle ACCOUNT_STATUS_CHANGED event:', err.message);
      }
    });

    // 2. Payment Confirmed -> Automated email disabled per Section 1 requirements
    // (Preserves financial records, receipt generation, status updates, and public digital receipts without unwanted automated emails)
    emailEventBus.on('PAYMENT_CONFIRMED', (_data: PaymentConfirmedEvent) => {
      // Payment verification email dispatch permanently disabled
    });

    // 3. Expense Submitted -> Notify Reviewers / Approvers
    emailEventBus.on('EXPENSE_SUBMITTED', (data: ExpenseSubmittedEvent) => {
      try {
        const rawRecipients = data.approverEmails && data.approverEmails.length > 0
          ? data.approverEmails
          : [DEFAULT_ADMIN_EMAIL];

        const recipients = rawRecipients.filter(isValidEmail);

        for (const recipient of recipients) {
          const { subject, html, text } = renderExpenseSubmittedEmail({
            approverName: 'Club Approver',
            submitterName: data.submitterName,
            expenseReference: data.expenseNumber,
            expenseTitle: data.title,
            amount: data.amount,
            categoryName: data.categoryName,
            recipientEmail: recipient,
          });

          this.enqueue({
            idempotencyKey: `EXPENSE_SUBMITTED:${data.expenseId}:${recipient}`,
            emailType: 'EXPENSE_SUBMITTED',
            category: 'FINANCIAL',
            recipient,
            subject,
            html,
            text,
            relatedEntityType: 'expense',
            relatedEntityId: data.expenseId,
            triggerSource: 'EXPENSE_SUBMISSION',
            sentByUserId: data.submitterId,
          });
        }
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle EXPENSE_SUBMITTED event:', err.message);
      }
    });

    // 4. Expense Approved -> Expense Approved Email
    emailEventBus.on('EXPENSE_APPROVED', (data: ExpenseApprovedEvent) => {
      try {
        const { subject, html, text } = renderExpenseApprovedEmail({
          userName: data.recipientName,
          expenseReference: data.expenseNumber,
          expenseTitle: data.title,
          amount: data.amount,
          approvalDate: data.approvalDate,
          approverName: data.approverName,
          notes: data.notes,
          recipientEmail: data.recipientEmail,
        });

        this.enqueue({
          idempotencyKey: `EXPENSE_APPROVED:${data.expenseId}`,
          emailType: 'EXPENSE_APPROVED',
          category: 'FINANCIAL',
          recipient: data.recipientEmail,
          subject,
          html,
          text,
          relatedEntityType: 'expense',
          relatedEntityId: data.expenseId,
          triggerSource: 'EXPENSE_APPROVAL',
          sentByUserId: data.approverId,
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle EXPENSE_APPROVED event:', err.message);
      }
    });

    // 5. Expense Rejected -> Expense Rejected Email
    emailEventBus.on('EXPENSE_REJECTED', (data: ExpenseRejectedEvent) => {
      try {
        const { subject, html, text } = renderExpenseRejectedEmail({
          userName: data.recipientName,
          expenseReference: data.expenseNumber,
          expenseTitle: data.title,
          amount: data.amount,
          reason: data.reason,
          recipientEmail: data.recipientEmail,
        });

        this.enqueue({
          idempotencyKey: `EXPENSE_REJECTED:${data.expenseId}`,
          emailType: 'EXPENSE_REJECTED',
          category: 'FINANCIAL',
          recipient: data.recipientEmail,
          subject,
          html,
          text,
          relatedEntityType: 'expense',
          relatedEntityId: data.expenseId,
          triggerSource: 'EXPENSE_REJECTION',
          sentByUserId: data.approverId,
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle EXPENSE_REJECTED event:', err.message);
      }
    });

    // 6. Event Created -> Targeted Event Notification
    emailEventBus.on('EVENT_CREATED', (data: EventCreatedEvent) => {
      try {
        const targetEmails = (data.targetEmails || []).filter(isValidEmail);
        if (targetEmails.length === 0) {
          console.log('ℹ️ [EmailQueue] EVENT_CREATED event has no valid recipients. Skipping enqueue.');
          return;
        }

        for (const recipient of targetEmails) {
          const { subject, html, text } = renderEventNotificationEmail({
            memberName: 'Valued Member',
            eventTitle: data.title,
            eventDate: data.startDate,
            location: data.location || 'DIU Campus',
            description: data.summary,
            recipientEmail: recipient,
          });

          this.enqueue({
            idempotencyKey: `EVENT_CREATED:${data.eventId}:${recipient}`,
            emailType: 'EVENT_NOTIFICATION',
            category: 'EVENTS',
            recipient,
            subject,
            html,
            text,
            relatedEntityType: 'event',
            relatedEntityId: data.eventId,
            triggerSource: 'EVENT_CREATION',
            sentByUserId: data.createdBy,
          });
        }
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle EVENT_CREATED event:', err.message);
      }
    });

    // 7. Meeting Scheduled -> Meeting Invitation
    emailEventBus.on('MEETING_SCHEDULED', (data: MeetingScheduledEvent) => {
      try {
        const participants = (data.participantEmails || []).filter(isValidEmail);
        if (participants.length === 0) {
          console.log('ℹ️ [EmailQueue] MEETING_SCHEDULED event has no valid participants. Skipping enqueue.');
          return;
        }

        for (const recipient of participants) {
          const { subject, html, text } = renderMeetingInvitationEmail({
            memberName: 'Meeting Participant',
            meetingTitle: data.title,
            meetingDate: data.meetingDate,
            meetingTime: data.startTime,
            location: data.location || 'DIU Investment Club Office',
            agendaSummary: data.agendaSummary,
            meetingUrl: data.meetingLink,
            recipientEmail: recipient,
          });

          this.enqueue({
            idempotencyKey: `MEETING_SCHEDULED:${data.meetingId}:${recipient}`,
            emailType: 'MEETING_INVITATION',
            category: 'REMINDERS',
            recipient,
            subject,
            html,
            text,
            relatedEntityType: 'meeting',
            relatedEntityId: data.meetingId,
            triggerSource: 'MEETING_CREATION',
            sentByUserId: data.createdBy,
          });
        }
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle MEETING_SCHEDULED event:', err.message);
      }
    });

    // 8. Task Assigned -> Task Assignment Email
    emailEventBus.on('TASK_ASSIGNED', (data: TaskAssignedEvent) => {
      try {
        const { subject, html, text } = renderTaskAssignedEmail({
          assigneeName: data.assigneeName,
          assignedByName: data.assignedByName,
          taskTitle: data.title,
          dueDate: data.dueDate,
          priority: data.priority,
          description: data.description,
          taskId: data.taskId,
          recipientEmail: data.assigneeEmail,
        });

        this.enqueue({
          idempotencyKey: `TASK_ASSIGNED:${data.taskId}:${data.assigneeId}`,
          emailType: 'TASK_ASSIGNED',
          category: 'GENERAL',
          recipient: data.assigneeEmail,
          subject,
          html,
          text,
          relatedEntityType: 'task',
          relatedEntityId: data.taskId,
          triggerSource: 'TASK_ASSIGNMENT',
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle TASK_ASSIGNED event:', err.message);
      }
    });

    // 9. Reminder Triggered -> Reminder Email
    emailEventBus.on('REMINDER_TRIGGERED', (data: ReminderTriggeredEvent) => {
      try {
        const reminderTypeMap: Record<string, 'payment' | 'due' | 'meeting' | 'event' | 'task'> = {
          MEMBER_DUES: 'due',
          PAYMENT: 'payment',
          MEETING: 'meeting',
          EVENT: 'event',
          TASK: 'task',
        };

        const mappedType = reminderTypeMap[data.reminderType] || 'task';

        const { subject, html, text } = renderReminderEmail({
          memberName: data.recipientName || 'Member',
          reminderType: mappedType,
          title: data.title,
          dueDateOrDate: new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }),
          description: data.message,
          actionUrl: data.actionUrl,
          recipientEmail: data.recipientEmail,
        });

        this.enqueue({
          idempotencyKey: `REMINDER_TRIGGERED:${data.reminderId}:${data.recipientEmail}`,
          emailType: `REMINDER_${data.reminderType}`,
          category: 'REMINDERS',
          recipient: data.recipientEmail,
          subject,
          html,
          text,
          relatedEntityType: 'reminder',
          relatedEntityId: data.reminderId,
          triggerSource: 'REMINDER_SYSTEM',
        });
      } catch (err: any) {
        console.error('❌ [EmailQueue] Failed to handle REMINDER_TRIGGERED event:', err.message);
      }
    });

    console.log('🔗 [EmailQueue] All 9 domain event listeners successfully registered.');
  }
}

export const emailQueue = new EmailQueue();
