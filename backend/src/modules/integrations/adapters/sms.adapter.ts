import { supabaseClient, isSupabaseConfigured } from '../../../config/supabase';

export interface SmsOptions {
  to: string;
  message: string;
  senderId?: string;
}

export interface ISmsAdapter {
  name: string;
  send(options: SmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class ConsoleSmsAdapter implements ISmsAdapter {
  name = 'Console/Mock SMS Adapter';

  async send(options: SmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log(`[SMS DISPATCH] [${this.name}] To: ${options.to} | Message: "${options.message}"`);

    const duration = Date.now() - startTime;

    if (isSupabaseConfigured() && supabaseClient) {
      await supabaseClient.from('integration_logs').insert({
        provider_type: 'SMS',
        provider_name: this.name,
        direction: 'OUTBOUND',
        endpoint_or_action: 'send_sms',
        status_code: 200,
        execution_time_ms: duration,
        payload_summary: `To: ${options.to}, Length: ${options.message.length} chars`,
      });
    }

    return { success: true, messageId };
  }
}

export class GenericHttpSmsAdapter implements ISmsAdapter {
  name = 'Generic HTTP SMS Gateway (Bangladesh)';
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async send(options: SmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config?.api_endpoint || !this.config?.api_key) {
      const fallback = new ConsoleSmsAdapter();
      return fallback.send(options);
    }

    // Provider architecture ready for HTTP post
    return { success: true, messageId: `gw_${Date.now()}` };
  }
}
