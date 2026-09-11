import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import permissionsRoutes from './modules/permissions/permissions.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import accountsRoutes from './modules/financial-accounts/accounts.routes';
import incomeCategoriesRoutes from './modules/income-categories/income-categories.routes';
import expenseCategoriesRoutes from './modules/expense-categories/expense-categories.routes';
import incomeRoutes from './modules/incomes/income.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import transactionsRoutes from './modules/transactions/transactions.routes';
import approvalsRoutes from './modules/approvals/approvals.routes';
import fundTransfersRoutes from './modules/fund-transfers/fund-transfers.routes';
import cashFlowRoutes from './modules/cash-flow/cash-flow.routes';
import eventsRoutes from './modules/events/events.routes';
import eventBudgetsRoutes from './modules/event-budgets/event-budgets.routes';
import membershipTypesRoutes from './modules/membership-types/membership-types.routes';
import membersRoutes from './modules/members/members.routes';
import memberDuesRoutes from './modules/member-dues/member-dues.routes';
import memberPaymentsRoutes from './modules/member-payments/member-payments.routes';
import donationsRoutes from './modules/donations/donations.routes';
import sponsorsRoutes from './modules/sponsors/sponsors.routes';
import sponsorshipsRoutes from './modules/sponsorships/sponsorships.routes';
import memberFinancialsRoutes from './modules/member-financials/member-financials.routes';
import coaRoutes from './modules/chart-of-accounts/coa.routes';
import accountingPeriodsRoutes from './modules/accounting-periods/periods.routes';
import journalEntriesRoutes from './modules/journal-entries/journal.routes';
import vouchersRoutes from './modules/vouchers/vouchers.routes';
import accountingReportsRoutes from './modules/accounting-reports/reports.routes';
import financialReportsRoutes from './modules/financial-reports/reports.routes';
import committeesRoutes from './modules/committees/committees.routes';
import documentsRoutes from './modules/documents/documents.routes';
import meetingsRoutes from './modules/meetings/meetings.routes';
import decisionsRoutes from './modules/decisions/decisions.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import assetsRoutes from './modules/assets/assets.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import operationsRoutes from './modules/operations/operations.routes';
import automationRoutes from './modules/automation/automation.routes';
import recurringOperationsRoutes from './modules/recurring-operations/recurring-operations.routes';
import remindersRoutes from './modules/reminders/reminders.routes';
import monthEndRoutes from './modules/month-end/month-end.routes';
import auditLogsRoutes from './modules/audit-logs/audit-logs.routes';
import reconciliationRoutes from './modules/reconciliation/reconciliation.routes';
import internalControlsRoutes from './modules/internal-controls/internal-controls.routes';
import complianceRoutes from './modules/compliance/compliance.routes';
import exceptionsRiskRoutes from './modules/exceptions-risk/exceptions-risk.routes';
import integrationsRoutes from './modules/integrations/integrations.routes';
import webhooksRoutes from './modules/integrations/webhooks.routes';
import settingsRoutes from './modules/settings/settings.routes';
import emailRoutes from './modules/email/email.routes';
import publicReceiptsRoutes from './modules/receipts/public-receipts.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import { errorHandler, getTelemetryMetrics, getRecentErrors } from './middleware/error.middleware';

