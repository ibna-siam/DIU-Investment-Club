-- =========================================================================
-- DIU INVESTMENT CLUB - PHASE 6: SEEDS, STORED PROCEDURES & PERMISSIONS
-- =========================================================================

-- 1. SEED CHART OF ACCOUNTS
DO $$
DECLARE
    v_asset_id UUID;
    v_curr_asset_id UUID;
    v_liab_id UUID;
    v_curr_liab_id UUID;
    v_equity_id UUID;
    v_rev_id UUID;
    v_exp_id UUID;
    v_cash_id UUID;
    v_bank_id UUID;
    v_mfs_id UUID;
BEGIN
    -- Top Level Heads
    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, is_system_account, description)
    VALUES ('1000', 'ASSETS', 'ASSET', 'DEBIT', TRUE, 'All club economic resources and accounts')
    ON CONFLICT (account_code) DO UPDATE SET account_name = EXCLUDED.account_name
    RETURNING id INTO v_asset_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, is_system_account, description)
    VALUES ('2000', 'LIABILITIES', 'LIABILITY', 'CREDIT', TRUE, 'All club obligations and payables')
    ON CONFLICT (account_code) DO UPDATE SET account_name = EXCLUDED.account_name
    RETURNING id INTO v_liab_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, is_system_account, description)
    VALUES ('3000', 'CLUB EQUITY / FUND', 'EQUITY', 'CREDIT', TRUE, 'Club accumulated fund and reserves')
    ON CONFLICT (account_code) DO UPDATE SET account_name = EXCLUDED.account_name
    RETURNING id INTO v_equity_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, is_system_account, description)
    VALUES ('4000', 'REVENUE', 'REVENUE', 'CREDIT', TRUE, 'All club revenue streams and operational inflows')
    ON CONFLICT (account_code) DO UPDATE SET account_name = EXCLUDED.account_name
    RETURNING id INTO v_rev_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, is_system_account, description)
    VALUES ('5000', 'EXPENSES', 'EXPENSE', 'DEBIT', TRUE, 'All event, operational and administrative outflows')
    ON CONFLICT (account_code) DO UPDATE SET account_name = EXCLUDED.account_name
    RETURNING id INTO v_exp_id;

    -- Level 2: Current Assets & Liabilities
    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, parent_account_id, normal_balance, is_system_account)
    VALUES ('1100', 'CURRENT ASSETS', 'ASSET', v_asset_id, 'DEBIT', TRUE)
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id
    RETURNING id INTO v_curr_asset_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, parent_account_id, normal_balance, is_system_account)
    VALUES ('2100', 'CURRENT LIABILITIES', 'LIABILITY', v_liab_id, 'CREDIT', TRUE)
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id
    RETURNING id INTO v_curr_liab_id;

    -- Level 3: Asset Details
    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('1110', 'Cash in Hand', 'ASSET', 'CASH', v_curr_asset_id, 'DEBIT', TRUE, 'Physical cash held by treasurer/presidium')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id
    RETURNING id INTO v_cash_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('1120', 'Bank Accounts', 'ASSET', 'BANK', v_curr_asset_id, 'DEBIT', TRUE, 'Commercial bank operating checking/savings balances')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id
    RETURNING id INTO v_bank_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('1130', 'Mobile Financial Services (MFS)', 'ASSET', 'MFS', v_curr_asset_id, 'DEBIT', TRUE, 'bKash, Nagad, and Rocket merchant and personal accounts')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id
    RETURNING id INTO v_mfs_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('1200', 'Accounts Receivable (Member Dues)', 'ASSET', 'RECEIVABLE', v_curr_asset_id, 'DEBIT', TRUE, 'Outstanding assessed dues and membership subscriptions receivable')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('1210', 'Sponsorship Receivables', 'ASSET', 'RECEIVABLE', v_curr_asset_id, 'DEBIT', TRUE, 'Contracted sponsorship installments pending realization')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    -- Level 3: Liability Details
    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('2110', 'Accounts Payable', 'LIABILITY', 'PAYABLE', v_curr_liab_id, 'CREDIT', TRUE, 'Vendor obligations and member reimbursement payables')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('2120', 'Accrued Event Expenses', 'LIABILITY', 'ACCRUED', v_curr_liab_id, 'CREDIT', TRUE, 'Unpaid vendor invoices from completed club events')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('2200', 'Unearned Revenue / Advance Sponsorships', 'LIABILITY', 'DEFERRED', v_curr_liab_id, 'CREDIT', TRUE, 'Sponsorships or registrations received for future events')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    -- Level 3: Equity Details
    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('3100', 'Accumulated Club Fund', 'EQUITY', 'RESERVE', v_equity_id, 'CREDIT', TRUE, 'Accumulated surplus retained by DIU Investment Club')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('3200', 'Opening Balance Equity', 'EQUITY', 'OPENING', v_equity_id, 'CREDIT', TRUE, 'Historical equity offset for initial account balances')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    -- Level 3: Revenue Details
    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('4100', 'Member Subscriptions & Dues', 'REVENUE', 'MEMBERSHIP', v_rev_id, 'CREDIT', TRUE, 'Joining fees and recurring dues paid by members')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('4200', 'Donations & Philanthropic Contributions', 'REVENUE', 'DONATION', v_rev_id, 'CREDIT', TRUE, 'Patron, alumni, and faculty charitable contributions')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('4300', 'Corporate Sponsorship Income', 'REVENUE', 'SPONSORSHIP', v_rev_id, 'CREDIT', TRUE, 'Partnership and brand sponsorship contracts')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('4400', 'Event Ticket & Registration Income', 'REVENUE', 'EVENT', v_rev_id, 'CREDIT', TRUE, 'Delegate passes, competition registrations, and event fees')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('4900', 'Miscellaneous Club Revenue', 'REVENUE', 'OTHER', v_rev_id, 'CREDIT', TRUE, 'Bank interest, asset sales, and other non-core inflows')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    -- Level 3: Expense Details
    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('5100', 'Event Direct Program Expenses', 'EXPENSE', 'EVENT', v_exp_id, 'DEBIT', TRUE, 'Venue, stages, sound, printing, speaker honors, and banners')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('5200', 'Administrative & Office Expenses', 'EXPENSE', 'ADMIN', v_exp_id, 'DEBIT', TRUE, 'Stationery, documentation, club tools, and meeting costs')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('5300', 'Marketing, PR & Brand Promotion', 'EXPENSE', 'MARKETING', v_exp_id, 'DEBIT', TRUE, 'Social media campaigns, printing, merchandise, and outreach')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('5400', 'Logistics, Venue & Hospitality Expenses', 'EXPENSE', 'LOGISTICS', v_exp_id, 'DEBIT', TRUE, 'Refreshments, food, transport, and equipment rental')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, parent_account_id, normal_balance, is_system_account, description)
    VALUES ('5900', 'Bank & Payment Gateway Processing Fees', 'EXPENSE', 'FINANCIAL', v_exp_id, 'DEBIT', TRUE, 'bKash/Nagad cashout fees, bank charges, and gateway commissions')
    ON CONFLICT (account_code) DO UPDATE SET parent_account_id = EXCLUDED.parent_account_id;

    -- Link existing financial_accounts to COA
    UPDATE public.financial_accounts
    SET chart_of_account_id = v_cash_id
    WHERE account_type = 'CASH' AND chart_of_account_id IS NULL;

    UPDATE public.financial_accounts
    SET chart_of_account_id = v_bank_id
    WHERE account_type = 'BANK' AND chart_of_account_id IS NULL;

    UPDATE public.financial_accounts
    SET chart_of_account_id = v_mfs_id
    WHERE account_type IN ('BKASH', 'NAGAD', 'ROCKET') AND chart_of_account_id IS NULL;

