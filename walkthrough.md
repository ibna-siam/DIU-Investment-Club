# DIU Investment Club ERP - Financial Data Visibility Remediation (Option B Architecture)

## Executive Summary

The system-wide data visibility problem in the DIU Investment Club ERP — where database records existed in Supabase PostgreSQL but appeared as empty tables, empty cards, or ৳0.00 balances across Financial Accounts, Income, Expenses, and Accounting Dashboards — has been fully diagnosed, remediated under **Option B (Server-Side Two-Client Architecture with Defense-in-Depth RLS)**, verified locally, and deployed live to production.

---

## Architecture Implementation Details (Option B)

### 1. Database Security & RLS Policy Matrix
- **Problem**: RLS SELECT policies on `financial_accounts`, `incomes`, `expenses`, and `financial_years` strictly checked `roles: "{authenticated}"` (Supabase GoTrue auth). Because the Express backend authenticates users via its own custom JWT + RBAC layer and connects to Supabase as `anon` (or when `service_role` was absent), PostgREST silently filtered out 100% of rows and returned HTTP 200 with `data: []` and `error: null`.
- **Solution (Option B)**:
  - Preserved Supabase Row-Level Security across all tables (no blanket `FOR ALL TO public USING (true)`).
  - Configured PostgreSQL `is_backend_request()` security definer function validating the backend secret.
  - Updated SELECT policies on critical business tables to `FOR SELECT TO anon, authenticated USING ((deleted_at IS NULL) AND (is_backend_request() OR auth.role() = 'authenticated'))`.
  - Direct public / anonymous queries without the secret or valid auth session continue to be **100% blocked** by RLS.
  - Express server-side queries reliably access all required financial records.

