import { Router } from 'express';
import { WebhooksController } from './webhooks.controller.js';

export function createWebhooksRoutes(controller: WebhooksController, authMiddleware: any): Router {
  const router = Router();

  // Gateway callbacks (no tenant auth — these come from the SMS Gateway server itself)
  router.post('/gateway/status', controller.gatewayStatusCallback);
  router.post('/gateway/incoming', controller.gatewayIncomingCallback);

  // Tenant-authenticated webhook test
  router.post('/test', authMiddleware, controller.testWebhook);

  return router;
}
