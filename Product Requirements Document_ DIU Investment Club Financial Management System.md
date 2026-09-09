# Product Requirements Document (PRD)

## DIU Investment Club Financial Management System

**Project Type:** Web Application  
**Organization:** DIU Investment Club  
**Primary Department:** Finance & Treasury  
**Primary Users:** Treasurer, President, General Secretary, Executive Members, Event Managers, Auditors  
**Version:** 1.0

---

# 1. Executive Summary

DIU Investment Club Financial Management System is a centralized web-based financial and accounting management application designed specifically for managing the complete financial operations of the DIU Investment Club.

The system will allow authorized club members to manage and monitor all financial activities from one centralized platform, including income, expenses, event budgets, cash flow, bank and mobile financial accounts, member payments, approvals, vouchers, documents, reports, and accounting records.

The primary goal of the application is to eliminate manual spreadsheets, scattered financial records, paper-based expense tracking, and communication gaps between club executives.

The system must provide transparency, accountability, security, and real-time financial visibility for the club.

This application should function as a lightweight but professional accounting and financial management system customized for a university club environment.

---

# 2. Problem Statement

Currently, club financial activities are often managed using spreadsheets, manual records, messaging applications, and separate documents.

This creates several problems:

- Financial information is scattered across multiple locations.
- Expense records may be difficult to track.
- Event budgets are difficult to monitor in real time.
- Approval processes are not properly documented.
- Cash and bank balances may not be instantly visible.
- Bills and receipts can be lost.
- Financial transparency can be limited.
- Previous transactions can be difficult to audit.
- Generating financial reports requires significant manual work.
- Different executives may have access to inconsistent information.

The DIU Investment Club Financial Management System will solve these problems by creating one centralized and secure financial platform.

---

# 3. Product Vision

Build a modern, secure, transparent, and easy-to-use financial management platform that enables the DIU Investment Club to manage all financial activities, transactions, budgets, events, approvals, and accounting records from one place.

The system should provide:

- Complete financial transparency
- Accurate transaction tracking
- Real-time financial balance
- Structured approval workflows
- Event-level financial management
- Professional accounting records
- Secure document storage
- Automated financial reports
- Role-based access control
- Full audit history

---

# 4. Product Goals

## Primary Goals

### Goal 1: Centralize Financial Operations

All financial activities must be managed from one platform.

### Goal 2: Improve Financial Transparency

Authorized executives should be able to view appropriate financial information based on their role.

### Goal 3: Reduce Manual Work

The system should automatically calculate balances, totals, cash flow, and reports.

### Goal 4: Improve Accountability

Every financial action must have a user record, timestamp, and audit trail.

### Goal 5: Improve Event Financial Management

Every club event should have its own budget, income, expenses, and financial summary.

### Goal 6: Support Professional Accounting

The platform should support accounting concepts such as:

- Chart of Accounts
- Journal Entries
- Debit and Credit
- General Ledger
- Cash Flow
- Financial Statements

---

# 5. Target Users

The application will support multiple user types.

---

## 5.1 Super Administrator

The highest-level system administrator.

### Permissions

- Full system access
- Manage users
- Manage roles
- Manage permissions
- View all financial records
- Manage system settings
- Manage categories
- View audit logs

---

## 5.2 Treasurer

The Treasurer is the primary financial manager of the club.

### Permissions

- Manage income
- Manage expenses
- Manage transactions
- Manage cash accounts
- Manage bank accounts
- Manage mobile banking accounts
- Create event budgets
- Review expense requests
- Generate financial reports
- Create vouchers
- Manage financial categories
- Review cash flow
- Manage documents

---

## 5.3 President

### Permissions

- View financial dashboard
- View financial reports
- Approve major expenses
- Approve event budgets
- View event financial reports
- View cash flow

The President should not automatically have permission to edit accounting records unless explicitly granted.

---

## 5.4 General Secretary

### Permissions

- Create events
- View event budgets
- Submit budget requests
- View event financial summaries
- Submit expense requests

---

## 5.5 Event Manager

### Permissions

- View assigned events
- Submit expense requests
- Upload bills
- View event budget
- View event expenses

---

## 5.6 Executive Member

### Permissions

- Submit expense reimbursement requests
- Upload receipts
- View personal requests
- View approval status

---

## 5.7 Auditor / Finance Advisor

### Permissions

- View financial records
- View transactions
- View reports
- View audit logs
- Review accounting records

### Restrictions

- Cannot edit transactions
- Cannot delete transactions
- Cannot modify balances

---

# 6. User Authentication and Security

The system must include a secure authentication system.

## Authentication Features

- Email and password login
- Secure password hashing
- Password reset
- Email verification
- Session management
- Logout from all devices
- Account activation/deactivation

