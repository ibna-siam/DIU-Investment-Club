import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { queryDatabase } from '../../database/db';

export interface SystemSetting {
  id: string;
  category: 'GENERAL' | 'FINANCIAL' | 'SYSTEM' | 'SECURITY';
  key: string;
  value: any;
  description?: string;
  updated_at?: string;
  updated_by?: string;
}

const inMemoryDefaults: Record<string, any> = {
  club_name: 'DIU Investment Club',
  club_short_name: 'DIU IC',
  university_name: 'Daffodil International University',
  contact_email: 'investmentclub@diu.edu.bd',
  contact_phone: '+880 1700-000000',
  campus_address: 'Daffodil Smart City, Birulia, Savar, Dhaka-1216, Bangladesh',
  official_website: 'https://daffodilvarsity.edu.bd',
  official_comm_label: 'Official club communication',
  footer_text: 'This is an automated message. Please do not reply directly unless reply support is configured.',
  club_logo_url: '',
  social_facebook: 'https://facebook.com/diuic',
  social_linkedin: 'https://linkedin.com/company/diuic',
  default_currency: 'BDT',
  fiscal_year_start: '01-01',
  fiscal_year_end: '12-31',
  single_approval_threshold: 5000,
  dual_approval_threshold: 25000,
  president_approval_threshold: 50000,
  in_app_notifications: true,
  email_alerts: true,
  audit_retention_days: 365,
  session_timeout_minutes: 60,
  max_login_attempts: 5,
};

// In-memory cache for ultra-fast reads & seamless fallback
const inMemoryCache: Record<string, any> = { ...inMemoryDefaults };

export class SettingsRepository {
  /**
   * Synchronous getter for in-memory cached setting (ideal for email templating)
   */
  getSync(key: string, defaultValue?: any): any {
    return inMemoryCache[key] ?? defaultValue;
  }

  /**
   * Synchronous getter for all cached settings
   */
  getAllCached(): Record<string, any> {
    return { ...inMemoryCache };
  }
  async getAll(): Promise<Record<string, any>> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('system_settings')
          .select('category, key, value, description, updated_at')
          .order('category', { ascending: true })
          .order('key', { ascending: true });

        if (!error && data && data.length > 0) {
          const result: Record<string, any> = {};
          for (const row of data) {
            result[row.key] = row.value;
            inMemoryCache[row.key] = row.value;
          }
          return result;
        }
      } catch (err) {
        console.warn('Supabase query for system_settings failed, falling back:', err);
      }
    }

    try {
      const res = await queryDatabase(
        `SELECT category, key, value, description, updated_at 
         FROM public.system_settings 
         ORDER BY category, key`
      );
      if (res && res.rows && res.rows.length > 0) {
        const result: Record<string, any> = {};
        for (const row of res.rows) {
          result[row.key] = row.value;
          inMemoryCache[row.key] = row.value;
        }
        return result;
      }
    } catch (err) {}

    return { ...inMemoryCache };
  }

  async getGrouped(): Promise<Record<string, Record<string, any>>> {
    const grouped: Record<string, Record<string, any>> = {
      GENERAL: {},
      FINANCIAL: {},
      SYSTEM: {},
      SECURITY: {},
    };

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('system_settings')
          .select('category, key, value, description, updated_at')
          .order('category', { ascending: true })
          .order('key', { ascending: true });

        if (!error && data && data.length > 0) {
          for (const row of data) {
            if (!grouped[row.category]) grouped[row.category] = {};
            grouped[row.category][row.key] = {
              value: row.value,
              description: row.description,
              updated_at: row.updated_at,
            };
            inMemoryCache[row.key] = row.value;
          }
          return grouped;
        }
      } catch (err) {}
    }

    try {
      const res = await queryDatabase(
        `SELECT category, key, value, description, updated_at 
         FROM public.system_settings 
         ORDER BY category, key`
      );
      if (res && res.rows && res.rows.length > 0) {
        for (const row of res.rows) {
          if (!grouped[row.category]) grouped[row.category] = {};
          grouped[row.category][row.key] = {
            value: row.value,
            description: row.description,
            updated_at: row.updated_at,
          };
          inMemoryCache[row.key] = row.value;
        }
        return grouped;
      }
    } catch (err) {}

    return grouped;
  }

  async updateSettings(updates: Record<string, any>, updatedBy?: string): Promise<boolean> {
    for (const [key, value] of Object.entries(updates)) {
      // Update in-memory cache immediately
      inMemoryCache[key] = value;

      if (isSupabaseConfigured() && supabaseClient) {
        try {
          const updatePayload: Record<string, any> = {
            value,
            updated_at: new Date().toISOString(),
          };
          if (updatedBy) {
            updatePayload.updated_by = updatedBy;
          }
          const { error } = await supabaseClient
            .from('system_settings')
            .update(updatePayload)
            .eq('key', key);

          if (error) {
            // If updated_by FK constraint triggered, retry without updated_by
            await supabaseClient
              .from('system_settings')
              .update({ value, updated_at: new Date().toISOString() })
              .eq('key', key);
          }
        } catch (err) {
          console.error(`Failed to update setting ${key} via Supabase:`, err);
        }
      }

      try {
        await queryDatabase(
          `UPDATE public.system_settings 
           SET value = $1::jsonb, updated_at = NOW(), updated_by = $2 
           WHERE key = $3`,
          [JSON.stringify(value), updatedBy || null, key]
        );
      } catch (err) {}
    }
    return true;
  }
}

export const settingsRepository = new SettingsRepository();
