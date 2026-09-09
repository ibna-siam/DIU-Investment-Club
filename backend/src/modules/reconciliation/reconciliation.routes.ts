import { Router } from 'express';
import { reconciliationController } from './reconciliation.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Cash Reconciliations
router.get('/cash/accounts', requirePermission('reconciliation.read'), reconciliationController.getCashAccounts);
router.get('/cash', requirePermission('reconciliation.read'), reconciliationController.listCashReconciliations);
router.post('/cash', requirePermission('reconciliation.create'), reconciliationController.createCashReconciliation);

// Bank Reconciliations
router.get('/bank/accounts', requirePermission('reconciliation.read'), reconciliationController.getBankAccounts);
router.get('/bank', requirePermission('reconciliation.read'), reconciliationController.listBankReconciliations);
router.post('/bank', requirePermission('reconciliation.create'), reconciliationController.createBankReconciliation);
router.get('/bank/:id', requirePermission('reconciliation.read'), reconciliationController.getBankReconciliationById);
router.post('/bank/items/:itemId/match', requirePermission('reconciliation.create'), reconciliationController.matchItem);
router.post('/bank/items/:itemId/unmatch', requirePermission('reconciliation.create'), reconciliationController.unmatchItem);
router.patch('/bank/:id/status', requirePermission('reconciliation.approve'), reconciliationController.updateStatus);

export default router;
