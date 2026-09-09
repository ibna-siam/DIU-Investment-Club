import { Router } from 'express';
import { memberDuesController } from './member-dues.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('dues.read'), memberDuesController.getDues);
router.post('/', requirePermission('dues.create'), memberDuesController.createDue);
router.get('/:id', requirePermission('dues.read'), memberDuesController.getDueById);
router.post('/:id/waive', requirePermission('dues.waive'), memberDuesController.waiveDue);
router.post('/:id/cancel', requirePermission('dues.update'), memberDuesController.cancelDue);

export default router;
