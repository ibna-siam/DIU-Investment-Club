-- ================================================================
-- PHASE 5: MEMBER & CLUB REVENUE MANAGEMENT SYSTEM
-- ================================================================

-- Sequences
CREATE SEQUENCE IF NOT EXISTS public.member_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.due_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.member_payment_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.donation_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.sponsor_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.sponsorship_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.sponsorship_payment_seq START WITH 1 INCREMENT BY 1;

-- 1. membership_types
CREATE TABLE IF NOT EXISTS public.membership_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    joining_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    renewal_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    billing_cycle TEXT NOT NULL DEFAULT 'YEARLY' CHECK (billing_cycle IN ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    batch TEXT,
    semester TEXT,
    membership_type_id UUID REFERENCES public.membership_types(id) ON DELETE SET NULL,
    membership_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (membership_status IN ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED', 'LEFT', 'ARCHIVED')),
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    profile_image TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- 3. member_memberships
CREATE TABLE IF NOT EXISTS public.member_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_type_id UUID NOT NULL REFERENCES public.membership_types(id),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'UPGRADED')),
    joining_fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    renewal_fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. member_dues
CREATE TABLE IF NOT EXISTS public.member_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    due_number TEXT UNIQUE NOT NULL,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.member_memberships(id) ON DELETE SET NULL,
    due_type TEXT NOT NULL CHECK (due_type IN ('MEMBERSHIP_FEE', 'RENEWAL_FEE', 'MONTHLY_DUE', 'SPECIAL_DUE', 'EVENT_FEE', 'OTHER')),
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED')),
    waived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    waived_at TIMESTAMPTZ,
    waiver_reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. member_payments
CREATE TABLE IF NOT EXISTS public.member_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    receipt_number TEXT UNIQUE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    due_id UUID REFERENCES public.member_dues(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    transaction_reference TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFICATION_REQUIRED', 'VERIFIED', 'REJECTED', 'CANCELLED')),
    income_id UUID REFERENCES public.incomes(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. donations
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_number TEXT UNIQUE NOT NULL,
    receipt_number TEXT UNIQUE,
    donor_name TEXT NOT NULL,
    donor_type TEXT NOT NULL CHECK (donor_type IN ('INDIVIDUAL', 'ORGANIZATION', 'ANONYMOUS')),
    email TEXT,
    phone TEXT,
    organization_name TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    reference_number TEXT,
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purpose TEXT,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED')),
    income_id UUID REFERENCES public.incomes(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. sponsors
CREATE TABLE IF NOT EXISTS public.sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. sponsorships
CREATE TABLE IF NOT EXISTS public.sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsorship_number TEXT UNIQUE NOT NULL,
    sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE RESTRICT,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    agreed_amount NUMERIC(15, 2) NOT NULL CHECK (agreed_amount > 0),
    received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROSPECT' CHECK (status IN ('PROSPECT', 'NEGOTIATION', 'AGREED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'EXPIRED')),
    agreement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. sponsorship_payments
CREATE TABLE IF NOT EXISTS public.sponsorship_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    receipt_number TEXT UNIQUE,
    sponsorship_id UUID NOT NULL REFERENCES public.sponsorships(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED')),
    income_id UUID REFERENCES public.incomes(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
