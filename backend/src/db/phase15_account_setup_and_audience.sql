-- =============================================================================
-- Phase 15: Account Setup Authentication, Target Audience, and Meeting Reminders
-- Database: Supabase PostgreSQL
-- =============================================================================

-- 1. Create Stored Procedure for Updating User Password in auth.users (SECURITY DEFINER)
-- This ensures unauthenticated setup/reset flows update the exact GoTrue credential used by login.
CREATE OR REPLACE FUNCTION public.admin_set_user_password(p_user_id UUID, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $$
DECLARE
    v_encrypted TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters long';
    END IF;

    -- Hash using Blowfish bcrypt cost 10 (GoTrue standard)
    v_encrypted := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));

    -- Update the core auth.users table
    UPDATE auth.users
    SET 
        encrypted_password = v_encrypted,
        updated_at = NOW()
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found in auth.users';
    END IF;

    -- Ensure public.profiles reflects active status
    UPDATE public.profiles
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO anon, authenticated, service_role;

-- 2. Create Account Setup Tokens Table for Single-Use, High-Entropy Account Setup Links
CREATE TABLE IF NOT EXISTS public.account_setup_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_setup_tokens_hash ON public.account_setup_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_account_setup_tokens_user ON public.account_setup_tokens(user_id);

-- Enable RLS on account_setup_tokens
ALTER TABLE public.account_setup_tokens ENABLE ROW LEVEL SECURITY;

-- Allow backend service / anon with backend secret to manage setup tokens
DROP POLICY IF EXISTS "Backend manage account_setup_tokens" ON public.account_setup_tokens;
CREATE POLICY "Backend manage account_setup_tokens" ON public.account_setup_tokens
FOR ALL TO anon, authenticated
USING (
    ((current_setting('request.headers'::text, true))::json ->> 'x-backend-secret'::text) IS NOT NULL
    OR auth.role() = 'authenticated'
)
WITH CHECK (
    ((current_setting('request.headers'::text, true))::json ->> 'x-backend-secret'::text) IS NOT NULL
    OR auth.role() = 'authenticated'
);

-- 3. Enhance Events table with Target Audience fields
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS target_emails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS target_roles JSONB DEFAULT '[]'::jsonb;

-- 4. Enhance Meetings table with Participant & Reminder configuration
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '{"immediately":true,"before_24h":true,"before_1h":true}'::jsonb,
ADD COLUMN IF NOT EXISTS participant_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS participant_emails JSONB DEFAULT '[]'::jsonb;