---

## Role-Based Access Control

Every user must have permissions based on their assigned role.

Example:

```text
Treasurer
├── Income: Create/Edit
├── Expenses: Create/Edit
├── Reports: View
└── Users: Limited Access

President
├── Financial Reports: View
├── Expenses: Approve
└── System Settings: No Access
```

The system must prevent users from accessing pages or APIs without permission.

---

# 7. Dashboard

The dashboard should provide a complete financial overview.

## Dashboard Cards

- Total Available Balance
- Cash in Hand
- Bank Balance
- Mobile Banking Balance
- Total Income
- Total Expenses
- Current Month Income
- Current Month Expenses
- Pending Approvals
- Upcoming Event Budget

---

## Dashboard Charts

### Income vs Expense

Monthly comparison chart.

### Monthly Cash Flow

Shows money entering and leaving the club.

### Expense by Category

Example:

- Event
- Marketing
- Food
- Transportation
- Printing

### Income Sources

Example:

- Membership Fees
- Sponsorship
- Donations
- Event Registration

---

## Recent Activity

Display:

- Latest transactions
- Latest expense requests
- Recent approvals
- Recent payments

---

# 8. Financial Account Management

The system must support multiple financial accounts.

## Account Types

### Cash

Example:

- Cash in Hand
- Petty Cash

### Bank

Example:

- Club Bank Account

### Mobile Financial Services

- bKash
- Nagad
- Rocket

---

## Account Features

Each account must display:

- Account Name
- Account Type
- Current Balance
- Opening Balance
- Total Credits
- Total Debits
- Transaction History

---

# 9. Income Management

The system must allow authorized users to record and manage all club income.

## Income Categories

Default categories:

- Membership Fee
- Monthly Subscription
- Event Registration
- Sponsorship
- Donation
- University Funding
- Investment Return
- Merchandise Sales
- Other Income

Administrators should be able to create custom categories.

---

## Income Transaction Fields

Each income transaction must contain:

- Transaction ID
- Date
- Income Category
- Amount
- Received From
- Account Received To
- Payment Method
- Reference Number
- Description
- Related Event
- Supporting Document
- Created By

---

## Income Status

- Draft
- Pending
- Approved
- Completed
- Cancelled

---

# 10. Expense Management

The system must allow authorized users to manage all club expenses.

## Default Expense Categories

- Event Expense
- Food and Refreshments
- Venue
- Decoration
- Marketing
- Printing
- Transportation
- Guest Honorarium
- Equipment
- Office Expense
- Technology
- Miscellaneous

Categories must be customizable.

---

## Expense Fields

Each expense must contain:

- Expense ID
- Expense Date
- Expense Category
- Amount
- Vendor Name
- Payment Account
- Payment Method
- Related Event
- Description
- Bill/Invoice
- Requested By
- Approved By
- Payment Status

---

# 11. Expense Approval Workflow

Expenses should support an approval workflow.

## Workflow

```text
Expense Request

        ↓

Pending Review

        ↓

Treasurer Review

        ↓

Approval Required

        ↓

President Approval

        ↓

Approved

        ↓

Payment Processing

        ↓

Completed
```

---

## Approval Actions

Authorized users can:

- Approve
- Reject
- Request Changes
- Add Comments

Every approval action must be stored in the audit history.

---

# 12. Event Financial Management

Every event should have its own financial management section.

## Event Information

- Event Name
- Event Description
- Event Date
- Start Date
- End Date
- Location
- Event Manager
- Expected Participants
- Event Status

---

## Event Budget

Each event can have:

- Proposed Budget
- Approved Budget
- Total Expenses
- Remaining Budget
- Event Income
- Total Revenue
- Profit/Loss

---

## Event Financial Dashboard

Example:

```text
Event: Investment Summit 2026

Approved Budget: ৳50,000

Expenses: ৳35,000

Remaining: ৳15,000

Income: ৳70,000

Net Result: ৳35,000 Surplus
```

---

## Budget Alerts

The system should generate alerts when:

- Expenses reach 80% of the budget
- Expenses exceed the approved budget
- Budget approval is pending

---

# 13. Fund Transfer Management

The system must support transfers between financial accounts.

Example:

```text
Cash Account

        ↓

Bank Account

        ↓

bKash Account
```

---

## Transfer Fields

- Transfer ID
- From Account
- To Account
- Amount
- Date
- Description
- Reference Number
- Created By

The system must automatically update balances.

---

# 14. Cash Flow Management

The system must automatically calculate cash flow.

## Cash Inflow

- Membership Fees
- Sponsorship
- Donations
- Event Revenue
- Other Income

