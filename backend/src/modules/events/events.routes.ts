import { Router } from 'express';
import { eventsController } from './events.controller';
import eventTeamRoutes from '../event-team/event-team.routes';
import eventBudgetsRoutes from '../event-budgets/event-budgets.routes';
import eventFinancialsRoutes from '../event-financials/event-financials.routes';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Sub-resources
router.use('/:eventId/members', eventTeamRoutes);
router.use('/:eventId/budget', eventBudgetsRoutes);
router.use('/:eventId/financials', eventFinancialsRoutes);

router.get('/', requirePermission('events', 'read'), eventsController.list);
router.get('/slug/:slug', requirePermission('events', 'read'), eventsController.getBySlug);
router.get('/:id', requirePermission('events', 'read'), eventsController.getById);
router.post('/', requirePermission('events', 'create'), eventsController.create);
router.patch('/:id', requirePermission('events', 'update'), eventsController.update);
router.post('/:id/status', requirePermission('events', 'update'), eventsController.updateStatus);
router.post('/:id/close', requirePermission('events', 'close'), eventsController.close);
router.post('/:id/reopen', requirePermission('events', 'update'), eventsController.reopen);
router.delete('/:id', requirePermission('events', 'delete'), eventsController.delete);

export default router;
