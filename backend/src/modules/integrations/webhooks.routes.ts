import { Router } from 'express';
import { webhooksController } from './webhooks.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('webhooks.read'), webhooksController.listWebhooks);
router.post('/', requirePermission('webhooks.manage'), webhooksController.createWebhook);
router.patch('/:id/toggle', requirePermission('webhooks.manage'), webhooksController.toggleWebhook);
router.delete('/:id', requirePermission('webhooks.manage'), webhooksController.deleteWebhook);

router.get('/logs', requirePermission('webhooks.read'), webhooksController.listLogs);
router.post('/test-dispatch', requirePermission('webhooks.manage'), webhooksController.triggerTestEvent);

export default router;
