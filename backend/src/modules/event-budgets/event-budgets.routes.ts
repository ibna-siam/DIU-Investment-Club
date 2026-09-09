import { Router } from 'express';
import { eventBudgetsController } from './event-budgets.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

// When mounted on /events/:eventId/budget
router.get('/', requirePermission('budgets', 'read'), eventBudgetsController.getByEventId);
router.post('/', requirePermission('budgets', 'create'), eventBudgetsController.create);

// When mounted on /event-budgets
router.patch('/:id', requirePermission('budgets', 'update'), eventBudgetsController.update);
router.post('/:id/submit', requirePermission('budgets', 'update'), eventBudgetsController.submit);

export default router;
