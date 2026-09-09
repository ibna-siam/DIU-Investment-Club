import { Router } from 'express';
import { sponsorsController } from './sponsors.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('sponsors.read'), sponsorsController.getSponsors);
router.post('/', requirePermission('sponsors.create'), sponsorsController.createSponsor);
router.get('/:id', requirePermission('sponsors.read'), sponsorsController.getSponsorById);
router.put('/:id', requirePermission('sponsors.update'), sponsorsController.updateSponsor);

export default router;
