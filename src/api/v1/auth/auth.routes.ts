import { Router } from 'express';
import { AuthController } from './auth.controller.js';

export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  router.post('/login', controller.login);
  router.post('/verify-otp', controller.verifyOtp);

  return router;
}
