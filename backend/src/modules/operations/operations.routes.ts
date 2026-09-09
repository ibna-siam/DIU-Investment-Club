import { Router } from 'express';
import { operationsController } from './operations.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/summary',
  requirePermission('operations.view'),
  operationsController.getSummary
);

export default router;