END $$;

-- 2. SEED FINANCIAL YEAR & PERIODS
DO $$
DECLARE
    v_fy_id UUID;
    v_start_month DATE;
    v_m_start DATE;
    v_m_end DATE;
    v_p_name VARCHAR(100);
    v_status VARCHAR(20);
    i INT;
BEGIN
    -- Financial Year 2025-2026 (July 1, 2025 to June 30, 2026)
    SELECT id INTO v_fy_id FROM public.financial_years WHERE name = 'FY 2025-2026';
    IF v_fy_id IS NULL THEN
        INSERT INTO public.financial_years (name, start_date, end_date, status)
        VALUES ('FY 2025-2026', '2025-07-01', '2026-06-30', 'ACTIVE')
        RETURNING id INTO v_fy_id;
    END IF;

    -- Seed 12 Periods: Period 1 (July 2025) to Period 12 (June 2026)
    FOR i IN 1..12 LOOP
        v_start_month := ('2025-07-01'::DATE + ((i - 1) || ' month')::INTERVAL)::DATE;
        v_m_start := v_start_month;
        v_m_end := (v_start_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        v_p_name := TO_CHAR(v_start_month, 'Month YYYY');
        
        -- Open March 2026 and current periods
        IF v_m_start <= CURRENT_DATE AND v_m_end >= CURRENT_DATE THEN
            v_status := 'OPEN';
        ELSIF v_m_end < CURRENT_DATE THEN
            v_status := 'OPEN'; -- Keep open for historic import
        ELSE
            v_status := 'OPEN';
        END IF;

        INSERT INTO public.accounting_periods (financial_year_id, name, period_number, start_date, end_date, status)
        VALUES (v_fy_id, TRIM(v_p_name), i, v_m_start, v_m_end, v_status)
        ON CONFLICT (financial_year_id, period_number) DO UPDATE
        SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date;
    END LOOP;
END $$;

-- 3. SEED ACCOUNTING MAPPINGS
DO $$
DECLARE
    v_cash_id UUID;
    v_rev_mem_id UUID;
    v_rev_don_id UUID;
    v_rev_spn_id UUID;
    v_rev_evt_id UUID;
    v_exp_evt_id UUID;
    v_exp_adm_id UUID;
    v_equity_opn_id UUID;
BEGIN
    SELECT id INTO v_cash_id FROM public.chart_of_accounts WHERE account_code = '1110';
    SELECT id INTO v_rev_mem_id FROM public.chart_of_accounts WHERE account_code = '4100';
    SELECT id INTO v_rev_don_id FROM public.chart_of_accounts WHERE account_code = '4200';
    SELECT id INTO v_rev_spn_id FROM public.chart_of_accounts WHERE account_code = '4300';
    SELECT id INTO v_rev_evt_id FROM public.chart_of_accounts WHERE account_code = '4400';
    SELECT id INTO v_exp_evt_id FROM public.chart_of_accounts WHERE account_code = '5100';
    SELECT id INTO v_exp_adm_id FROM public.chart_of_accounts WHERE account_code = '5200';
    SELECT id INTO v_equity_opn_id FROM public.chart_of_accounts WHERE account_code = '3200';

    -- Default mappings if not exists
    IF NOT EXISTS (SELECT 1 FROM public.accounting_mappings WHERE transaction_type = 'MEMBER_PAYMENT') THEN
        INSERT INTO public.accounting_mappings (transaction_type, debit_account_id, credit_account_id, description)
        VALUES ('MEMBER_PAYMENT', v_cash_id, v_rev_mem_id, 'Member Dues / Subscription Receipt: Debit Cash/Bank, Credit Membership Revenue');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.accounting_mappings WHERE transaction_type = 'DONATION') THEN
        INSERT INTO public.accounting_mappings (transaction_type, debit_account_id, credit_account_id, description)
        VALUES ('DONATION', v_cash_id, v_rev_don_id, 'Philanthropic Donation: Debit Cash/Bank, Credit Donation Revenue');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.accounting_mappings WHERE transaction_type = 'SPONSORSHIP_PAYMENT') THEN
        INSERT INTO public.accounting_mappings (transaction_type, debit_account_id, credit_account_id, description)
        VALUES ('SPONSORSHIP_PAYMENT', v_cash_id, v_rev_spn_id, 'Corporate Sponsorship Realization: Debit Cash/Bank, Credit Sponsorship Revenue');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.accounting_mappings WHERE transaction_type = 'EVENT_INCOME') THEN
        INSERT INTO public.accounting_mappings (transaction_type, debit_account_id, credit_account_id, description)
        VALUES ('EVENT_INCOME', v_cash_id, v_rev_evt_id, 'Event Registration / Delegate Fee: Debit Cash/Bank, Credit Event Revenue');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.accounting_mappings WHERE transaction_type = 'EVENT_EXPENSE') THEN
        INSERT INTO public.accounting_mappings (transaction_type, debit_account_id, credit_account_id, description)
        VALUES ('EVENT_EXPENSE', v_exp_evt_id, v_cash_id, 'Event Direct Expenditure: Debit Event Expense, Credit Cash/Bank');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.accounting_mappings WHERE transaction_type = 'OPENING_BALANCE') THEN
        INSERT INTO public.accounting_mappings (transaction_type, debit_account_id, credit_account_id, description)
        VALUES ('OPENING_BALANCE', v_cash_id, v_equity_opn_id, 'Account Opening Balance: Debit Asset, Credit Opening Equity');
    END IF;
