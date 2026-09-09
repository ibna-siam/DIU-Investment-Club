/**
 * DIU Investment Club - Centralized Email Audit & Transmission Logger
 *
 * Records all transactional email dispatches without capturing passwords,
 * tokens, or secret credentials.
 */

import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export interface EmailLogEntry {
  emailType: string;
  recipient: string | string[];
  triggerSource: string;
  providerMessageId?: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED' | 'TEST';
  errorMessage?: string;
  sentByUserId?: string;
  timestamp: string;
}

export class EmailLogger {
  async logTransmission(entry: EmailLogEntry): Promise<void> {
    const sanitizedEntry = {
      emailType: entry.emailType,
      recipient: Array.isArray(entry.recipient) ? entry.recipient.join(', ') : entry.recipient,
      triggerSource: entry.triggerSource,
      providerMessageId: entry.providerMessageId || null,
      status: entry.status,
      errorMessage: entry.errorMessage || null,
      timestamp: entry.timestamp,
    };

    console.log(
      `📑 [EmailLogger] [${entry.status}] Type: "${entry.emailType}" | To: ${sanitizedEntry.recipient} | MsgID: ${entry.providerMessageId || 'N/A'}`
    );

    // If a user initiated the trigger, create an entry in audit_logs
    if (entry.sentByUserId) {
      try {
        await auditLogsRepository.log({
          user_id: entry.sentByUserId,
          action: `EMAIL_${entry.status}`,
          module: 'email',
          record_id: entry.providerMessageId || undefined,
          new_data: sanitizedEntry,
        });
      } catch (err: any) {
        // Logging failure should not disrupt the application flow
        console.warn('⚠️ [EmailLogger] Could not record email audit log:', err.message);
      }
    }
  }
}

export const emailLogger = new EmailLogger();
