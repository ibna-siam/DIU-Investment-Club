# DIU Investment Club Financial Management System
## Complete Technical Architecture & Development Specification

**Project Type:** Professional Club Financial & Accounting Management Web Application  
**Organization:** DIU Investment Club  
**Version:** 1.0  
**Architecture Type:** Modern Full-Stack Web Application

---

# 1. SYSTEM ARCHITECTURE

The application should follow a scalable, modular architecture.

## Recommended Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod Validation
- TanStack Query
- Zustand for lightweight global state management

### Backend

- Node.js
- NestJS or Express.js
- TypeScript
- REST API architecture

### Database

- PostgreSQL
- Supabase PostgreSQL

### Authentication

- Supabase Auth or JWT-based authentication
- Role-Based Access Control (RBAC)

### File Storage

- Supabase Storage

Supported uploads:

- PDF
- JPG
- JPEG
- PNG
- WebP

### Deployment

Frontend:

- Vercel

Backend:

- Render / Railway / VPS

Database:

- Supabase PostgreSQL

---

# 2. HIGH-LEVEL SYSTEM ARCHITECTURE

```text
                    USERS
                      │
                      ▼
          ┌───────────────────────┐
          │   NEXT.JS FRONTEND    │
          │                       │
          │ Dashboard / Admin UI  │
          └───────────┬───────────┘
                      │
                   HTTPS API
                      │
                      ▼
          ┌───────────────────────┐
          │    NODE.JS BACKEND    │
          │                       │
          │ Authentication        │
          │ Financial Logic       │
          │ Approval System       │
          │ Accounting Engine     │
          └───────────┬───────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    PostgreSQL    File Storage   Notifications
     Supabase      Supabase
```

---

# 3. APPLICATION MODULE ARCHITECTURE

The backend should be divided into modules.

```text
src/
│
├── auth/
├── users/
├── roles/
├── permissions/
│
├── dashboard/
│
├── financial-accounts/
├── income/
├── expenses/
├── transactions/
├── transfers/
│
├── events/
├── budgets/
│
├── members/
├── member-payments/
│
├── accounting/
│   ├── chart-of-accounts/
│   ├── journal-entries/
│   ├── general-ledger/
│   └── vouchers/
│
├── approvals/
│
├── documents/
│
├── reports/
│
├── notifications/
│
├── audit-logs/
│
└── settings/
```

Every module should have its own:

```text
Controller
Service
Repository
Validation
DTO / Schema
Routes
```

---

# 4. COMPLETE DATABASE SCHEMA

## 4.1 USERS TABLE

### users

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| full_name | VARCHAR | User Full Name |
| email | VARCHAR | Unique Email |
| phone | VARCHAR | Phone Number |
| student_id | VARCHAR | DIU Student ID |
| profile_image | TEXT | Profile Image URL |
| password_hash | TEXT | Password |
| status | ENUM | Active/Inactive |
| created_at | TIMESTAMP | Creation Date |
| updated_at | TIMESTAMP | Update Date |

---

# 4.2 ROLES TABLE

### roles

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| description | TEXT |
| created_at | TIMESTAMP |

Default Roles:

- Super Admin
- Treasurer
- President
- General Secretary
- Event Manager
- Executive Member
- Auditor

---

# 4.3 USER ROLES

### user_roles

```text
user_id
role_id
```

A user may have multiple roles if required.

---

# 4.4 PERMISSIONS

### permissions

| Field | Type |
|---|---|
| id | UUID |
| module | VARCHAR |
| action | VARCHAR |
| description | TEXT |

Example:

```text
expenses.create
expenses.edit
expenses.delete
expenses.approve
```

---

# 4.5 ROLE PERMISSIONS

### role_permissions

```text
role_id
permission_id
```

---

# 5. FINANCIAL ACCOUNT TABLE

### financial_accounts

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| account_type | ENUM |
| account_number | VARCHAR |
| opening_balance | DECIMAL |
| current_balance | DECIMAL |
| status | ENUM |
| created_at | TIMESTAMP |

Account Types:

```text
CASH
BANK
BKASH
NAGAD
ROCKET
OTHER
```

