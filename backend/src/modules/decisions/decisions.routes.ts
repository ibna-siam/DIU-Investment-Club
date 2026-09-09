import { Router } from 'express';
import { decisionsController } from './decisions.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('decisions.read'), decisionsController.getDecisions);
router.post('/', requirePermission('decisions.create'), decisionsController.createDecision);
router.get('/:id', requirePermission('decisions.read'), decisionsController.getDecisionById);
router.put('/:id', requirePermission('decisions.create'), decisionsController.updateDecision);
router.patch('/:id', requirePermission('decisions.create'), decisionsController.updateDecision);
router.patch('/:id/status', requirePermission('decisions.create'), decisionsController.updateDecision);
router.post('/:id/create-action-item', requirePermission('tasks.create'), decisionsController.createActionItem);

export default router;
