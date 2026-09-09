import { Router } from 'express';
import { complianceController } from './compliance.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/checklists', requirePermission('compliance.read'), complianceController.listChecklists);
router.get('/checklists/:id', requirePermission('compliance.read'), complianceController.getChecklistById);
router.post('/checklists', requirePermission('compliance.manage'), complianceController.createChecklist);
router.delete('/checklists/:id', requirePermission('compliance.manage'), complianceController.deleteChecklist);

router.post('/requirements', requirePermission('compliance.manage'), complianceController.addRequirement);
router.patch('/requirements/:id', requirePermission('compliance.manage'), complianceController.updateRequirement);

export default router;