---

# 6. INCOME CATEGORY TABLE

### income_categories

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| description | TEXT |
| status | BOOLEAN |

---

# 7. EXPENSE CATEGORY TABLE

### expense_categories

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| description | TEXT |
| status | BOOLEAN |

---

# 8. INCOME TABLE

### incomes

| Field | Type |
|---|---|
| id | UUID |
| transaction_number | VARCHAR |
| date | DATE |
| category_id | UUID |
| amount | DECIMAL |
| received_from | VARCHAR |
| financial_account_id | UUID |
| payment_method | VARCHAR |
| reference_number | VARCHAR |
| description | TEXT |
| event_id | UUID |
| status | ENUM |
| created_by | UUID |
| created_at | TIMESTAMP |

---

# 9. EXPENSE TABLE

### expenses

| Field | Type |
|---|---|
| id | UUID |
| expense_number | VARCHAR |
| date | DATE |
| category_id | UUID |
| amount | DECIMAL |
| vendor_name | VARCHAR |
| financial_account_id | UUID |
| payment_method | VARCHAR |
| event_id | UUID |
| description | TEXT |
| status | ENUM |
| requested_by | UUID |
| approved_by | UUID |
| created_at | TIMESTAMP |

Expense Status:

```text
DRAFT
PENDING
APPROVED
REJECTED
PAID
CANCELLED
```

---

# 10. EVENTS TABLE

### events

| Field | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| description | TEXT |
| start_date | DATE |
| end_date | DATE |
| location | VARCHAR |
| event_manager_id | UUID |
| expected_participants | INTEGER |
| status | ENUM |

Event Status:

```text
PLANNED
ONGOING
COMPLETED
CANCELLED
```

---

# 11. EVENT BUDGET TABLE

### event_budgets

| Field | Type |
|---|---|
| id | UUID |
| event_id | UUID |
| proposed_budget | DECIMAL |
| approved_budget | DECIMAL |
| total_expense | DECIMAL |
| remaining_budget | DECIMAL |
| status | ENUM |
| created_by | UUID |
| approved_by | UUID |

---

# 12. MEMBER TABLE

### members

| Field | Type |
|---|---|
| id | UUID |
| full_name | VARCHAR |
| student_id | VARCHAR |
| email | VARCHAR |
| phone | VARCHAR |
| department | VARCHAR |
| batch | VARCHAR |
| status | ENUM |

---

# 13. MEMBER PAYMENTS TABLE

### member_payments

| Field | Type |
|---|---|
| id | UUID |
| member_id | UUID |
| payment_type | ENUM |
| amount | DECIMAL |
| paid_amount | DECIMAL |
| due_amount | DECIMAL |
| payment_date | DATE |
| financial_account_id | UUID |
| status | ENUM |

---

# 14. FUND TRANSFERS TABLE

### fund_transfers

| Field | Type |
|---|---|
| id | UUID |
| transfer_number | VARCHAR |
| from_account_id | UUID |
| to_account_id | UUID |
| amount | DECIMAL |
| transfer_date | DATE |
| description | TEXT |
| created_by | UUID |

---

# 15. CHART OF ACCOUNTS

### chart_of_accounts

| Field | Type |
|---|---|
| id | UUID |
| account_code | VARCHAR |
| account_name | VARCHAR |
| account_type | ENUM |
| parent_account_id | UUID |
| description | TEXT |
| status | BOOLEAN |

Account Types:

```text
ASSET
LIABILITY
EQUITY
INCOME
EXPENSE
```

---

# 16. JOURNAL ENTRIES

### journal_entries

| Field | Type |
|---|---|
| id | UUID |
| journal_number | VARCHAR |
| date | DATE |
| description | TEXT |
| reference | VARCHAR |
| status | ENUM |
| created_by | UUID |
| approved_by | UUID |
| created_at | TIMESTAMP |

---

# 17. JOURNAL ENTRY LINES

### journal_entry_lines

| Field | Type |
|---|---|
| id | UUID |
| journal_entry_id | UUID |
| account_id | UUID |
| debit | DECIMAL |
| credit | DECIMAL |
| description | TEXT |

