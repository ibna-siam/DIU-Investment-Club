import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { IntegrationConfig, IntegrationLog } from '../../types';
import { ConsoleEmailAdapter } from './adapters/email.adapter';
import { ConsoleSmsAdapter } from './adapters/sms.adapter';
import { SandboxPaymentAdapter } from './adapters/payment.adapter';
import { MockCalendarAdapter } from './adapters/calendar.adapter';

export class IntegrationsService {
  async getConfigs(): Promise<IntegrationConfig[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];
    const { data } = await supabaseClient
      .from('integration_configs')
      .select('*')
      .order('provider_type');
    return (data as IntegrationConfig[]) || [];
  }

  async updateConfig(
    providerType: string,
    data: {
      provider_name?: string;
      is_enabled?: boolean;
      settings?: Record<string, any>;
    }
  ): Promise<IntegrationConfig | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: res, error } = await supabaseClient
      .from('integration_configs')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_type', providerType)
      .select()
      .single();

    if (error || !res) return null;
    return res as IntegrationConfig;
  }

  async testIntegration(providerType: string): Promise<{ success: boolean; message: string }> {
    if (providerType === 'EMAIL') {
      const email = new ConsoleEmailAdapter();
      const res = await email.send({
        to: 'audit-test@diu.edu.bd',
        subject: 'DIU Investment Club Integration Test',
        text: 'This is an automated health check test for the email adapter.',
      });
      return { success: res.success, message: `Email adapter tested: Message ID ${res.messageId}` };
    }

    if (providerType === 'SMS') {
      const sms = new ConsoleSmsAdapter();
      const res = await sms.send({
        to: '+8801700000000',
        message: 'DIU Investment Club SMS Adapter Health Check Test.',
      });
      return { success: res.success, message: `SMS adapter tested: Message ID ${res.messageId}` };
    }

    if (providerType === 'PAYMENT') {
      const payment = new SandboxPaymentAdapter();
      const res = await payment.initiatePayment({
        amount: 500,
        currency: 'BDT',
        transactionId: `TEST_${Date.now()}`,
        customerName: 'Test Student',
        customerEmail: 'student@diu.edu.bd',
        purpose: 'Membership Test Verification',
        successUrl: 'http://localhost:3000/payments/success',
        failUrl: 'http://localhost:3000/payments/fail',
      });
      return { success: res.success, message: `Payment gateway initialized: Session ${res.sessionKey}` };
    }

    if (providerType === 'CALENDAR') {
      const cal = new MockCalendarAdapter();
      const res = await cal.syncEvent({
        title: 'Executive Audit Health Check Meeting',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });
      return { success: res.success, message: `Calendar adapter synchronized: ExtID ${res.externalEventId}` };
    }

    return { success: false, message: `Unknown provider type: ${providerType}` };
  }

  async getLogs(params: {
    providerType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: IntegrationLog[]; total: number }> {
    if (!isSupabaseConfigured() || !supabaseClient) return { data: [], total: 0 };

    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 25;
    const offset = (page - 1) * limit;

    let query = supabaseClient.from('integration_logs').select('*', { count: 'exact' });
    if (params.providerType) query = query.eq('provider_type', params.providerType);

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return {
      data: (data as IntegrationLog[]) || [],
      total: count || 0,
    };
  }
}

export const integrationsService = new IntegrationsService();
