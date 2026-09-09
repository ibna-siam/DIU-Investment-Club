-- ====================================================================
-- DIU INVESTMENT CLUB FINANCIAL MANAGEMENT SYSTEM
-- DATABASE SCHEMA: PHASE 1 (Users, Profiles, Roles, Permissions, RBAC)
-- ====================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Mock auth schema if running on standard PostgreSQL without Supabase Auth
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        CREATE SCHEMA auth;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES TABLE
-- Connected to auth.users (Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    student_id TEXT UNIQUE,
    profile_image TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USER ROLES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 6. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module, action)
);

-- 7. ROLE PERMISSIONS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm_id ON public.role_permissions(permission_id);

-- 9. AUTO-UPDATE UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_roles_updated_at ON public.roles;
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. SUPABASE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid
          AND r.slug = 'SUPER_ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Super Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- Roles RLS Policies
DROP POLICY IF EXISTS "Roles readable by authenticated users" ON public.roles;
CREATE POLICY "Roles readable by authenticated users"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Super Admins can manage roles" ON public.roles;
CREATE POLICY "Super Admins can manage roles"
    ON public.roles FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- Permissions RLS Policies
DROP POLICY IF EXISTS "Permissions readable by authenticated users" ON public.permissions;
CREATE POLICY "Permissions readable by authenticated users"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (true);

-- User Roles & Role Permissions Policies
DROP POLICY IF EXISTS "User roles readable by authenticated users" ON public.user_roles;
CREATE POLICY "User roles readable by authenticated users"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Super Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Super Admins can manage user roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Role permissions readable by authenticated users" ON public.role_permissions;
CREATE POLICY "Role permissions readable by authenticated users"
    ON public.role_permissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Super Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Super Admins can manage role permissions"
    ON public.role_permissions FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));
