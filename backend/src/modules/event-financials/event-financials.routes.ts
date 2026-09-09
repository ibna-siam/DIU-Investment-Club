import { Router } from 'express';
import { eventFinancialsController } from './event-financials.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/summary', requirePermission('events', 'read'), eventFinancialsController.getSummary);
router.get('/budget-vs-actual', requirePermission('events', 'read'), eventFinancialsController.getBudgetVsActual);
router.get('/ledger', requirePermission('events', 'read'), eventFinancialsController.getLedger);

export default router;