Business Rule:

```text
Total Debit = Total Credit
```

The system must reject unbalanced journal entries.

---

# 18. VOUCHERS TABLE

### vouchers

| Field | Type |
|---|---|
| id | UUID |
| voucher_number | VARCHAR |
| voucher_type | ENUM |
| date | DATE |
| amount | DECIMAL |
| description | TEXT |
| prepared_by | UUID |
| approved_by | UUID |

Voucher Types:

```text
PAYMENT
RECEIPT
JOURNAL
CONTRA
```

---

# 19. DOCUMENTS TABLE

### documents

| Field | Type |
|---|---|
| id | UUID |
| file_name | VARCHAR |
| file_url | TEXT |
| file_type | VARCHAR |
| file_size | INTEGER |
| related_type | VARCHAR |
| related_id | UUID |
| uploaded_by | UUID |
| uploaded_at | TIMESTAMP |

---

# 20. APPROVALS TABLE

### approvals

| Field | Type |
|---|---|
| id | UUID |
| approval_type | VARCHAR |
| related_id | UUID |
| requested_by | UUID |
| approver_id | UUID |
| status | ENUM |
| comments | TEXT |
| created_at | TIMESTAMP |

---

# 21. NOTIFICATIONS TABLE

### notifications

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| title | VARCHAR |
| message | TEXT |
| type | VARCHAR |
| related_url | TEXT |
| is_read | BOOLEAN |
| created_at | TIMESTAMP |

---

# 22. AUDIT LOGS TABLE

### audit_logs

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| action | VARCHAR |
| module | VARCHAR |
| record_id | UUID |
| old_data | JSONB |
| new_data | JSONB |
| ip_address | VARCHAR |
| created_at | TIMESTAMP |

---

# 23. SYSTEM SETTINGS

### system_settings

| Field | Type |
|---|---|
| id | UUID |
| setting_key | VARCHAR |
| setting_value | JSONB |
| updated_by | UUID |
| updated_at | TIMESTAMP |

---

# 24. COMPLETE ER DIAGRAM

```text
USERS
  │
  ├──────── USER_ROLES ──────── ROLES
  │                               │
  │                               └── ROLE_PERMISSIONS ── PERMISSIONS
  │
  ├──────── INCOMES
  │
  ├──────── EXPENSES
  │
  ├──────── JOURNAL_ENTRIES
  │
  ├──────── APPROVALS
  │
  └──────── AUDIT_LOGS


FINANCIAL_ACCOUNTS
  │
  ├──────── INCOMES
  │
  ├──────── EXPENSES
  │
  ├──────── MEMBER_PAYMENTS
  │
  └──────── FUND_TRANSFERS


EVENTS
  │
  ├──────── EVENT_BUDGETS
  │
  ├──────── INCOMES
  │
  └──────── EXPENSES


CHART_OF_ACCOUNTS
  │
  └──────── JOURNAL_ENTRY_LINES
           │
           └──── JOURNAL_ENTRIES


MEMBERS
  │
  └──────── MEMBER_PAYMENTS


DOCUMENTS
  │
  ├──────── INCOMES
  ├──────── EXPENSES
  ├──────── EVENTS
  └──────── VOUCHERS
```

---

# 25. ADMIN PANEL STRUCTURE

## Main Sidebar

```text
Dashboard

Financial Management
├── All Transactions
├── Income
├── Expenses
├── Cash Flow
├── Fund Transfers
└── Financial Accounts

Events
├── All Events
├── Event Budgets
├── Event Expenses
└── Event Financial Reports

Members
├── All Members
├── Membership Fees
├── Member Payments
└── Due Payments

Accounting
├── Chart of Accounts
├── Journal Entries
├── General Ledger
└── Vouchers

Approvals
├── Pending Approvals
├── Approved
└── Rejected

Reports
├── Financial Overview
├── Income Report
├── Expense Report
├── Cash Flow Report
├── Event Report
├── Member Payment Report
└── Annual Report

Documents

Notifications

Administration
├── Users
├── Roles & Permissions
├── Audit Logs
└── System Settings
```

---

# 26. COMPLETE PAGE STRUCTURE

