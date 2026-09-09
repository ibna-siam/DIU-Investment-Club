import { Router } from 'express';
import { monthEndController } from './month-end.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('month_end.read'), monthEndController.getChecklists);
router.get('/current', requirePermission('month_end.read'), monthEndController.getOrCreateCurrentMonth);
router.get('/:id', requirePermission('month_end.read'), monthEndController.getChecklistById);
router.post('/:id/verify', requirePermission('month_end.manage'), monthEndController.runVerification);
router.patch('/:id/items/:itemId', requirePermission('month_end.manage'), monthEndController.toggleItem);
router.post('/:id/complete', requirePermission('month_end.manage'), monthEndController.completeChecklist);

export default router;
