import { Router } from 'express';
import { DevicesController } from './devices.controller.js';

export function createDevicesRoutes(controller: DevicesController): Router {
  const router = Router();

  router.get('/', controller.listDevices);
  router.post('/sync', controller.syncDevices);
  router.post('/:id/heartbeat', controller.registerHeartbeat);

  return router;
}
