import { Router } from 'express';
import { FundTransfersController } from './fund-transfers.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();
const controller = new FundTransfersController();

router.use(authenticate);

router.get('/', requirePermission('fund_transfers', 'read'), controller.list);
router.get('/:id', requirePermission('fund_transfers', 'read'), controller.getById);
router.post('/', requirePermission('fund_transfers', 'create'), controller.create);

export default router;
