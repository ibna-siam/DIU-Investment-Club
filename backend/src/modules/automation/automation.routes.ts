import { Router } from 'express';
import { automationController } from './automation.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/metrics', requirePermission('automation.read'), automationController.getDashboardMetrics);
router.get('/rules', requirePermission('automation.read'), automationController.getRules);
router.get('/rules/:id', requirePermission('automation.read'), automationController.getRuleById);
router.post('/rules', requirePermission('automation.create'), automationController.createRule);
router.put('/rules/:id', requirePermission('automation.update'), automationController.updateRule);
router.patch('/rules/:id/status', requirePermission('automation.update'), automationController.toggleStatus);
router.delete('/rules/:id', requirePermission('automation.manage'), automationController.deleteRule);

router.get('/logs', requirePermission('automation.logs_read'), automationController.getLogs);
router.post('/execute-runner', requirePermission('automation.execute'), automationController.executeRunner);

export default router;
