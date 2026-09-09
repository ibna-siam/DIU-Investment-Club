import { Router } from 'express';
import { financialReportsController } from './reports.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/income-statement',
  requirePermission('income_statement.read'),
  financialReportsController.getIncomeStatement
);

router.get(
  '/balance-sheet',
  requirePermission('balance_sheet.read'),
  financialReportsController.getBalanceSheet
);

router.get(
  '/cash-flow-statement',
  requirePermission('cash_flow_statement.read'),
  financialReportsController.getCashFlowStatement
);

router.get(
  '/budget-vs-actual',
  requirePermission('budget_vs_actual.read'),
  financialReportsController.getBudgetVsActual
);

router.get(
  '/event-reports',
  requirePermission('event_financial_reports.read'),
  financialReportsController.getEventReports
);

router.get(
  '/member-revenue',
  requirePermission('member_revenue_reports.read'),
  financialReportsController.getMemberRevenue
);

router.get(
  '/donation-reports',
  requirePermission('donation_reports.read'),
  financialReportsController.getDonationReports
);
router.get(
  '/donations',
  requirePermission('donation_reports.read'),
  financialReportsController.getDonationReports
);

router.get(
  '/sponsorship-reports',
  requirePermission('sponsorship_reports.read'),
  financialReportsController.getSponsorshipReports
);
router.get(
  '/sponsorships',
  requirePermission('sponsorship_reports.read'),
  financialReportsController.getSponsorshipReports
);

router.get(
  '/analytics',
  requirePermission('financial_analytics.read'),
  financialReportsController.getAnalytics
);

router.post(
  '/snapshots',
  requirePermission('financial_report_snapshots.manage'),
  financialReportsController.createSnapshot
);

router.get(
  '/snapshots',
  requirePermission('financial_report_snapshots.manage'),
  financialReportsController.getSnapshots
);

export default router;