// Approved static production & development origins
const STATIC_ALLOWED_ORIGINS = new Set([
  'https://invesmentclub.top',
  'https://www.invesmentclub.top',
  'https://api.invesmentclub.top',
  'https://diu-investment-club.vercel.app',
  'https://diu-investment-club-nine.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

// Helper to parse comma-separated CLIENT_URL values from env
const getCustomClientOrigins = (): string[] => {
  if (!env.CLIENT_URL) return [];
  return env.CLIENT_URL.split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter((url) => url.length > 0);
};

// Regex to safely validate Vercel preview deployments (e.g. https://diu-investment-club-xyz.vercel.app)
const VERCEL_PREVIEW_REGEX = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/;

const corsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow requests with no origin (mobile applications, server-to-server curl, health checks, cron)
  if (!origin) {
    return callback(null, true);
  }

  const normalized = origin.trim().replace(/\/+$/, '');

  // 1. Check statically whitelisted production & development origins
  if (STATIC_ALLOWED_ORIGINS.has(normalized)) {
    return callback(null, true);
  }

  // 2. Check dynamic origins defined in CLIENT_URL (comma-separated list)
  const customOrigins = getCustomClientOrigins();
  if (customOrigins.includes(normalized)) {
    return callback(null, true);
  }

  // 3. Check Vercel preview deployments
  if (VERCEL_PREVIEW_REGEX.test(normalized)) {
    return callback(null, true);
  }

  // Unknown origin: reject safely without setting CORS headers
  return callback(null, false);
};

export const createApp = (): Express => {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: corsOriginValidator,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 86400, // 24 hours preflight cache
    })
  );

  // Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Body Parsing (with 50mb limit for documents & attachments)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Strict Financial Audit Deletion Protection Guard (Section 3.C)
  const FINANCIAL_PROTECTED_PREFIXES = [
    '/api/v1/income',
    '/api/v1/expenses',
    '/api/v1/transactions',
    '/api/v1/member-payments',
    '/api/v1/donations',
    '/api/v1/sponsorships',
    '/api/v1/journal-entries',
    '/api/v1/vouchers',
    '/api/v1/receipts',
    '/api/v1/accounts',
  ];

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'DELETE') {
      const isProtected = FINANCIAL_PROTECTED_PREFIXES.some((prefix) =>
        req.path === prefix || req.path.startsWith(`${prefix}/`)
      );
      if (isProtected) {
        res.status(405).json({
          success: false,
          error: {
            code: 'FINANCIAL_AUDIT_PROTECTION',
            message: 'Financial audit protection: Financial records and ledger entries cannot be permanently deleted. Use Void, Cancel, or Reversing Entry workflows to maintain audit integrity.',
          },
        });
        return;
      }
    }
    next();
  });

  // API Health Check (Root & v1) - Ultra-lightweight for probes & load balancers
  const healthResponse = async (_req: Request, res: Response) => {
    const { isSupabaseConfigured, getDbAdmin } = require('./config/supabase');

    let dbOperational = false;
    if (isSupabaseConfigured()) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database ping timeout')), 3000)
        );
        const pingPromise = getDbAdmin()
          .from('system_settings')
          .select('id')
          .limit(1);

        const { error } = (await Promise.race([pingPromise, timeoutPromise])) as any;
        if (!error) {
          dbOperational = true;
        }
      } catch {
        dbOperational = false;
      }
    }

    const statusCode = dbOperational ? 200 : 503;
    res.status(statusCode).json({
      success: dbOperational,
      service: 'DIU Investment Club Finance API',
      status: dbOperational ? 'operational' : 'degraded',
      supabaseConnected: dbOperational,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: '2.5.0',
    });
  };

  app.get('/health', healthResponse);
  app.get('/api/v1/health', healthResponse);
  app.get('/', healthResponse);

  // System Diagnostics Endpoint (Admin & Real-world Monitoring)
  app.get('/api/v1/system/diagnostics', async (_req: Request, res: Response) => {
    const { supabaseClient, isSupabaseConfigured } = require('./config/supabase');
    const startTime = Date.now();

    let dbStatus: 'OPERATIONAL' | 'DATABASE FAILURE' = 'DATABASE FAILURE';
    let dbLatencyMs = 0;
    let emailStatus: 'HEALTHY' | 'EMAIL FAILURE' = 'HEALTHY';
    let emailTelemetry = { sentLast24h: 0, failedLast24h: 0, pendingLast24h: 0 };
    let bgJobsStatus: 'ACTIVE' | 'BACKGROUND JOB FAILURE' = 'ACTIVE';

    // 1. Check Database Connectivity
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const pingStart = Date.now();
        const { error } = await supabaseClient.from('profiles').select('id', { count: 'exact', head: true });
        dbLatencyMs = Date.now() - pingStart;
        if (!error) {
          dbStatus = 'OPERATIONAL';
        }
      } catch {
        dbStatus = 'DATABASE FAILURE';
      }

      // 2. Check Email Subsystem Telemetry (Last 24 Hours)
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: logs } = await supabaseClient
          .from('email_logs')
          .select('status')
          .gte('created_at', since);

        if (logs && Array.isArray(logs)) {
          emailTelemetry.sentLast24h = logs.filter((l: any) => l.status === 'SENT').length;
          emailTelemetry.failedLast24h = logs.filter((l: any) => l.status === 'FAILED').length;
          emailTelemetry.pendingLast24h = logs.filter((l: any) => l.status === 'PENDING').length;

          if (emailTelemetry.failedLast24h > 5 && emailTelemetry.failedLast24h > emailTelemetry.sentLast24h) {
            emailStatus = 'EMAIL FAILURE';
          }
        }
      } catch {
        emailStatus = 'EMAIL FAILURE';
      }
    }

    // 3. Telemetry Metrics & Memory
    const telemetry = getTelemetryMetrics();
    const recentErrors = getRecentErrors(10);
    const mem = process.memoryUsage();

    res.status(200).json({
      success: true,
      service: 'DIU Investment Club ERP Monitoring',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
      indicators: {
        apiStatus: 'OPERATIONAL',
        databaseStatus: dbStatus,
        emailStatus: emailStatus,
        backgroundJobsStatus: bgJobsStatus,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: 'Supabase PostgreSQL',
      },
      emailSystem: {
        status: emailStatus,
        provider: 'Resend',
        sender: 'noreply@invesmentclub.top',
        telemetry24h: emailTelemetry,
      },
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
      telemetry,
      recentErrors,
    });
  });

  // Public Digital Receipts v1 (Unauthenticated, Secure Token, Rate Limited)
  app.use('/api/v1/public/receipts', publicReceiptsRoutes);

  // REST Modules v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/roles', rolesRoutes);
  app.use('/api/v1/permissions', permissionsRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/accounts', accountsRoutes);
  app.use('/api/v1/income-categories', incomeCategoriesRoutes);
  app.use('/api/v1/expense-categories', expenseCategoriesRoutes);
  app.use('/api/v1/income', incomeRoutes);
  app.use('/api/v1/expenses', expensesRoutes);
  app.use('/api/v1/transactions', transactionsRoutes);
  app.use('/api/v1/approvals', approvalsRoutes);
  app.use('/api/v1/fund-transfers', fundTransfersRoutes);
  app.use('/api/v1/cash-flow', cashFlowRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/event-budgets', eventBudgetsRoutes);
  app.use('/api/v1/membership-types', membershipTypesRoutes);
  app.use('/api/v1/members', membersRoutes);
  app.use('/api/v1/departments', departmentsRoutes);
  app.use('/api/v1/member-dues', memberDuesRoutes);
  app.use('/api/v1/member-payments', memberPaymentsRoutes);
  app.use('/api/v1/donations', donationsRoutes);
  app.use('/api/v1/sponsors', sponsorsRoutes);
  app.use('/api/v1/sponsorships', sponsorshipsRoutes);
  app.use('/api/v1/member-financials', memberFinancialsRoutes);

  // Phase 6: Advanced Accounting System
  app.use('/api/v1/chart-of-accounts', coaRoutes);
  app.use('/api/v1/financial-years', accountingPeriodsRoutes);
  app.use('/api/v1/accounting-periods', accountingPeriodsRoutes);
  app.use('/api/v1/journal-entries', journalEntriesRoutes);
  app.use('/api/v1/vouchers', vouchersRoutes);
  app.use('/api/v1/accounting', accountingReportsRoutes);

  // Phase 7: Advanced Financial Reporting & Analytics
  app.use('/api/v1/financial-reports', financialReportsRoutes);

  // Phase 8: Club Operations & Governance System
  app.use('/api/v1/committees', committeesRoutes);
  app.use('/api/v1/documents', documentsRoutes);
  app.use('/api/v1/meetings', meetingsRoutes);
  app.use('/api/v1/decisions', decisionsRoutes);
  app.use('/api/v1/tasks', tasksRoutes);
  app.use('/api/v1/assets', assetsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/operations', operationsRoutes);

  // Phase 9: Advanced Automation & Smart Workflow System
  app.use('/api/v1/automation', automationRoutes);
  app.use('/api/v1/recurring-operations', recurringOperationsRoutes);
  app.use('/api/v1/reminders', remindersRoutes);
  app.use('/api/v1/month-end', monthEndRoutes);

  // Phase 10: Advanced Audit, Compliance, Internal Control & Integrations
  app.use('/api/v1/audit-logs', auditLogsRoutes);
  app.use('/api/v1/reconciliation', reconciliationRoutes);
  app.use('/api/v1/internal-controls', internalControlsRoutes);
  app.use('/api/v1/compliance', complianceRoutes);
  app.use('/api/v1/exceptions-risk', exceptionsRiskRoutes);
  app.use('/api/v1/integrations', integrationsRoutes);
  app.use('/api/v1/webhooks', webhooksRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/email', emailRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
