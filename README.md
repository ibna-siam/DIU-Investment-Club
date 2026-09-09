# DIU Investment Club Financial Management System & ERP

> **Enterprise Financial Management, Multi-Tier Accounting, and Governance Platform for DIU Investment Club**  
> *Production Ready • Audited • Security Hardened • Performance Optimized*

---

## 1. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       Next.js 14 Frontend (Port 3000)                   │
│   Tailwind CSS + shadcn/ui + Lucide + TanStack Query + Zod + Middleware │
│   • 80 Production Routes (Static + Dynamic SSR / Edge Prerendered)      │
│   • Multi-tier Role-Based Access Control (RBAC) UI Filtering            │
│   • Automatic 401 Session Interceptor & Enterprise HTTP Headers        │
│   • Live Financial Metrics, Double-Entry Reports & Operations Dashboards│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API v1 (Bearer JWT)
┌────────────────────────────────────▼────────────────────────────────────┐
│                    Node.js / Express Backend (Port 5000)                │
│   TypeScript + Helmet + Multer + Magic Byte Inspector + Financial Engine│
│   • Strict Financial Audit Deletion Protection Guard (HTTP 405 Block)   │
│   • 24-Hour Notification Deduplication & PostgreSQL State Persistence   │
│   • Document Upload with Magic Byte Anti-Spoofing & Signed URLs         │
│   • Multi-tier Approval Workflows & Atomic Ledger Transaction Balance   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ PostgreSQL + RLS + Secret Bypass
┌────────────────────────────────────▼────────────────────────────────────┐
│                         Supabase / PostgreSQL                           │
│   • Row Level Security (RLS) with 25 Optimized `auth.uid()` Subqueries  │
│   • Backend Service Role Bypass via Validated `x-backend-secret` Header │
│   • 8 Composite Covering B-Tree Indexes Across Core Transaction Tables │
│   • Atomic Stored Procedures (`complete_income_transaction`, etc.)      │
│   • Private Storage Buckets (`documents`, `attachments`)                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Functional Modules

The platform delivers 53 production-ready modules across four operational pillars:

1. **Financial Operations & Treasury**:
   - Multi-account management (Bank, Cash, Mobile Money/bKash/Nagad)
   - Real-time Income & Expense tracking with atomic balance debit/credit
   - Fund transfers with dual-leg balance verification
   - Financial audit deletion protection (Records are immutable; cancellation requires void/reversal)

2. **Advanced Accounting (Double-Entry Engine)**:
   - Dynamic Chart of Accounts (COA) with standard 5-digit account codes
   - Automated double-entry Journal Entries & Payment Vouchers
   - General Ledger, Subsidiary Ledger, Trial Balance, Income Statement, Balance Sheet, Cash Flow

3. **Membership & Revenue Management**:
   - Tiered membership management (General, Lifetime, Executive, Honorary)
   - Member dues generation, automated tracking, and payment collection
   - Automated due status transitions (`PENDING` → `PAID`) upon verified receipt
   - Instant PDF receipt issuance and member financial history

4. **Club Governance, Documents & Automation**:
   - Secure governance document repository with magic-byte anti-spoofing
   - Soft-deletion trash management with time-limited signed download URLs
   - Event budgeting, sponsorship tracking, and multi-tier approval workflows
   - Smart notifications pipeline with 24-hour deduplication filter

---

## 3. Security & Hardening Controls

- **Magic Byte Signature Inspection**: Uploads are inspected at the binary header level (`%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`, `RIFF/WEBP`, `PK\x03\x04`). Executables, scripts, and double-extension files (`.php.pdf`, `.exe`) are rejected with HTTP 400.
- **Financial Audit Immutability**: HTTP `DELETE` requests to `/income`, `/expenses`, `/transactions`, `/member-payments`, `/journal-entries`, and `/vouchers` are intercepted and blocked with HTTP `405 Method Not Allowed`.
- **Database Row Level Security (RLS)**: Public tables enforce RLS. Anonymous/unauthenticated direct calls receive 0 records or permission denied.
- **Backend Secret Bypass**: Backend services communicate securely with PostgreSQL using a cryptographic `x-backend-secret` header.
- **Session Auto-Expiry**: Frontend API client automatically detects HTTP 401, clears invalid tokens from local storage, and redirects to `/login?session_expired=true`.
- **HTTP Security Headers**: Complete enterprise headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 4. Environment Setup

### Prerequisites
- Node.js v18+ (tested on Node.js v24 LTS)
- npm v9+

### Backend Configuration (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Supabase Credentials
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Security
JWT_SECRET=diu_investment_club_super_secure_secret_token_2026_key
```

### Frontend Configuration (`frontend/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME="DIU Investment Club Finance"
```

---

## 5. Development & Production Commands

### Running Locally
```bash
# Terminal 1: Backend API (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend App (Port 3000)
cd frontend
npm run dev
```

### Production Build Verification
```bash
# Build Backend (Compiles TypeScript to dist/)
cd backend
npm run build

# Build Frontend (Next.js 14 production bundle)
cd frontend
npm run build
```

---

## 6. Automated Quality Assurance & Verification Test Suites

All test suites are automated and located in `backend/scripts/`:

### Master Phase 12 Final QA Test Suite (38/38 Passing)
Executes end-to-end operational cycles: Authentication, Database foreign key consistency (0 orphaned records), Income/Expense cycle with atomic balance adjustments, Member registration, Dues & Payment collection with receipt verification, Document magic byte validation, and Notifications 24h deduplication:
```bash
node backend/scripts/phase12_final_qa_test.js
```

### Phase 11 Security & Performance Test Suite (24/24 Passing)
Validates route protection, RBAC boundaries, anonymous RLS blocks, file upload anti-spoofing, signed URLs, financial immutability, and covering indexes latency:
```bash
node backend/scripts/phase11_security_performance_test.js
```

### System Improvements & Regression Test Suite (19/19 Passing)
Validates deletion protection guards, soft deletion, trash recovery, and notification permanence:
```bash
node backend/scripts/verify_system_improvements.js
```

### Production Data Cleanup & Audit Script
Audits and safely purges ephemeral test records and trash documents while preserving system roles, permissions, chart of accounts, and audit logs:
```bash
# Dry run audit mode (read-only)
node backend/scripts/production_data_cleanup.js --dry-run

# Commit mode
node backend/scripts/production_data_cleanup.js --commit
```

---

## 7. Pre-Seeded Super Admin Credentials
- **Email**: `admin@diu.edu.bd`
- **Password**: `Password123!`
- **Role**: `Super Admin`
