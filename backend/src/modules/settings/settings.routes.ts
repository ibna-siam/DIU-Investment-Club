import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Allow any user with settings.read or any operational module to view general settings
router.get('/', (req, res, next) => settingsController.getSettings(req, res, next));

// Only authorized administrators can modify operational settings
router.patch('/', requirePermission('settings', 'manage'), (req, res, next) =>
  settingsController.updateSettings(req, res, next)
);

export default router;
