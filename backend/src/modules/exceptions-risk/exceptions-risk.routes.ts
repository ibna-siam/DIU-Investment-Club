import { Router } from 'express';
import { exceptionsRiskController } from './exceptions-risk.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Financial Exceptions
router.get('/exceptions', requirePermission('exceptions.read'), exceptionsRiskController.listExceptions);
router.post('/exceptions/scan', requirePermission('exceptions.manage'), exceptionsRiskController.scanExceptions);
router.patch('/exceptions/:id/resolve', requirePermission('exceptions.manage'), exceptionsRiskController.resolveException);

// Risk Flags
router.get('/risk-flags', requirePermission('risk_flags.read'), exceptionsRiskController.listRiskFlags);
router.post('/risk-flags', requirePermission('risk_flags.manage'), exceptionsRiskController.createRiskFlag);
router.patch('/risk-flags/:id/status', requirePermission('risk_flags.manage'), exceptionsRiskController.updateRiskFlagStatus);

// Overview Metrics
router.get('/metrics', requirePermission('exceptions.read'), exceptionsRiskController.getMetrics);

export default router;
