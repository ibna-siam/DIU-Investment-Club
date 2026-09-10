/**
 * DIU Investment Club - Single Resend Email Provider
 *
 * Implements IEmailProvider using the official Resend SDK.
 * Production Domain: invesmentclub.top
 * Sender: DIU Investment Club <noreply@invesmentclub.top>
 *
 * Exclusively provides email delivery for the entire ERP system:
 * - Zero SMTP / Nodemailer code or fallbacks
 * - Smart classification of errors (auth, sender, recipient, rate-limit, temporary, permanent)
 * - Safe error message sanitization (no secret leakage)
 * - Non-blocking execution
 */

import { getResendClient, isResendConfigured, DEFAULT_FROM_EMAIL } from './email.config';
import { EMAIL_BRAND } from './email.brand';
import { isValidEmail } from './email.security';

export type ErrorCategory =
  | 'INVALID_RECIPIENT'
  | 'PROVIDER_AUTH_ERROR'
  | 'INVALID_SENDER'
  | 'RATE_LIMIT'
  | 'TEMPORARY_PROVIDER_ERROR'
  | 'PERMANENT_PROVIDER_ERROR'
  | 'UNCONFIGURED';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface ProviderSendResult {
  success: boolean;
  provider: 'RESEND';
  id?: string;
  error?: string;
  statusCode?: number;
  errorCategory?: ErrorCategory;
  isRetryable?: boolean;
  raw?: any;
}

export interface IEmailProvider {
  readonly name: 'RESEND';
  isConfigured(): boolean;
  send(options: SendMailOptions): Promise<ProviderSendResult>;
}

export class ResendEmailProvider implements IEmailProvider {
  readonly name = 'RESEND' as const;

  isConfigured(): boolean {
    return isResendConfigured();
  }

  /**
   * Classify Resend API errors into clear, actionable categories
   * and determine whether retry is appropriate.
   */
  public classifyResendError(err: any): {
    errorCategory: ErrorCategory;
    isRetryable: boolean;
    statusCode: number;
    safeMessage: string;
  } {
    const rawMsg = err?.message || (typeof err === 'string' ? err : 'Resend API error');
    const lowerMsg = rawMsg.toLowerCase();
    const statusCode = err?.statusCode || err?.status || (err?.raw?.statusCode) || 500;

    // Sanitize message to ensure no keys or tokens are leaked
    const safeMessage = rawMsg
      .replace(/re_[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]')
      .replace(/bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]');

    // 1. Invalid recipient address format or unroutable
    if (
      lowerMsg.includes('invalid email') ||
      lowerMsg.includes('invalid recipient') ||
      lowerMsg.includes('recipient is invalid') ||
      lowerMsg.includes('format is invalid') ||
      lowerMsg.includes('not a valid email') ||
      statusCode === 422
    ) {
      return {
        errorCategory: 'INVALID_RECIPIENT',
        isRetryable: false,
        statusCode: 422,
        safeMessage: safeMessage || 'Recipient email address format is invalid or unroutable.',
      };
    }

    // 2. Authentication failure / unauthorized API key
    if (
      statusCode === 401 ||
      statusCode === 403 ||
      lowerMsg.includes('api key') ||
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('forbidden') ||
      lowerMsg.includes('restricted')
    ) {
      return {
        errorCategory: 'PROVIDER_AUTH_ERROR',
        isRetryable: false,
        statusCode,
        safeMessage: safeMessage ? `Resend API authentication error: ${safeMessage}` : 'Resend API authentication failed. Verify RESEND_API_KEY configuration.',
      };
    }

    // 3. Sender domain issues (unverified domain, from header mismatch)
    if (
      lowerMsg.includes('verify a domain') ||
      lowerMsg.includes('unverified domain') ||
      lowerMsg.includes('sender') ||
      lowerMsg.includes('from address')
    ) {
      return {
        errorCategory: 'INVALID_SENDER',
        isRetryable: false,
        statusCode: 400,
        safeMessage: safeMessage ? `Resend sender domain error: ${safeMessage}` : 'Sender domain unverified or rejected by provider policy.',
      };
    }

    // 4. Rate limits / Quota exceeded
    if (
      statusCode === 429 ||
      lowerMsg.includes('rate limit') ||
      lowerMsg.includes('too many requests') ||
      lowerMsg.includes('quota')
    ) {
      return {
        errorCategory: 'RATE_LIMIT',
        isRetryable: true,
        statusCode: 429,
        safeMessage: 'Resend API rate limit reached. Queued for automatic retry.',
      };
    }

    // 5. Temporary server-side errors (5xx) or network timeouts
    if (
      statusCode >= 500 ||
      lowerMsg.includes('timeout') ||
      lowerMsg.includes('econnreset') ||
      lowerMsg.includes('etimedout') ||
      lowerMsg.includes('network') ||
      lowerMsg.includes('service unavailable')
    ) {
      return {
        errorCategory: 'TEMPORARY_PROVIDER_ERROR',
        isRetryable: true,
        statusCode: statusCode >= 500 ? statusCode : 503,
        safeMessage: 'Temporary upstream provider failure or network timeout. Queued for retry.',
      };
    }

    // 6. Generic permanent error
    return {
      errorCategory: 'PERMANENT_PROVIDER_ERROR',
      isRetryable: false,
      statusCode,
      safeMessage,
    };
  }

  /**
   * Primary dispatch method to transmit email through Resend API
   */
  async send(options: SendMailOptions): Promise<ProviderSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: 'Resend is not configured (RESEND_API_KEY is missing from environment)',
        statusCode: 503,
        errorCategory: 'UNCONFIGURED',
        isRetryable: false,
      };
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const invalidRecipients = recipients.filter((r) => !r || !isValidEmail(r));
    if (invalidRecipients.length > 0) {
      return {
        success: false,
        provider: this.name,
        error: `Invalid recipient address: ${invalidRecipients.join(', ')}`,
        statusCode: 400,
        errorCategory: 'INVALID_RECIPIENT',
        isRetryable: false,
      };
    }

