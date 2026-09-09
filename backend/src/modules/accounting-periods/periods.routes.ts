import { Router } from 'express';
import { periodsController } from './periods.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Financial Years
router.get('/years', requirePermission('financial_years.read'), periodsController.getFinancialYears);
router.post('/years', requirePermission('financial_years.manage'), periodsController.createFinancialYear);

// Accounting Periods
router.get('/periods', requirePermission('financial_years.read'), periodsController.getAccountingPeriods);
router.get('/periods/current', requirePermission('financial_years.read'), periodsController.getCurrentPeriod);
router.get('/periods/:id', requirePermission('financial_years.read'), periodsController.getPeriodById);
router.patch('/periods/:id/status', requirePermission('financial_years.manage'), periodsController.updatePeriodStatus);

export default router;
