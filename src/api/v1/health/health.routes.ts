import { Router } from 'express';
import { HealthController } from './health.controller.js';

export function createHealthRoutes(controller: HealthController): Router {
  const router = Router();
  router.get('/', controller.getHealth);
  router.get('/ready', controller.getReadiness);
  return router;
}
