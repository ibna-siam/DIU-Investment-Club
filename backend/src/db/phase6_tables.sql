-- =========================================================================
-- DIU INVESTMENT CLUB - PHASE 6: ADVANCED ACCOUNTING SYSTEM
-- =========================================================================

-- 1. CHART OF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    account_subtype VARCHAR(100),
    parent_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON public.chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_code ON public.chart_of_accounts(account_code);

-- 2. FINANCIAL YEARS TABLE
CREATE TABLE IF NOT EXISTS public.financial_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'LOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACCOUNTING PERIODS TABLE
CREATE TABLE IF NOT EXISTS public.accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year_id UUID NOT NULL REFERENCES public.financial_years(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    period_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'LOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_period_fy_number UNIQUE (financial_year_id, period_number)
);

CREATE INDEX IF NOT EXISTS idx_acc_period_dates ON public.accounting_periods(start_date, end_date);

-- 4. JOURNAL ENTRIES TABLE
CREATE SEQUENCE IF NOT EXISTS journal_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_journal_number()
RETURNS VARCHAR AS $$
DECLARE
    seq_val INT;
    v_year INT;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    seq_val := nextval('journal_number_seq');
    RETURN 'JV-' || v_year || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_number VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_journal_number(),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    accounting_period_id UUID REFERENCES public.accounting_periods(id) ON DELETE RESTRICT,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'MEMBER_PAYMENT', 'DONATION', 'SPONSORSHIP_PAYMENT', 'EVENT_INCOME', 'EVENT_EXPENSE', 'MANUAL', 'OPENING_BALANCE', 'REVERSAL')),
    reference_id UUID,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED', 'VOIDED')),
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    posted_by UUID REFERENCES public.profiles(id),
    posted_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES public.profiles(id),
    reversed_at TIMESTAMPTZ,
    reversal_journal_id UUID REFERENCES public.journal_entries(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_je_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_ref ON public.journal_entries(reference_type, reference_id);

-- 5. JOURNAL ENTRY LINES TABLE
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
    credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_line_debit_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_jel_je ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON public.journal_entry_lines(account_id);

-- 6. ACCOUNTING MAPPINGS TABLE
CREATE TABLE IF NOT EXISTS public.accounting_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL,
    operational_category_id UUID,
    operational_account_id UUID REFERENCES public.financial_accounts(id),
    debit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
    credit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. VOUCHERS TABLE
CREATE SEQUENCE IF NOT EXISTS voucher_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_voucher_number(p_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    seq_val INT;
    v_year INT;
    v_prefix VARCHAR(5);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    seq_val := nextval('voucher_number_seq');
    CASE p_type
        WHEN 'PAYMENT_VOUCHER' THEN v_prefix := 'PV-';
        WHEN 'RECEIPT_VOUCHER' THEN v_prefix := 'RV-';
        WHEN 'CONTRA_VOUCHER' THEN v_prefix := 'CV-';
        ELSE v_prefix := 'JV-';
    END CASE;
    RETURN v_prefix || v_year || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    voucher_type VARCHAR(30) NOT NULL CHECK (voucher_type IN ('PAYMENT_VOUCHER', 'RECEIPT_VOUCHER', 'JOURNAL_VOUCHER', 'CONTRA_VOUCHER')),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED')),
    prepared_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_je ON public.vouchers(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON public.vouchers(voucher_type);

-- 8. EXTEND EXISTING TABLES TO CHART OF ACCOUNTS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'chart_of_account_id') THEN
        ALTER TABLE public.financial_accounts ADD COLUMN chart_of_account_id UUID REFERENCES public.chart_of_accounts(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'income_categories' AND column_name = 'chart_of_account_id') THEN
        ALTER TABLE public.income_categories ADD COLUMN chart_of_account_id UUID REFERENCES public.chart_of_accounts(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'chart_of_account_id') THEN
        ALTER TABLE public.expense_categories ADD COLUMN chart_of_account_id UUID REFERENCES public.chart_of_accounts(id);
    END IF;
END $$;