## Cash Outflow

- Event Expenses
- Operational Expenses
- Payments

---

## Cash Flow Formula

```text
Opening Balance

+ Total Cash Inflow

- Total Cash Outflow

= Closing Balance
```

---

# 15. Member Payment Management

The system should manage club member financial contributions.

## Payment Types

- Membership Fee
- Monthly Subscription
- Event Fee
- Special Contribution

---

## Member Payment Information

- Member Name
- Student ID
- Payment Type
- Amount
- Paid Amount
- Due Amount
- Payment Date
- Payment Method
- Status

---

## Payment Status

- Paid
- Partial
- Pending
- Overdue

---

# 16. Accounting System

The system should include professional accounting features.

---

## 16.1 Chart of Accounts

The system must support customizable accounts.

### Assets

- Cash
- Bank
- Mobile Banking

### Income

- Membership Income
- Sponsorship Income
- Event Income

### Expenses

- Event Expenses
- Marketing Expenses
- Transportation Expenses

---

# 17. Journal Entry System

The system should support double-entry accounting.

Each journal entry must contain:

- Journal Entry ID
- Date
- Description
- Reference
- Debit Account
- Credit Account
- Amount
- Created By
- Approval Status

---

## Accounting Rule

```text
Total Debit = Total Credit
```

The system must prevent unbalanced journal entries.

---

# 18. General Ledger

Each account should have an automatically generated ledger.

Example:

```text
Account: Cash

Date | Description | Debit | Credit | Balance
```

The balance should automatically update based on transactions.

---

# 19. Voucher Management

The system must support financial vouchers.

## Voucher Types

- Payment Voucher
- Receipt Voucher
- Journal Voucher
- Contra Voucher

---

## Voucher Features

Each voucher must include:

- Voucher Number
- Voucher Type
- Date
- Amount
- Description
- Prepared By
- Approved By
- Supporting Documents

Users should be able to:

- Print Voucher
- Download PDF
- View Voucher

---

# 20. Document Management

Users must be able to upload financial documents.

## Supported Documents

- Invoice
- Bill
- Receipt
- Payment Screenshot
- PDF
- Supporting Documents

Documents should be linked to relevant transactions.

---

# 21. Financial Reports

The system must generate automated financial reports.

## Reports

### Income Report

Filter by:

- Date
- Category
- Event

### Expense Report

Filter by:

- Date
- Category
- Event

### Cash Flow Report

Display:

- Opening Balance
- Cash Inflow
- Cash Outflow
- Closing Balance

### Event Financial Report

Display:

- Budget
- Income
- Expenses
- Remaining Budget
- Surplus/Deficit

### Monthly Financial Report

Display monthly financial performance.

### Yearly Financial Report

Display annual financial performance.

---

# 22. Report Export

Reports should support:

- PDF Export
- Excel Export
- Print

---

# 23. Notifications

The system should include a notification system.

## Notification Types

- New Expense Request
- Expense Approved
- Expense Rejected
- Budget Approval Required
- Payment Received
- Budget Limit Warning
- Low Balance Warning
- Monthly Report Ready

Notifications should include:

- Title
- Description
- Timestamp
- Related Link
- Read/Unread Status

---

# 24. Audit Log

Every important action must be recorded.

## Audit Information

- User
- Action
- Module
- Previous Value
- New Value
- Date
- Time
- IP Address

Example:

```text
User: Treasurer

Action: Updated Expense

Expense ID: EXP-2026-00125

Time: 03:45 PM
```

---

# 25. Search and Filtering

The system must provide powerful search functionality.

Users should filter transactions by:

- Date Range
- Transaction Type
- Category
- Event
- Amount
- Account
- Payment Method
- Status

---

# 26. User Interface Requirements

The interface should be:

- Modern
- Professional
- Clean
- Finance-focused
- Easy to understand
- Responsive

---

## Desktop Layout

### Sidebar

```text
Dashboard

Financial Management
├── Income
├── Expenses
├── Transactions
├── Cash Flow
└── Fund Transfers

Accounts
├── Chart of Accounts
├── Cash Accounts
├── Bank Accounts
└── Mobile Banking

Events
├── All Events
├── Budgets
├── Event Expenses
└── Event Reports

Members
├── Members
├── Payments
└── Due Payments

Accounting
├── Journal Entries
├── General Ledger
└── Vouchers

Approvals

Reports

Documents

Notifications

Settings
```

---

# 27. Mobile Requirements

The system must be fully responsive.

Important mobile features:

- Quick Add Transaction
- Quick Add Expense
- View Balance
- Approve Requests
- Upload Bills
- View Notifications

The mobile interface should prioritize speed and usability.

---