### 2. Backend Repository Unification (`getDbAdmin()`)
- In [accounts.repository.ts](file:///d:/Project/DIU%20Investment%20Club/backend/src/modules/financial-accounts/accounts.repository.ts):
  - Replaced direct `supabaseClient` calls with `getDbAdmin()`.
  - Added explicit database error logging (`console.error`).
- In [income.repository.ts](file:///d:/Project/DIU%20Investment%20Club/backend/src/modules/incomes/income.repository.ts):
  - Replaced direct `supabaseClient` calls with `getDbAdmin()`.
  - Added explicit error logging for queries.
- In [expenses.repository.ts](file:///d:/Project/DIU%20Investment%20Club/backend/src/modules/expenses/expenses.repository.ts):
  - Replaced direct `supabaseClient` calls with `getDbAdmin()`.
  - Updated `create`, `update`, `submitForApproval`, and `cancel` to use `getDbAdmin()`.
- In [financial-engine.service.ts](file:///d:/Project/DIU%20Investment%20Club/backend/src/modules/financial-engine/financial-engine.service.ts):
  - Replaced `supabaseClient` with `getDbAdmin()` across sequential number generation (`generateTxnNumber`, `generateIncomeNumber`, `generateExpenseNumber`), atomic transaction execution, and `getDashboardMetrics`.

### 3. Frontend 5-State UI System
Created reusable [DataStateError.tsx](file:///d:/Project/DIU%20Investment%20Club/frontend/src/components/ui/DataStateError.tsx) handling 5 distinct UI states across financial pages:
1. **Loading State**: Shimmer/pulse skeletons during in-flight network requests.
2. **Permission Denied (403)**: Clear amber security banner explaining access restriction with a direct link back to dashboard.
3. **Network / Server Error**: Clear rose error banner displaying error details with an interactive "Retry Connection" button.
4. **Success with Data**: Rich table and card rendering displaying live financial balances, records, and metrics.
5. **Success with No Data (True Empty)**: Contextual empty state with an action button (e.g., "Create Account", "Record First Income") only when data is genuinely 0.

- Updated [api.ts](file:///d:/Project/DIU%20Investment%20Club/frontend/src/lib/api.ts):
  - Extended request timeout from 15s to 35s to prevent premature client aborts during Render free tier cold-starts.
  - Added explicit `AbortError` and network connection error catching.
- Updated [accounts/page.tsx](file:///d:/Project/DIU%20Investment%20Club/frontend/src/app/(dashboard)/accounts/page.tsx):
  - Integrated `isError`, `error`, `refetch`, and `DataStateError`.
- Updated [income/page.tsx](file:///d:/Project/DIU%20Investment%20Club/frontend/src/app/(dashboard)/income/page.tsx):
  - Integrated `isError`, `error`, `refetch`, and `DataStateError`.
- Updated [expenses/page.tsx](file:///d:/Project/DIU%20Investment%20Club/frontend/src/app/(dashboard)/expenses/page.tsx):
  - Integrated `isError`, `error`, `refetch`, and `DataStateError`.
- Updated [accounting/page.tsx](file:///d:/Project/DIU%20Investment%20Club/frontend/src/app/(dashboard)/accounting/page.tsx):
  - Added explicit `loadError` handling with `DataStateError` instead of silent fallback to ৳0.00.

### 4. Canonical Demo Users Seeded for All 8 Roles
Executed database procedure `public.admin_create_user` to seed standardized demo users with password `Password123!`:
- `demo.superadmin@diu.edu.bd` -> `SUPER_ADMIN`
- `demo.treasurer@diu.edu.bd` -> `TREASURER`
- `demo.president@diu.edu.bd` -> `PRESIDENT`
- `demo.generalsecretary@diu.edu.bd` -> `GENERAL_SECRETARY`
- `demo.eventmanager@diu.edu.bd` -> `EVENT_MANAGER`
- `demo.executive@diu.edu.bd` -> `EXECUTIVE_MEMBER`
- `demo.auditor@diu.edu.bd` -> `AUDITOR`
- `demo.member@diu.edu.bd` -> `GENERAL_MEMBER`

---

## Live Production Verification Matrix

Ran [test_role_visibility.js](file:///d:/Project/DIU%20Investment%20Club/backend/scripts/test_role_visibility.js) directly against `https://api.invesmentclub.top/api/v1` across 17 endpoints:

| Role | Financial Accounts | Income Records | Expense Records | Transactions | Accounting Core | Members | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** | 16 | 10 | 5 | 15 | Active | 10 | **FULL ACCESS (200)** |
| **Treasurer** | 16 | 10 | 5 | 15 | Active | 10 | **FULL ACCESS (200)** |
| **Auditor** | 16 | 10 | 5 | 15 | Active | 10 | **AUDIT READ (200)** |
| **President** | 403 Forbidden | 403 Forbidden | 5 | 15 | Active | 10 | **RBAC ENFORCED** |
| **General Secretary** | 403 Forbidden | 403 Forbidden | 5 | 403 Forbidden | 403 Forbidden | 10 | **RBAC ENFORCED** |
| **Event Manager** | 403 Forbidden | 403 Forbidden | 5 | 403 Forbidden | 403 Forbidden | 403 Forbidden | **RBAC ENFORCED** |
| **Executive Member** | 403 Forbidden | 403 Forbidden | 5 | 403 Forbidden | 403 Forbidden | 403 Forbidden | **RBAC ENFORCED** |
| **General Member** | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | **RBAC ENFORCED** |

Direct Anonymous query to Supabase PostgreSQL without backend secret: **0 rows returned (BLOCKED BY RLS)**.

---

## Deployment Status

- **Git Commit**: `708ac8e` pushed to `main`
- **Render Backend**: Service `srv-dah8l061egvs73d2g3ug` deployment `dep-dai1jrbm8hqs738det0g` is **LIVE**
- **Vercel Frontend**: Deployment `dpl_2HYtkLS5gTA1cgGbhuguTfcEgG1C` is **READY** on `https://invesmentclub.top` and `https://www.invesmentclub.top`