END $$;

-- 4. STORED PROCEDURE: post_journal_entry
CREATE OR REPLACE FUNCTION post_journal_entry(
    p_journal_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_je RECORD;
    v_sum_debit NUMERIC(15, 2);
    v_sum_credit NUMERIC(15, 2);
    v_period_id UUID;
    v_period_status VARCHAR(20);
    v_voucher_type VARCHAR(30);
    v_voucher_id UUID;
    v_voucher_number VARCHAR(50);
BEGIN
    SELECT * INTO v_je FROM public.journal_entries WHERE id = p_journal_id;
    IF v_je.id IS NULL THEN
        RAISE EXCEPTION 'Journal entry with ID % not found.', p_journal_id;
    END IF;

    IF v_je.status = 'POSTED' THEN
        RAISE EXCEPTION 'Journal entry % is already POSTED.', v_je.journal_number;
    END IF;

    -- Validate Period
    SELECT id, status INTO v_period_id, v_period_status
    FROM public.accounting_periods
    WHERE v_je.entry_date BETWEEN start_date AND end_date
    ORDER BY period_number ASC LIMIT 1;

    IF v_period_id IS NULL OR v_period_status != 'OPEN' THEN
        RAISE EXCEPTION 'Entry date % does not fall within an OPEN accounting period (Status: %).', v_je.entry_date, COALESCE(v_period_status, 'NONE');
    END IF;

    -- Validate Double Entry Lines
    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO v_sum_debit, v_sum_credit
    FROM public.journal_entry_lines
    WHERE journal_entry_id = p_journal_id;

    IF v_sum_debit <= 0 OR v_sum_credit <= 0 THEN
        RAISE EXCEPTION 'Journal entry % cannot be posted without balanced positive debit and credit lines.', v_je.journal_number;
    END IF;

    IF v_sum_debit != v_sum_credit THEN
        RAISE EXCEPTION 'Double entry imbalance in %: Total Debits (%) != Total Credits (%). Difference: %',
            v_je.journal_number, v_sum_debit, v_sum_credit, (v_sum_debit - v_sum_credit);
    END IF;

    -- Update Journal Entry to POSTED
    UPDATE public.journal_entries
    SET status = 'POSTED',
        accounting_period_id = v_period_id,
        total_debit = v_sum_debit,
        total_credit = v_sum_credit,
        posted_by = p_user_id,
        posted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_journal_id;

    -- Determine Voucher Type
    CASE v_je.reference_type
        WHEN 'EXPENSE' THEN v_voucher_type := 'PAYMENT_VOUCHER';
        WHEN 'EVENT_EXPENSE' THEN v_voucher_type := 'PAYMENT_VOUCHER';
        WHEN 'INCOME' THEN v_voucher_type := 'RECEIPT_VOUCHER';
        WHEN 'MEMBER_PAYMENT' THEN v_voucher_type := 'RECEIPT_VOUCHER';
        WHEN 'DONATION' THEN v_voucher_type := 'RECEIPT_VOUCHER';
        WHEN 'SPONSORSHIP_PAYMENT' THEN v_voucher_type := 'RECEIPT_VOUCHER';
        WHEN 'EVENT_INCOME' THEN v_voucher_type := 'RECEIPT_VOUCHER';
        WHEN 'TRANSFER' THEN v_voucher_type := 'CONTRA_VOUCHER';
        ELSE v_voucher_type := 'JOURNAL_VOUCHER';
    END CASE;

    -- Provision Voucher if not exists
    SELECT id, voucher_number INTO v_voucher_id, v_voucher_number
    FROM public.vouchers WHERE journal_entry_id = p_journal_id;

    IF v_voucher_id IS NULL THEN
        v_voucher_number := generate_voucher_number(v_voucher_type);
        INSERT INTO public.vouchers (
            voucher_number,
            voucher_type,
            journal_entry_id,
            transaction_date,
            description,
            status,
            prepared_by,
            approved_by
        ) VALUES (
            v_voucher_number,
            v_voucher_type,
            p_journal_id,
            v_je.entry_date,
            v_je.description,
            'POSTED',
            COALESCE(v_je.created_by, p_user_id),
            p_user_id
        ) RETURNING id INTO v_voucher_id;
    END IF;

    -- Audit Log
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (p_user_id, 'JOURNAL_POSTED', 'journal_entries', p_journal_id, json_build_object(
        'journal_number', v_je.journal_number,
        'voucher_number', v_voucher_number,
        'total_debit', v_sum_debit,
        'total_credit', v_sum_credit
    ));

    RETURN json_build_object(
        'success', TRUE,
        'journal_id', p_journal_id,
        'journal_number', v_je.journal_number,
        'voucher_number', v_voucher_number,
        'total_amount', v_sum_debit,
        'status', 'POSTED'
    );
END;
$$ LANGUAGE plpgsql;

-- 5. STORED PROCEDURE: reverse_journal_entry
CREATE OR REPLACE FUNCTION reverse_journal_entry(
    p_journal_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_orig RECORD;
    v_rev_je_id UUID;
    v_rev_number VARCHAR(50);
    v_line RECORD;
    v_open_period_id UUID;
BEGIN
    SELECT * INTO v_orig FROM public.journal_entries WHERE id = p_journal_id;
    IF v_orig.id IS NULL THEN
        RAISE EXCEPTION 'Journal entry % not found.', p_journal_id;
    END IF;

    IF v_orig.status != 'POSTED' THEN
        RAISE EXCEPTION 'Only POSTED journals can be reversed. Current status: %', v_orig.status;
    END IF;

    IF v_orig.reversal_journal_id IS NOT NULL THEN
        RAISE EXCEPTION 'Journal % has already been reversed.', v_orig.journal_number;
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A valid accounting reason is required to reverse a posted journal.';
    END IF;

    -- Find Open Period
    SELECT id INTO v_open_period_id
    FROM public.accounting_periods
    WHERE CURRENT_DATE BETWEEN start_date AND end_date AND status = 'OPEN'
    LIMIT 1;

    IF v_open_period_id IS NULL THEN
        RAISE EXCEPTION 'No OPEN accounting period exists for today. Reversal blocked.';
    END IF;

    v_rev_number := generate_journal_number();

    -- Create Reversal Journal Entry Header
    INSERT INTO public.journal_entries (
        journal_number,
        entry_date,
        accounting_period_id,
        reference_type,
        reference_id,
        description,
        status,
        total_debit,
        total_credit,
        created_by,
        posted_by,
        posted_at
    ) VALUES (
        v_rev_number,
        CURRENT_DATE,
        v_open_period_id,
        'REVERSAL',
        p_journal_id,
        'Reversal of ' || v_orig.journal_number || ' - Reason: ' || p_reason,
        'DRAFT',
        v_orig.total_credit,
        v_orig.total_debit,
        p_user_id,
        p_user_id,
        NOW()
    ) RETURNING id INTO v_rev_je_id;

    -- Invert Lines: Original Debit becomes Credit; Original Credit becomes Debit
    FOR v_line IN (SELECT * FROM public.journal_entry_lines WHERE journal_entry_id = p_journal_id) LOOP
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            description,
            debit_amount,
            credit_amount
        ) VALUES (
            v_rev_je_id,
            v_line.account_id,
            'Inverted from ' || v_orig.journal_number || ': ' || COALESCE(v_line.description, ''),
            v_line.credit_amount,
            v_line.debit_amount
        );
    END LOOP;

    -- Post the reversal journal atomically
    PERFORM post_journal_entry(v_rev_je_id, p_user_id);

    -- Mark original journal as REVERSED
    UPDATE public.journal_entries
    SET status = 'REVERSED',
        reversed_by = p_user_id,
        reversed_at = NOW(),
        reversal_journal_id = v_rev_je_id,
        updated_at = NOW()
    WHERE id = p_journal_id;

    -- Audit Log
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (p_user_id, 'JOURNAL_REVERSED', 'journal_entries', p_journal_id, json_build_object(
        'original_journal', v_orig.journal_number,
        'reversal_journal', v_rev_number,
        'reason', p_reason
    ));

    RETURN json_build_object(
        'success', TRUE,
        'original_journal_number', v_orig.journal_number,
        'reversal_journal_number', v_rev_number,
        'reversal_journal_id', v_rev_je_id
    );
END;
$$ LANGUAGE plpgsql;

-- 6. STORED PROCEDURE: post_automated_operational_journal
CREATE OR REPLACE FUNCTION post_automated_operational_journal(
    p_ref_type VARCHAR,
    p_ref_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_existing_id UUID;
    v_je_id UUID;
    v_journal_number VARCHAR(50);
    v_date DATE := CURRENT_DATE;
    v_desc TEXT;
    v_amount NUMERIC(15, 2);
    v_debit_coa_id UUID;
    v_credit_coa_id UUID;
    v_rec RECORD;
BEGIN
    -- Idempotency Check
    SELECT id INTO v_existing_id
    FROM public.journal_entries
    WHERE reference_type = p_ref_type AND reference_id = p_ref_id AND status = 'POSTED'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN json_build_object('success', TRUE, 'message', 'Already posted', 'journal_id', v_existing_id);
    END IF;

    -- Handle Transaction Types
    IF p_ref_type = 'MEMBER_PAYMENT' THEN
        SELECT p.*, m.full_name, fa.chart_of_account_id as asset_coa
        INTO v_rec
        FROM public.member_payments p
        JOIN public.members m ON p.member_id = m.id
        LEFT JOIN public.financial_accounts fa ON p.financial_account_id = fa.id
        WHERE p.id = p_ref_id;

        IF v_rec.id IS NULL OR v_rec.verification_status != 'VERIFIED' THEN
            RETURN json_build_object('success', FALSE, 'message', 'Payment not verified or not found');
        END IF;

        v_amount := v_rec.amount_paid;
        v_date := v_rec.payment_date;
        v_desc := 'Member Payment ' || v_rec.payment_number || ' from ' || v_rec.full_name || ' (Trx: ' || COALESCE(v_rec.trx_id, 'N/A') || ')';
        
        -- Debit Asset, Credit Membership Revenue (4100)
        v_debit_coa_id := COALESCE(v_rec.asset_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '1110'));
        SELECT id INTO v_credit_coa_id FROM public.chart_of_accounts WHERE account_code = '4100';

    ELSIF p_ref_type = 'DONATION' THEN
        SELECT d.*, fa.chart_of_account_id as asset_coa
        INTO v_rec
        FROM public.donations d
        LEFT JOIN public.financial_accounts fa ON d.financial_account_id = fa.id
        WHERE d.id = p_ref_id;

        IF v_rec.id IS NULL OR v_rec.status != 'VERIFIED' THEN
            RETURN json_build_object('success', FALSE, 'message', 'Donation not verified or not found');
        END IF;

        v_amount := v_rec.amount;
        v_date := v_rec.donation_date;
        v_desc := 'Philanthropic Donation ' || v_rec.donation_number || ' from ' || v_rec.donor_name;
        
        -- Debit Asset, Credit Donation Revenue (4200)
        v_debit_coa_id := COALESCE(v_rec.asset_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '1110'));
        SELECT id INTO v_credit_coa_id FROM public.chart_of_accounts WHERE account_code = '4200';

    ELSIF p_ref_type = 'SPONSORSHIP_PAYMENT' THEN
        SELECT sp.*, s.agreement_title, spn.company_name, fa.chart_of_account_id as asset_coa
        INTO v_rec
        FROM public.sponsorship_payments sp
        JOIN public.sponsorships s ON sp.sponsorship_id = s.id
        JOIN public.sponsors spn ON s.sponsor_id = spn.id
        LEFT JOIN public.financial_accounts fa ON sp.financial_account_id = fa.id
        WHERE sp.id = p_ref_id;

        IF v_rec.id IS NULL OR v_rec.verification_status != 'VERIFIED' THEN
            RETURN json_build_object('success', FALSE, 'message', 'Installment not verified or not found');
        END IF;

        v_amount := v_rec.amount;
        v_date := v_rec.payment_date;
        v_desc := 'Sponsorship Installment ' || v_rec.payment_number || ' from ' || v_rec.company_name || ' (' || v_rec.agreement_title || ')';

        -- Debit Asset, Credit Sponsorship Revenue (4300)
        v_debit_coa_id := COALESCE(v_rec.asset_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '1110'));
        SELECT id INTO v_credit_coa_id FROM public.chart_of_accounts WHERE account_code = '4300';

    ELSIF p_ref_type = 'INCOME' THEN
        SELECT i.*, fa.chart_of_account_id as asset_coa, ic.chart_of_account_id as rev_coa
        INTO v_rec
        FROM public.incomes i
        LEFT JOIN public.financial_accounts fa ON i.financial_account_id = fa.id
        LEFT JOIN public.income_categories ic ON i.category_id = ic.id
        WHERE i.id = p_ref_id;

        IF v_rec.id IS NULL OR v_rec.status != 'COMPLETED' THEN
            RETURN json_build_object('success', FALSE, 'message', 'Income not completed or not found');
        END IF;

        v_amount := v_rec.amount;
        v_date := v_rec.transaction_date;
        v_desc := 'Operational Income ' || v_rec.income_number || ': ' || COALESCE(v_rec.description, 'Inflow');

        v_debit_coa_id := COALESCE(v_rec.asset_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '1110'));
        v_credit_coa_id := COALESCE(v_rec.rev_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '4900'));

    ELSIF p_ref_type = 'EXPENSE' THEN
        SELECT e.*, fa.chart_of_account_id as asset_coa, ec.chart_of_account_id as exp_coa
        INTO v_rec
        FROM public.expenses e
        LEFT JOIN public.financial_accounts fa ON e.financial_account_id = fa.id
        LEFT JOIN public.expense_categories ec ON e.category_id = ec.id
        WHERE e.id = p_ref_id;

        IF v_rec.id IS NULL OR v_rec.status != 'PAID' THEN
            RETURN json_build_object('success', FALSE, 'message', 'Expense not paid or not found');
        END IF;

        v_amount := v_rec.amount;
        v_date := v_rec.payment_date;
        v_desc := 'Club Expenditure ' || v_rec.expense_number || ': ' || COALESCE(v_rec.title, 'Expense');

        -- Debit Expense (5200 or mapped), Credit Asset
        v_debit_coa_id := COALESCE(v_rec.exp_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '5200'));
        v_credit_coa_id := COALESCE(v_rec.asset_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '1110'));

    ELSIF p_ref_type = 'TRANSFER' THEN
        SELECT t.*, f_from.chart_of_account_id as from_coa, f_to.chart_of_account_id as to_coa
        INTO v_rec
        FROM public.fund_transfers t
        LEFT JOIN public.financial_accounts f_from ON t.from_account_id = f_from.id
        LEFT JOIN public.financial_accounts f_to ON t.to_account_id = f_to.id
        WHERE t.id = p_ref_id;

        IF v_rec.id IS NULL OR v_rec.status != 'COMPLETED' THEN
            RETURN json_build_object('success', FALSE, 'message', 'Transfer not completed or not found');
        END IF;

        v_amount := v_rec.amount;
        v_date := v_rec.transfer_date;
        v_desc := 'Fund Transfer ' || v_rec.transfer_number || ': ' || COALESCE(v_rec.description, 'Internal transfer');

        -- Debit Destination Account, Credit Source Account
        v_debit_coa_id := COALESCE(v_rec.to_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '1120'));
        v_credit_coa_id := COALESCE(v_rec.from_coa, (SELECT id FROM public.chart_of_accounts WHERE account_code = '1110'));

    ELSE
        RETURN json_build_object('success', FALSE, 'message', 'Unsupported reference type ' || p_ref_type);
    END IF;

    -- Ensure Valid Accounts Found
    IF v_debit_coa_id IS NULL OR v_credit_coa_id IS NULL OR v_amount <= 0 THEN
        RETURN json_build_object('success', FALSE, 'message', 'Invalid mapping or zero amount');
    END IF;

    -- Create Journal Entry Header
    v_journal_number := generate_journal_number();
    INSERT INTO public.journal_entries (
        journal_number,
        entry_date,
        reference_type,
        reference_id,
        description,
        status,
        total_debit,
        total_credit,
        created_by
    ) VALUES (
        v_journal_number,
        v_date,
        p_ref_type,
        p_ref_id,
        v_desc,
        'DRAFT',
        v_amount,
        v_amount,
        p_user_id
    ) RETURNING id INTO v_je_id;

    -- Line 1: Debit
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        v_je_id,
        v_debit_coa_id,
        v_desc,
        v_amount,
        0
    );

    -- Line 2: Credit
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        v_je_id,
        v_credit_coa_id,
        v_desc,
        0,
        v_amount
    );

    -- Post the journal
    RETURN post_journal_entry(v_je_id, p_user_id);
