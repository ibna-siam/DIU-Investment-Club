/**
 * DIU Investment Club - SMTP Email Provider
 *
 * Implements IEmailProvider using Nodemailer for direct live transactional email delivery.
 * Supports standard SMTP (Google Workspace, DIU institutional mail server, SendGrid SMTP, etc.).
 */

import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import { IEmailProvider, SendMailOptions, ProviderSendResult, ErrorCategory } from './email.provider.interface';
import { EMAIL_BRAND } from '../email.brand';

export class SmtpEmailProvider implements IEmailProvider {
  readonly name = 'SMTP' as const;
  private transporter: Transporter | null = null;

  private configuredCache: boolean | null = null;

  isConfigured(): boolean {
    if (this.configuredCache === null) {
      this.configuredCache = Boolean(
        env.SMTP_HOST &&
        env.SMTP_HOST.trim().length > 0 &&
        env.SMTP_USER &&
        env.SMTP_USER.trim().length > 0
      );
    }
    return this.configuredCache;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      if (!this.isConfigured()) {
        throw new Error('SMTP is not configured. Missing SMTP_HOST or SMTP_USER in environment.');
      }

      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_SECURE, // true for 465, false for 587/STARTTLS
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD ? env.SMTP_PASSWORD.replace(/\s+/g, '') : '',
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }

    return this.transporter;
  }

  /**
   * Safely verify SMTP transport connection & authentication
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'SMTP connection verification failed' };
    }
  }

  /**
   * Classifies SMTP error codes into clear actionable categories
   */
  private classifySmtpError(err: any): { category: ErrorCategory; isRetryable: boolean; statusCode: number } {
    const code = err?.responseCode || err?.statusCode || 0;
    const message = (err?.message || '').toLowerCase();
    const command = err?.command || '';

    // Authentication failure (535, EAUTH, invalid login)
    if (code === 535 || message.includes('auth') || message.includes('credentials') || err?.code === 'EAUTH') {
      return {
        category: 'AUTH_ERROR',
        isRetryable: false,
        statusCode: 535,
      };
    }

    // Invalid / rejected recipient (550, 551, 553)
    if (code === 550 || code === 551 || code === 553 || message.includes('user not found') || message.includes('mailbox unavailable')) {
      return {
        category: 'INVALID_RECIPIENT',
        isRetryable: false,
        statusCode: code || 550,
      };
    }

    // Rate limits (421, 452)
    if (code === 421 || code === 452 || message.includes('rate limit') || message.includes('too many')) {
      return {
        category: 'RATE_LIMIT',
        isRetryable: true,
        statusCode: code || 421,
      };
    }

    // Temporary mailbox or network issues (450, 451, ETIMEDOUT, ECONNREFUSED)
    if (code >= 400 && code < 500 || err?.code === 'ETIMEDOUT' || err?.code === 'ECONNRESET' || err?.code === 'ECONNREFUSED') {
      return {
        category: 'TEMPORARY',
        isRetryable: true,
        statusCode: code || 450,
      };
    }

    // Permanent 5xx rejections
    if (code >= 500 && code < 600) {
      return {
        category: 'PERMANENT',
        isRetryable: false,
        statusCode: code,
      };
    }

    return {
      category: 'TEMPORARY',
      isRetryable: true,
      statusCode: code || 500,
    };
  }

  async send(options: SendMailOptions): Promise<ProviderSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: 'SMTP is not configured (SMTP_HOST or SMTP_USER missing)',
        statusCode: 503,
        errorCategory: 'UNCONFIGURED',
        isRetryable: false,
      };
    }

    try {
      const transporter = this.getTransporter();
      const fromName = env.SMTP_FROM_NAME || 'DIU Investment Club';
      const fromEmail = env.SMTP_FROM_EMAIL || env.SMTP_USER || 'no-reply@diu.edu.bd';
      const fromFormatted = `"${fromName}" <${fromEmail}>`;

      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      const info = await transporter.sendMail({
        from: options.from || fromFormatted,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || EMAIL_BRAND.supportEmail,
      });

      return {
        success: true,
        provider: this.name,
        id: info.messageId || `smtp_${Date.now()}`,
        statusCode: 250,
      };
    } catch (err: any) {
      const { category, isRetryable, statusCode } = this.classifySmtpError(err);
      const safeErrorMessage = err?.message || 'SMTP transmission failure';

      return {
        success: false,
        provider: this.name,
        error: safeErrorMessage,
        statusCode,
        errorCategory: category,
        isRetryable,
        raw: {
          code: err?.code,
          command: err?.command,
          responseCode: err?.responseCode,
        },
      };
    }
  }
}

export const smtpProvider = new SmtpEmailProvider();
