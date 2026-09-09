/**
 * DIU Investment Club - Resend Email Provider
 *
 * Implements IEmailProvider using the official Resend SDK.
 * Handles manual test emails, account owner verification, and custom domains.
 */

import { IEmailProvider, SendMailOptions, ProviderSendResult } from './email.provider.interface';
import { getResendClient, isResendConfigured, DEFAULT_FROM_EMAIL } from '../email.config';
import { EMAIL_BRAND } from '../email.brand';

export class ResendEmailProvider implements IEmailProvider {
  readonly name = 'RESEND' as const;

  isConfigured(): boolean {
    return isResendConfigured();
  }

  async send(options: SendMailOptions): Promise<ProviderSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: 'Resend is not configured (RESEND_API_KEY missing)',
        statusCode: 503,
        errorCategory: 'UNCONFIGURED',
        isRetryable: false,
      };
    }

    try {
      const resend = getResendClient();
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
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
        const statusCode = (error as any).statusCode || (error as any).status || 400;
        const message = error.message || 'Resend delivery failure';
        const isSandboxBlocked = message.includes('only send testing emails') || message.includes('verify a domain');

        return {
          success: false,
          provider: this.name,
          error: message,
          statusCode,
          errorCategory: isSandboxBlocked ? 'PERMANENT' : statusCode >= 500 ? 'TEMPORARY' : 'PERMANENT',
          isRetryable: !isSandboxBlocked && statusCode >= 500,
          raw: error,
        };
      }

      return {
        success: true,
        provider: this.name,
        id: data?.id || `resend_${Date.now()}`,
        statusCode: 200,
      };
    } catch (err: any) {
      const statusCode = err?.statusCode || err?.status || 500;
      const message = err?.message || 'Unknown Resend error';
      const isSandboxBlocked = message.includes('only send testing emails') || message.includes('verify a domain');

      return {
        success: false,
        provider: this.name,
        error: message,
        statusCode,
        errorCategory: isSandboxBlocked ? 'PERMANENT' : statusCode >= 500 ? 'TEMPORARY' : 'PERMANENT',
        isRetryable: !isSandboxBlocked && statusCode >= 500,
        raw: err,
      };
    }
  }
}

export const resendProvider = new ResendEmailProvider();
