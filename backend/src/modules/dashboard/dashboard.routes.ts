import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/stats', requirePermission('dashboard', 'read'), (req, res, next) =>
  dashboardController.getStats(req, res, next)
);

export default router;
