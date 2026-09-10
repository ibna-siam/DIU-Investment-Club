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

router.get('/', requirePermission('events', 'read'), (req, res) => eventsController.list(req, res));
router.get('/slug/:slug', requirePermission('events', 'read'), (req, res) => eventsController.getBySlug(req, res));
router.get('/:id', requirePermission('events', 'read'), (req, res) => eventsController.getById(req, res));
router.post('/', requirePermission('events', 'create'), (req, res) => eventsController.create(req, res));
router.patch('/:id', requirePermission('events', 'update'), (req, res) => eventsController.update(req, res));
router.post('/:id/status', requirePermission('events', 'update'), (req, res) => eventsController.updateStatus(req, res));
router.post('/:id/close', requirePermission('events', 'close'), (req, res) => eventsController.close(req, res));
router.post('/:id/reopen', requirePermission('events', 'update'), (req, res) => eventsController.reopen(req, res));
router.delete('/:id', requirePermission('events', 'delete'), (req, res) => eventsController.delete(req, res));

export default router;