## Authentication

```text
/login
/forgot-password
/reset-password
```

---

## Dashboard

```text
/dashboard
```

---

## Financial Management

```text
/transactions

/income
/income/create
/income/:id

/expenses
/expenses/create
/expenses/:id

/accounts
/accounts/create
/accounts/:id

/transfers
/transfers/create

/cash-flow
```

---

## Events

```text
/events
/events/create
/events/:id

/events/:id/budget
/events/:id/expenses
/events/:id/income
/events/:id/report
```

---

## Members

```text
/members
/members/create
/members/:id

/member-payments
/member-payments/create

/due-payments
```

---

## Accounting

```text
/chart-of-accounts

/journal-entries
/journal-entries/create
/journal-entries/:id

/general-ledger

/vouchers
/vouchers/:id
```

---

## Approvals

```text
/approvals

/approvals/pending
/approvals/approved
/approvals/rejected
```

---

## Reports

```text
/reports

/reports/income
/reports/expenses
/reports/cash-flow
/reports/events
/reports/members
/reports/annual
```

---

# 27. REST API STRUCTURE

Base URL:

```text
/api/v1
```

---

# AUTHENTICATION API

```text
POST   /auth/login

POST   /auth/logout

POST   /auth/register

POST   /auth/forgot-password

POST   /auth/reset-password

GET    /auth/me
```

---

# USERS API

```text
GET    /users

POST   /users

GET    /users/:id

PATCH  /users/:id

DELETE /users/:id
```

---

# ROLES API

```text
GET    /roles

POST   /roles

PATCH  /roles/:id

DELETE /roles/:id
```

---

# FINANCIAL ACCOUNTS API

```text
GET    /accounts

POST   /accounts

GET    /accounts/:id

PATCH  /accounts/:id

DELETE /accounts/:id

GET    /accounts/:id/transactions
```

---

# INCOME API

```text
GET    /income

POST   /income

GET    /income/:id

PATCH  /income/:id

DELETE /income/:id
```

Filters:

```text
/income?startDate=
&endDate=
&category=
&event=
```

---

# EXPENSE API

```text
GET    /expenses

POST   /expenses

GET    /expenses/:id

PATCH  /expenses/:id

DELETE /expenses/:id

POST   /expenses/:id/submit

POST   /expenses/:id/approve

POST   /expenses/:id/reject

POST   /expenses/:id/pay
```

---

# FUND TRANSFER API

```text
GET    /transfers

POST   /transfers

GET    /transfers/:id
```

---

# EVENTS API

```text
GET    /events

POST   /events

GET    /events/:id

PATCH  /events/:id

DELETE /events/:id
```

---

# EVENT BUDGET API

```text
GET    /events/:id/budget

POST   /events/:id/budget

PATCH  /events/:id/budget

POST   /events/:id/budget/approve
```

---

# MEMBERS API

```text
GET    /members

POST   /members

GET    /members/:id

PATCH  /members/:id

DELETE /members/:id
```

---

# MEMBER PAYMENT API

```text
GET    /member-payments

POST   /member-payments

GET    /member-payments/:id

PATCH  /member-payments/:id
```

---

# JOURNAL ENTRY API

```text
GET    /journal-entries

POST   /journal-entries

GET    /journal-entries/:id

PATCH  /journal-entries/:id

POST   /journal-entries/:id/approve
```

---

# GENERAL LEDGER API

```text
GET /general-ledger

GET /general-ledger/:accountId

GET /general-ledger/:accountId?startDate=&endDate=
```

---

# VOUCHER API

```text
GET    /vouchers

POST   /vouchers

GET    /vouchers/:id

GET    /vouchers/:id/pdf
```

---

# APPROVAL API

```text
GET /approvals

GET /approvals/pending

POST /approvals/:id/approve

POST /approvals/:id/reject
```

---

# REPORT API

```text
GET /reports/dashboard

GET /reports/income

GET /reports/expenses

GET /reports/cash-flow

GET /reports/events/:id

GET /reports/members

GET /reports/annual
```

---

# DOCUMENT API

```text
POST /documents/upload

GET  /documents

DELETE /documents/:id
```

