// ============================================================
// Auth Routes
// ============================================================

import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { authLimiter } from '../../middleware/rateLimiter';
import { loginSchema, registerTenantSchema, refreshTokenSchema } from './auth.validation';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/register', authLimiter, validate(registerTenantSchema), (req, res, next) => authController.register(req, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getProfile(req, res, next));

export default router;