    try {
      const resend = getResendClient();
      const from = options.from || DEFAULT_FROM_EMAIL;

      const { data, error } = await resend.emails.send({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || EMAIL_BRAND.supportEmail,
      });

      if (error) {
        const classified = this.classifyResendError(error);
        return {
          success: false,
          provider: this.name,
          error: classified.safeMessage,
          statusCode: classified.statusCode,
          errorCategory: classified.errorCategory,
          isRetryable: classified.isRetryable,
          raw: { name: error.name, message: classified.safeMessage },
        };
      }

      return {
        success: true,
        provider: this.name,
        id: data?.id || `resend_${Date.now()}`,
        statusCode: 200,
      };
    } catch (err: any) {
      const classified = this.classifyResendError(err);
      return {
        success: false,
        provider: this.name,
        error: classified.safeMessage,
        statusCode: classified.statusCode,
        errorCategory: classified.errorCategory,
        isRetryable: classified.isRetryable,
        raw: { message: classified.safeMessage },
      };
    }
  }
}

export const emailProvider = new ResendEmailProvider();

/**
 * Unified Provider Manager (Resend Single Provider)
 * Provides clean compatibility for any callers expecting manager methods.
 */
export const emailProviderManager = {
  getActiveProviderName(): 'RESEND' {
    return 'RESEND';
  },

  getPrimaryProvider(): IEmailProvider {
    return emailProvider;
  },

  getProvider(): IEmailProvider {
    return emailProvider;
  },

  isConfigured(): boolean {
    return emailProvider.isConfigured();
  },

  isResendConfigured(): boolean {
    return emailProvider.isConfigured();
  },

  async verifyActiveConnection(): Promise<{ success: boolean; provider: 'RESEND'; error?: string }> {
    const configured = emailProvider.isConfigured();
    return {
      success: configured,
      provider: 'RESEND',
      error: configured ? undefined : 'RESEND_API_KEY is missing from environment',
    };
  },
};
