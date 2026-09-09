import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { CommunicationTemplate } from '../../types';

export class TemplatesService {
  async listTemplates(): Promise<CommunicationTemplate[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];
    const { data } = await supabaseClient
      .from('communication_templates')
      .select('*')
      .order('created_at', { ascending: false });
    return (data as CommunicationTemplate[]) || [];
  }

  async getTemplateByCode(code: string): Promise<CommunicationTemplate | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;
    const { data } = await supabaseClient
      .from('communication_templates')
      .select('*')
      .eq('code', code)
      .single();
    return (data as CommunicationTemplate) || null;
  }

  async createTemplate(data: {
    code: string;
    name: string;
    channel: 'EMAIL' | 'SMS' | 'NOTIFICATION';
    subject?: string;
    body_template: string;
    variables?: string[];
    created_by?: string;
  }): Promise<CommunicationTemplate | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    // Detect variables like {{var_name}}
    const detectedVars = this.extractVariables(data.body_template + ' ' + (data.subject || ''));
    const finalVars = Array.from(new Set([...(data.variables || []), ...detectedVars]));

    const { data: res, error } = await supabaseClient
      .from('communication_templates')
      .insert({
        code: data.code,
        name: data.name,
        channel: data.channel,
        subject: data.subject || null,
        body_template: data.body_template,
        variables: finalVars,
        is_active: true,
        created_by: data.created_by || null,
      })
      .select()
      .single();

    if (error || !res) return null;
    return res as CommunicationTemplate;
  }

  async updateTemplate(
    id: string,
    data: Partial<CommunicationTemplate>
  ): Promise<CommunicationTemplate | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const payload: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.body_template) {
      const vars = this.extractVariables(data.body_template + ' ' + (data.subject || ''));
      payload.variables = vars;
    }

    const { data: res, error } = await supabaseClient
      .from('communication_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !res) return null;
    return res as CommunicationTemplate;
  }

  renderTemplate(templateString: string, variables: Record<string, any>): string {
    if (!templateString) return '';
    return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
    });
  }

  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/[\{\}\s]/g, ''));
  }
}

export const templatesService = new TemplatesService();
