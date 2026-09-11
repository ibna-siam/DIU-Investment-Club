import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { loginLimiter, passwordResetLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// Authentication & Session
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authenticate, (req, res) => authController.getMe(req, res));

// Password Recovery & Reset (Rate limited & abuse protected)
router.post('/forgot-password', passwordResetLimiter, (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => {
  // If Bearer token present, authenticate first; otherwise let controller inspect body.token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return authenticate(req, res, () => authController.resetPassword(req, res, next));
  }
  return authController.resetPassword(req, res, next);
});

// Email Verification
router.post('/verify-email/request', authenticate, (req, res, next) => authController.requestEmailVerification(req, res, next));
router.post('/verify-email/confirm', (req, res, next) => authController.confirmEmailVerification(req, res, next));

// Initial Setup & Secure Account Invitation Setup
router.get('/setup/validate', (req, res, next) => authController.validateSetupToken(req, res, next));
router.post('/setup/validate', (req, res, next) => authController.validateSetupToken(req, res, next));
router.post('/setup/confirm', passwordResetLimiter, (req, res, next) => authController.confirmAccountSetup(req, res, next));
router.post('/setup-admin', (req, res, next) => authController.setupInitialAdmin(req, res, next));

export default router;
