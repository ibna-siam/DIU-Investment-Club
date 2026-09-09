import { Router } from 'express';
import { CashFlowController } from './cash-flow.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();
const controller = new CashFlowController();

router.use(authenticate);

router.get('/', requirePermission('cash_flow', 'read'), controller.getTimeline);
router.get('/summary', requirePermission('cash_flow', 'read'), controller.getSummary);
router.get('/trend', requirePermission('cash_flow', 'read'), controller.getTrend);

export default router;