# 28. System Settings

Administrators should manage:

## Club Information

- Club Name
- Logo
- Email
- Phone
- Address

## Financial Settings

- Currency
- Default Financial Year
- Transaction Prefix

Example:

```text
Income: INC-2026-0001

Expense: EXP-2026-0001

Voucher: VOU-2026-0001
```

---

# 29. Technical Requirements

## Recommended Frontend

- React.js
- Next.js
- TypeScript
- Tailwind CSS

---

## Recommended Backend

- Node.js
- Express.js or NestJS
- TypeScript

---

## Database

Recommended:

- PostgreSQL

Possible platform:

- Supabase PostgreSQL

---

## Authentication

Possible options:

- Supabase Auth
- JWT Authentication

---

## File Storage

Recommended:

- Supabase Storage

or

- Cloudinary

---

# 30. Database Core Entities

The database should include the following major entities:

```text
Users
Roles
Permissions

Financial Accounts

Income Categories
Expense Categories

Income Transactions
Expense Transactions

Events
Event Budgets

Member Payments

Fund Transfers

Chart of Accounts
Journal Entries
Journal Entry Lines

General Ledger

Vouchers

Documents

Notifications

Approvals

Audit Logs

System Settings
```

---

# 31. Core Database Relationships

```text
Users
│
├── Income Transactions
│
├── Expense Requests
│
├── Approvals
│
└── Audit Logs


Events
│
├── Event Budget
│
├── Income
│
└── Expenses


Financial Accounts
│
├── Income Transactions
├── Expenses
└── Fund Transfers


Chart of Accounts
│
└── Journal Entries
```

---

# 32. Non-Functional Requirements

The system must provide:

## Performance

- Fast dashboard loading
- Optimized database queries
- Pagination for large transaction lists
- Efficient report generation

## Security

- Secure authentication
- Role-based authorization
- Input validation
- Protected APIs
- Password hashing
- Audit logging

## Reliability

Financial calculations must always be accurate.

## Scalability

The system should support:

- Increasing number of members
- Increasing transaction records
- Multiple events
- Future club expansion

---

# 33. Important Business Rules

### Rule 1

Financial balances must never be manually changed without a recorded transaction.

### Rule 2

Deleted transactions should preferably be soft-deleted and recorded in audit logs.

### Rule 3

Every expense must belong to a valid expense category.

### Rule 4

Journal Entries must always satisfy:

```text
Total Debit = Total Credit
```

### Rule 5

Fund transfers must update both accounts.

### Rule 6

Event expenses should automatically affect the event budget.

### Rule 7

Every approval action must be recorded.

### Rule 8

Unauthorized users must not access restricted financial information.

---

# 34. MVP Development Scope

The first version should include:

### Authentication

- Login
- User Roles
- Permissions

### Dashboard

- Financial Overview
- Balance Cards
- Charts

### Financial Management

- Income
- Expenses
- Accounts
- Transfers

### Events

- Event Creation
- Event Budget
- Event Expenses

### Approvals

- Expense Approval

### Reports

- Income Report
- Expense Report
- Cash Flow Report

### Documents

- Bill Upload
- Receipt Upload

---

# 35. Future Features

Future versions may include:

- Automated WhatsApp Notifications
- SMS Notifications
- Email Notifications
- AI Financial Insights
- Financial Forecasting
- Budget Prediction
- OCR Bill Scanning
- Automatic Receipt Reading
- Investment Portfolio Tracking
- Sponsor Management
- Multi-Club Support
- Mobile Application
- QR Code Payment
- Online Payment Gateway

---

# 36. Success Metrics

The application will be considered successful if:

- All club transactions are recorded digitally.
- Financial reports can be generated instantly.
- Event budgets are monitored in real time.
- Financial data is accessible according to user roles.
- Approval history is transparent.
- Cash and account balances are accurate.
- Audit records are available.
- Manual spreadsheet dependency is significantly reduced.

---

# 37. Final Product Requirements

The final application must function as a centralized financial operating system for the DIU Investment Club.

It should not be designed as a simple income and expense tracker.

The system must provide:

- Professional financial management
- Event financial tracking
- Accounting functionality
- Secure user management
- Approval workflows
- Real-time balances
- Automated reports
- Audit logs
- Document management
- Role-based access

The user experience should be modern, professional, simple, and suitable for a university organization.

The system must maintain financial accuracy, transparency, accountability, and security across all modules.

---

# Final Vision

The DIU Investment Club Financial Management System should become the central financial platform of the organization.

From collecting membership fees to managing a major university event budget, recording expenses, approving payments, generating vouchers, monitoring cash flow, and producing professional financial reports, everything should be managed through one secure and integrated platform.