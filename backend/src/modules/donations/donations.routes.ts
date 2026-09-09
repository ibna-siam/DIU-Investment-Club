import { Router } from 'express';
import { donationsController } from './donations.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('donations.read'), donationsController.getDonations);
router.post('/', requirePermission('donations.create'), donationsController.createDonation);
router.get('/:id', requirePermission('donations.read'), donationsController.getDonationById);
router.post('/:id/verify', requirePermission('donations.verify'), donationsController.verifyDonation);
router.post('/:id/reject', requirePermission('donations.reject'), donationsController.rejectDonation);

export default router;
