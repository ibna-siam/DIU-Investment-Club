import { Router } from 'express';
import { internalControlsController } from './internal-controls.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/rules', requirePermission('internal_controls.read'), internalControlsController.listRules);
router.post('/rules', requirePermission('internal_controls.manage'), internalControlsController.createRule);
router.put('/rules/:id', requirePermission('internal_controls.manage'), internalControlsController.updateRule);
router.patch('/rules/:id/toggle', requirePermission('internal_controls.manage'), internalControlsController.toggleRule);
router.delete('/rules/:id', requirePermission('internal_controls.manage'), internalControlsController.deleteRule);

// SOD and Overrides
router.post('/check-sod', requirePermission('internal_controls.read'), internalControlsController.checkSodConflict);
router.post('/record-override', requirePermission('internal_controls.manage'), internalControlsController.recordOverride);

export default router;
