import { Router } from 'express';
import { integrationsController } from './integrations.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// External Providers
router.get('/configs', requirePermission('integrations.read'), integrationsController.getConfigs);
router.patch('/configs/:providerType', requirePermission('integrations.manage'), integrationsController.updateConfig);
router.post('/configs/:providerType/test', requirePermission('integrations.manage'), integrationsController.testIntegration);
router.get('/logs', requirePermission('integrations.read'), integrationsController.getLogs);

// Communication Templates
router.get('/templates', requirePermission('communication_templates.read'), integrationsController.listTemplates);
router.post('/templates', requirePermission('communication_templates.manage'), integrationsController.createTemplate);
router.put('/templates/:id', requirePermission('communication_templates.manage'), integrationsController.updateTemplate);
router.post('/templates/preview', requirePermission('communication_templates.read'), integrationsController.previewTemplate);

export default router;