---

# NOTIFICATION API

```text
GET  /notifications

PATCH /notifications/:id/read

PATCH /notifications/read-all
```

---

# AUDIT LOG API

```text
GET /audit-logs
```

Only authorized administrators and auditors can access this endpoint.

---

# 28. DASHBOARD UI REQUIREMENTS

The dashboard should include:

### Top Summary Cards

```text
Total Balance

Cash in Hand

Bank Balance

Total Income

Total Expenses

Pending Approvals
```

### Middle Section

```text
Income vs Expense Chart

Monthly Cash Flow Chart
```

### Bottom Section

```text
Recent Transactions

Pending Approvals

Upcoming Events

Recent Activities
```

---

# 29. IMPORTANT AUTOMATION RULES

The application must automatically perform financial calculations.

## When Income is Added

```text
Income Added

        ↓

Financial Account Balance Updated

        ↓

Transaction Recorded

        ↓

Journal Entry Created
```

---

## When Expense is Paid

```text
Expense Approved

        ↓

Payment Completed

        ↓

Account Balance Reduced

        ↓

Expense Recorded

        ↓

Journal Entry Created

        ↓

Event Budget Updated
```

---

## When Fund Transfer Happens

```text
Source Account Balance Decreases

Destination Account Balance Increases

Transfer History Created
```

---

# 30. CRITICAL DATA INTEGRITY RULES

The application must never allow:

❌ Negative invalid balances

❌ Unbalanced journal entries

❌ Duplicate transaction IDs

❌ Unauthorized financial edits

❌ Permanent deletion of critical financial records

❌ Account balance changes without transaction records

Instead:

- Use soft delete where appropriate
- Maintain audit logs
- Use database transactions
- Validate all financial operations

---

# 31. DEVELOPMENT PHASES

## PHASE 1: FOUNDATION

- Project setup
- Database
- Authentication
- User management
- Roles and permissions
- Dashboard

---

## PHASE 2: CORE FINANCE

- Financial accounts
- Income
- Expenses
- Categories
- Fund transfers
- Transactions

---

## PHASE 3: EVENT FINANCE

- Events
- Budgets
- Event income
- Event expenses
- Budget tracking

---

## PHASE 4: ACCOUNTING

- Chart of accounts
- Journal entries
- General ledger
- Vouchers

---

## PHASE 5: REPORTING

- Financial reports
- Cash flow
- Event reports
- PDF export
- Excel export

---

## PHASE 6: ADVANCED SYSTEM

- Notifications
- Audit logs
- Advanced approval workflow
- Mobile optimization
- Performance optimization

---

# 32. AI DEVELOPMENT INSTRUCTIONS

When building this project, the AI or development team must follow these rules:

1. Do not create dummy financial logic.

2. All balances must be calculated accurately.

3. Financial operations must use database transactions.

4. Never directly modify account balances without recording a transaction.

5. Journal entries must always balance.

6. All sensitive APIs must be protected.

7. Implement role-based access control on both frontend and backend.

8. Build responsive desktop, tablet, and mobile interfaces.

9. Use reusable components.

10. Maintain clean and modular code.

11. Use proper loading states.

12. Use proper error handling.

13. Use confirmation dialogs before critical actions.

14. Implement audit logging for important financial activities.

15. Design the application as a professional financial system, not a simple student project.

---

# FINAL DEVELOPMENT GOAL

Build a production-quality financial management platform for DIU Investment Club where the Treasurer and authorized executives can manage the complete financial ecosystem of the club from one centralized system.

The final system should support:

✓ Income Management

✓ Expense Management

✓ Cash Management

✓ Bank Management

✓ Mobile Banking Management

✓ Event Financial Management

✓ Budget Management

✓ Member Payments

✓ Approval Workflow

✓ Double-Entry Accounting

✓ Journal Entries

✓ General Ledger

✓ Vouchers

✓ Financial Reports

✓ Document Storage

✓ Notifications

✓ Audit Logs

✓ Role-Based Access Control

✓ Responsive Design

The application must be secure, scalable, accurate, transparent, and suitable for real-world financial management.