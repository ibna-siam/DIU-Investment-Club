import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', requirePermission('accounting.read'), reportsController.getDashboardSummary);
router.get('/trial-balance', requirePermission('trial_balance.read'), reportsController.getTrialBalance);
router.get('/general-ledger', requirePermission('general_ledger.read'), reportsController.getGeneralLedger);
router.get('/subsidiary-ledger', requirePermission('subsidiary_ledger.read'), reportsController.getSubsidiaryLedger);
router.get('/mappings', requirePermission('accounting.read'), reportsController.getMappings);
router.post('/sync-historical', requirePermission('accounting.manage'), reportsController.syncHistorical);

export default router;
