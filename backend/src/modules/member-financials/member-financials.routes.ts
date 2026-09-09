import { Router } from 'express';
import { memberFinancialsController } from './member-financials.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/metrics', requirePermission('member_financials.read'), memberFinancialsController.getMetrics);
router.get('/revenue-overview', requirePermission('member_financials.read'), memberFinancialsController.getRevenueOverview);

export default router;