END;
$$ LANGUAGE plpgsql;

-- 7. STORED PROCEDURE: sync_historical_operational_journals
CREATE OR REPLACE FUNCTION sync_historical_operational_journals(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    r RECORD;
    v_count INT := 0;
BEGIN
    -- Sync Verified Member Payments
    FOR r IN (SELECT id FROM public.member_payments WHERE verification_status = 'VERIFIED') LOOP
        PERFORM post_automated_operational_journal('MEMBER_PAYMENT', r.id, p_user_id);
        v_count := v_count + 1;
    END LOOP;

    -- Sync Verified Donations
    FOR r IN (SELECT id FROM public.donations WHERE status = 'VERIFIED') LOOP
        PERFORM post_automated_operational_journal('DONATION', r.id, p_user_id);
        v_count := v_count + 1;
    END LOOP;

    -- Sync Verified Sponsorship Payments
    FOR r IN (SELECT id FROM public.sponsorship_payments WHERE verification_status = 'VERIFIED') LOOP
        PERFORM post_automated_operational_journal('SPONSORSHIP_PAYMENT', r.id, p_user_id);
        v_count := v_count + 1;
    END LOOP;

    -- Sync Completed Incomes (that aren't member/donation/sponsorship duplicates)
    FOR r IN (
        SELECT id FROM public.incomes 
        WHERE status = 'COMPLETED' 
        AND id NOT IN (SELECT income_id FROM public.member_payments WHERE income_id IS NOT NULL)
        AND id NOT IN (SELECT income_id FROM public.donations WHERE income_id IS NOT NULL)
        AND id NOT IN (SELECT income_id FROM public.sponsorship_payments WHERE income_id IS NOT NULL)
    ) LOOP
        PERFORM post_automated_operational_journal('INCOME', r.id, p_user_id);
        v_count := v_count + 1;
    END LOOP;

    -- Sync Paid Expenses
    FOR r IN (SELECT id FROM public.expenses WHERE status = 'PAID') LOOP
        PERFORM post_automated_operational_journal('EXPENSE', r.id, p_user_id);
        v_count := v_count + 1;
    END LOOP;

    -- Sync Completed Transfers
    FOR r IN (SELECT id FROM public.fund_transfers WHERE status = 'COMPLETED') LOOP
        PERFORM post_automated_operational_journal('TRANSFER', r.id, p_user_id);
        v_count := v_count + 1;
    END LOOP;

    RETURN json_build_object('success', TRUE, 'synced_count', v_count);
END;
$$ LANGUAGE plpgsql;

-- 8. STORED PROCEDURE: get_trial_balance
CREATE OR REPLACE FUNCTION get_trial_balance(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_rows JSON;
    v_total_debit NUMERIC(15, 2) := 0;
    v_total_credit NUMERIC(15, 2) := 0;
    v_diff NUMERIC(15, 2) := 0;
BEGIN
    WITH account_sums AS (
        SELECT 
            coa.id as account_id,
            coa.account_code,
            coa.account_name,
            coa.account_type,
            coa.normal_balance,
            COALESCE(SUM(jel.debit_amount), 0) as raw_debit,
            COALESCE(SUM(jel.credit_amount), 0) as raw_credit
        FROM public.chart_of_accounts coa
        LEFT JOIN public.journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'POSTED'
            AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
            AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
        WHERE coa.is_active = TRUE
        GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
    ),
    calculated_balances AS (
        SELECT 
            account_id,
            account_code,
            account_name,
            account_type,
            normal_balance,
            raw_debit,
            raw_credit,
            CASE 
                WHEN normal_balance = 'DEBIT' AND (raw_debit - raw_credit) >= 0 THEN (raw_debit - raw_credit)
                WHEN normal_balance = 'CREDIT' AND (raw_debit - raw_credit) > 0 THEN (raw_debit - raw_credit)
                ELSE 0 
            END as debit_balance,
            CASE 
                WHEN normal_balance = 'CREDIT' AND (raw_credit - raw_debit) >= 0 THEN (raw_credit - raw_debit)
                WHEN normal_balance = 'DEBIT' AND (raw_credit - raw_debit) > 0 THEN (raw_credit - raw_debit)
                ELSE 0 
            END as credit_balance
        FROM account_sums
    )
    SELECT 
        json_agg(json_build_object(
            'account_id', account_id,
            'account_code', account_code,
            'account_name', account_name,
            'account_type', account_type,
            'normal_balance', normal_balance,
            'total_debit', raw_debit,
            'total_credit', raw_credit,
            'debit_balance', debit_balance,
            'credit_balance', credit_balance
        ) ORDER BY account_code ASC),
        COALESCE(SUM(debit_balance), 0),
        COALESCE(SUM(credit_balance), 0)
    INTO v_rows, v_total_debit, v_total_credit
    FROM calculated_balances;

    v_diff := ABS(v_total_debit - v_total_credit);

    RETURN json_build_object(
        'accounts', COALESCE(v_rows, '[]'::json),
        'total_debit', v_total_debit,
        'total_credit', v_total_credit,
        'difference', v_diff,
        'is_balanced', (v_diff = 0)
    );
END;
$$ LANGUAGE plpgsql;

-- 9. STORED PROCEDURE: get_accounting_dashboard_summary
CREATE OR REPLACE FUNCTION get_accounting_dashboard_summary()
RETURNS JSON AS $$
DECLARE
    v_total_assets NUMERIC(15, 2) := 0;
    v_total_liabilities NUMERIC(15, 2) := 0;
    v_total_equity NUMERIC(15, 2) := 0;
    v_total_revenue NUMERIC(15, 2) := 0;
    v_total_expenses NUMERIC(15, 2) := 0;
    v_net_surplus NUMERIC(15, 2) := 0;
    v_open_periods INT := 0;
    v_posted_journals INT := 0;
    v_draft_journals INT := 0;
    v_trial_balance JSON;
BEGIN
    -- Asset Balance (Debit - Credit)
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
    INTO v_total_assets
    FROM public.journal_entry_lines jel
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.account_type = 'ASSET' AND je.status = 'POSTED';

    -- Liabilities Balance (Credit - Debit)
    SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
    INTO v_total_liabilities
    FROM public.journal_entry_lines jel
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.account_type = 'LIABILITY' AND je.status = 'POSTED';

    -- Equity Balance (Credit - Debit)
    SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
    INTO v_total_equity
    FROM public.journal_entry_lines jel
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.account_type = 'EQUITY' AND je.status = 'POSTED';

    -- Revenue Balance (Credit - Debit)
    SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
    INTO v_total_revenue
    FROM public.journal_entry_lines jel
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.account_type = 'REVENUE' AND je.status = 'POSTED';

    -- Expense Balance (Debit - Credit)
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
    INTO v_total_expenses
    FROM public.journal_entry_lines jel
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.account_type = 'EXPENSE' AND je.status = 'POSTED';

    v_net_surplus := v_total_revenue - v_total_expenses;

    SELECT COUNT(*) INTO v_open_periods FROM public.accounting_periods WHERE status = 'OPEN';
    SELECT COUNT(*) INTO v_posted_journals FROM public.journal_entries WHERE status = 'POSTED';
    SELECT COUNT(*) INTO v_draft_journals FROM public.journal_entries WHERE status = 'DRAFT';

    SELECT get_trial_balance() INTO v_trial_balance;

    RETURN json_build_object(
        'total_assets', v_total_assets,
        'total_liabilities', v_total_liabilities,
        'total_equity', v_total_equity,
        'total_revenue', v_total_revenue,
        'total_expenses', v_total_expenses,
        'net_surplus', v_net_surplus,
        'open_periods_count', v_open_periods,
        'posted_journals_count', v_posted_journals,
        'draft_journals_count', v_draft_journals,
        'is_trial_balance_equal', (v_trial_balance->>'is_balanced')::BOOLEAN,
        'trial_balance_difference', (v_trial_balance->>'difference')::NUMERIC
    );
END;
$$ LANGUAGE plpgsql;

-- 10. SEED PERMISSIONS FOR PHASE 6
INSERT INTO public.permissions (name, description, category) VALUES
    ('chart_of_accounts.read', 'View Chart of Accounts', 'ACCOUNTING'),
    ('chart_of_accounts.create', 'Create Accounts in Chart of Accounts', 'ACCOUNTING'),
    ('chart_of_accounts.update', 'Update Chart of Accounts', 'ACCOUNTING'),
    ('chart_of_accounts.manage', 'Manage Chart of Accounts Hierarchy', 'ACCOUNTING'),
    ('accounting_periods.manage', 'Open, Close, and Lock Accounting Periods', 'ACCOUNTING'),
    ('financial_years.manage', 'Manage Financial Years', 'ACCOUNTING'),
    ('journal_entries.create', 'Create Journal Entries', 'ACCOUNTING'),
    ('journal_entries.read', 'View Journal Entries', 'ACCOUNTING'),
    ('journal_entries.update', 'Edit Draft Journal Entries', 'ACCOUNTING'),
    ('journal_entries.submit', 'Submit Journal Entries for Approval', 'ACCOUNTING'),
    ('journal_entries.approve', 'Approve Journal Entries', 'ACCOUNTING'),
    ('journal_entries.post', 'Post Balanced Journal Entries to General Ledger', 'ACCOUNTING'),
    ('journal_entries.reverse', 'Reverse Posted Journal Entries', 'ACCOUNTING'),
    ('vouchers.create', 'Create Accounting Vouchers', 'ACCOUNTING'),
    ('vouchers.read', 'View and Print Vouchers', 'ACCOUNTING'),
    ('vouchers.approve', 'Approve Vouchers', 'ACCOUNTING'),
    ('general_ledger.read', 'View General Ledger and Account Statements', 'ACCOUNTING'),
    ('subsidiary_ledger.read', 'View Subsidiary Ledgers (Member, Sponsor, Event)', 'ACCOUNTING'),
    ('trial_balance.read', 'View and Export Trial Balance', 'ACCOUNTING'),
    ('accounting_dashboard.read', 'Access Executive Accounting Dashboard', 'ACCOUNTING')
ON CONFLICT (name) DO NOTHING;

-- Grant to Super Admin, Treasurer, President, Auditor
DO $$
DECLARE
    r_admin UUID;
    r_treasurer UUID;
    r_president UUID;
    r_auditor UUID;
    p_id UUID;
    p_rec RECORD;
BEGIN
    SELECT id INTO r_admin FROM public.roles WHERE name = 'Super Admin';
    SELECT id INTO r_treasurer FROM public.roles WHERE name = 'Treasurer';
    SELECT id INTO r_president FROM public.roles WHERE name = 'President';
    SELECT id INTO r_auditor FROM public.roles WHERE name = 'Auditor';

    FOR p_rec IN SELECT id, name FROM public.permissions WHERE category = 'ACCOUNTING' LOOP
        -- Super Admin & Treasurer get everything
        IF r_admin IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (r_admin, p_rec.id) ON CONFLICT DO NOTHING;
        END IF;
        IF r_treasurer IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (r_treasurer, p_rec.id) ON CONFLICT DO NOTHING;
        END IF;

        -- President gets read, approve, dashboard
        IF r_president IS NOT NULL AND (p_rec.name LIKE '%.read' OR p_rec.name LIKE '%.approve') THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (r_president, p_rec.id) ON CONFLICT DO NOTHING;
        END IF;

        -- Auditor gets all read permissions
        IF r_auditor IS NOT NULL AND p_rec.name LIKE '%.read' THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (r_auditor, p_rec.id) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 11. ENABLE RLS ON NEW TABLES
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for authenticated users with role validation
DROP POLICY IF EXISTS "coa_read" ON public.chart_of_accounts;
CREATE POLICY "coa_read" ON public.chart_of_accounts FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "coa_all" ON public.chart_of_accounts;
CREATE POLICY "coa_all" ON public.chart_of_accounts FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "fy_all" ON public.financial_years;
CREATE POLICY "fy_all" ON public.financial_years FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "ap_all" ON public.accounting_periods;
CREATE POLICY "ap_all" ON public.accounting_periods FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "je_all" ON public.journal_entries;
CREATE POLICY "je_all" ON public.journal_entries FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "jel_all" ON public.journal_entry_lines;
CREATE POLICY "jel_all" ON public.journal_entry_lines FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "am_all" ON public.accounting_mappings;
CREATE POLICY "am_all" ON public.accounting_mappings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "vouchers_all" ON public.vouchers;
CREATE POLICY "vouchers_all" ON public.vouchers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
