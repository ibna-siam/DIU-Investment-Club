/**
 * DIU Investment Club - Email Provider Factory
 *
 * Resolves the appropriate email provider based on configuration and context:
 * - Live Automated Deliveries -> Active provider (SMTP if configured/selected, or Resend)
 * - Diagnostic / Manual Tests -> Explicit provider (e.g. Resend for testing verified owner)
 */

import { emailProviderManager, EmailProviderManager } from './email.provider.manager';
import { IEmailProvider, EmailProviderName } from './email.provider.interface';

export { emailProviderManager, EmailProviderManager };

export class EmailProviderFactory {
  getActiveProviderName(): EmailProviderName {
    return emailProviderManager.getActiveProviderName();
  }

  getProvider(name?: EmailProviderName): IEmailProvider {
    return emailProviderManager.getProvider(name);
  }

  getResendProvider(): IEmailProvider {
    return emailProviderManager.getResendProvider();
  }

  getSmtpProvider(): IEmailProvider {
    return emailProviderManager.getSmtpProvider();
  }
}

export const emailProviderFactory = new EmailProviderFactory();
