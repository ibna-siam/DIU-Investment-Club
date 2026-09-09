import { Router } from 'express';
import { auditLogsController } from './audit-logs.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('audit.read'), auditLogsController.getLogs);
router.get('/stats', requirePermission('audit.read'), auditLogsController.getStats);
router.get('/reports', requirePermission('audit.export'), auditLogsController.getReports);

export default router;
