import { Router } from 'express';
import { assetsController } from './assets.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('assets.read'), assetsController.getAssets);
router.post('/', requirePermission('assets.create'), assetsController.createAsset);
router.get('/:id', requirePermission('assets.read'), assetsController.getAssetById);
router.put('/:id', requirePermission('assets.update'), assetsController.updateAsset);
router.patch('/:id', requirePermission('assets.update'), assetsController.updateAsset);
router.post('/:id/assign', requirePermission('assets.assign'), assetsController.assignAsset);
router.post('/assignments/:assignmentId/return', requirePermission('assets.assign'), assetsController.returnAsset);
router.post('/:id/maintenance', requirePermission('assets.maintain'), assetsController.addMaintenance);

export default router;
