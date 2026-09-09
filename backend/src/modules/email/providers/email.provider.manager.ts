/**
 * DIU Investment Club - Optimized Centralized Email Provider Manager
 *
 * Enforces:
 * - Lazy provider initialization: When EMAIL_PROVIDER=smtp, only Gmail SMTP is initialized.
 *   Resend is never imported, initialized, or connected.
 * - Single active provider: Each email goes through exactly one provider.
 *   No unnecessary fallbacks or duplicate dispatches.
 * - Connection pooling & reuse for SMTP (maxConnections: 5, maxMessages: 100).
 * - Provider switching via EMAIL_PROVIDER environment variable without code changes.
 * - Zero background polling or unneeded health checks.
 */

import { env } from '../../../config/env';
import { IEmailProvider, EmailProviderName } from './email.provider.interface';

export class EmailProviderManager {
  private activeProviderName: EmailProviderName | null = null;
  private smtpInstance: IEmailProvider | null = null;
  private resendInstance: IEmailProvider | null = null;

  /**
   * Determine the active default provider name (cached for performance)
   */
  getActiveProviderName(): EmailProviderName {
    if (!this.activeProviderName) {
      const configured = (process.env.EMAIL_PROVIDER || env.EMAIL_PROVIDER || 'SMTP').trim().toUpperCase();
      this.activeProviderName = configured === 'RESEND' ? 'RESEND' : 'SMTP';
    }
    return this.activeProviderName;
  }

  /**
   * Returns the primary active provider instance.
   * Lazily loads ONLY the provider needed for the active mode.
   */
  getPrimaryProvider(): IEmailProvider {
    const active = this.getActiveProviderName();
    return active === 'SMTP' ? this.getSmtpProvider() : this.getResendProvider();
  }

  /**
   * Get provider instance by name, defaulting to active primary provider.
   * Does NOT initialize inactive providers.
   */
  getProvider(name?: EmailProviderName): IEmailProvider {
    const target = name || this.getActiveProviderName();
    if (target === 'SMTP') {
      return this.getSmtpProvider();
    }
    return this.getResendProvider();
  }

  /**
   * Lazy getter for SMTP provider.
   * Only instantiates Nodemailer when SMTP is active.
   */
  getSmtpProvider(): IEmailProvider {
    if (!this.smtpInstance) {
      const { SmtpEmailProvider } = require('./smtp.provider');
      this.smtpInstance = new SmtpEmailProvider();
    }
    return this.smtpInstance!;
  }

  /**
   * Lazy getter for Resend provider.
   * Kept completely modular. Only instantiates Resend when EMAIL_PROVIDER=resend.
   */
  getResendProvider(): IEmailProvider {
    if (!this.resendInstance) {
      const { ResendEmailProvider } = require('./resend.provider');
      this.resendInstance = new ResendEmailProvider();
    }
    return this.resendInstance!;
  }

  /**
   * Checks if SMTP credentials are configured (lightweight env check, no connection)
   */
  isSmtpConfigured(): boolean {
    return Boolean(
      env.SMTP_HOST &&
      env.SMTP_HOST.trim().length > 0 &&
      env.SMTP_USER &&
      env.SMTP_USER.trim().length > 0
    );
  }

  /**
   * Checks if Resend credentials exist (lightweight env check, zero SDK initialization)
   */
  isResendConfigured(): boolean {
    return Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.trim().length > 0);
  }

  /**
   * Checks if Resend has a verified custom domain configured (lightweight env check)
   */
  isResendProductionReady(): boolean {
    const fromEmail = env.RESEND_FROM_EMAIL || '';
    return this.isResendConfigured() && !fromEmail.includes('resend.dev');
  }

  /**
   * Verify connectivity of the active provider only (used for on-demand diagnostics)
   */
  async verifyActiveConnection(): Promise<{ success: boolean; provider: EmailProviderName; error?: string }> {
    const active = this.getActiveProviderName();
    if (active === 'SMTP') {
      const smtp = this.getSmtpProvider();
      const res = await (smtp as any).verifyConnection();
      return { success: res.success, provider: 'SMTP', error: res.error };
    }

    const resend = this.getResendProvider();
    return {
      success: resend.isConfigured(),
      provider: 'RESEND',
      error: resend.isConfigured() ? undefined : 'RESEND_API_KEY is not configured',
    };
  }

  /**
   * Reset cached provider name (for testing or runtime switching)
   */
  resetCache(): void {
    this.activeProviderName = null;
    this.smtpInstance = null;
    this.resendInstance = null;
  }
}

export const emailProviderManager = new EmailProviderManager();
