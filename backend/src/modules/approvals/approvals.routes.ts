import { Router } from 'express';
import { ApprovalsController } from './approvals.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();
const controller = new ApprovalsController();

router.use(authenticate);

router.get('/', requirePermission('approvals', 'read'), controller.list);
router.get('/:id', requirePermission('approvals', 'read'), controller.getById);
router.post('/:id/action', requirePermission('approvals', 'approve'), controller.processAction);

export default router;
