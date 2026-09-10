import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let supabaseAdmin: SupabaseClient | null = null;
let supabaseClient: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-backend-secret': env.JWT_SECRET || 'diu-investment-club-secure-token',
      },
    },
  });
}

if (env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)) {
  supabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        headers: {
          'x-backend-secret': env.JWT_SECRET || 'diu-investment-club-secure-token',
        },
      },
    }
  );
}

export { supabaseAdmin, supabaseClient };

export const getDbAdmin = (): SupabaseClient => {
  const client = supabaseAdmin || supabaseClient;
  if (!client) {
    throw new Error('Supabase client is not configured');
  }
  return client;
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    env.SUPABASE_URL &&
    env.SUPABASE_URL !== 'https://sample-project.supabase.co' &&
    ((env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY !== 'sample-supabase-service-role-key') ||
     (env.SUPABASE_ANON_KEY && env.SUPABASE_ANON_KEY !== 'sample-anon-key'))
  );
};

