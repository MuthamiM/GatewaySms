import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { config } from '../config/index.js';
import { logger } from '../shared/logger/index.js';

// Middlewares
import { createAuthMiddleware } from './middlewares/auth.middleware.js';
import { createRateLimiter } from './middlewares/rate-limit.js';
import { errorHandler } from './middlewares/error-handler.js';

// Route factories
import { createHealthRoutes } from './v1/health/health.routes.js';
import { createMessagesRoutes } from './v1/messages/messages.routes.js';
import { createDevicesRoutes } from './v1/devices/devices.routes.js';
import { createWebhooksRoutes } from './v1/webhooks/webhooks.routes.js';
import { createAuthRoutes } from './v1/auth/auth.routes.js';

// Controllers
import { HealthController } from './v1/health/health.controller.js';
import { MessagesController } from './v1/messages/messages.controller.js';
import { DevicesController } from './v1/devices/devices.controller.js';
import { WebhooksController } from './v1/webhooks/webhooks.controller.js';
import { AuthController } from './v1/auth/auth.controller.js';

// Core services
import { MessageService } from '../core/services/message.service.js';
import { DeviceRouterService } from '../core/services/router.service.js';
import { WebhookService } from '../core/services/webhook.service.js';
import { AuthService } from '../core/services/auth.service.js';

// Infrastructure
import { ISmsGatewayDriver } from '../core/ports/gateway.port.js';
import { MessageRepository, DeviceRepository, TenantRepository } from '../infrastructure/database/in-memory.repository.js';
import { MessageQueueService } from '../infrastructure/queue/message.queue.js';
import { MessageWorkerService } from '../infrastructure/queue/message.worker.js';
import { MockGatewayAdapter } from '../infrastructure/adapters/mock.adapter.js';
import { SmsGateServerAdapter } from '../infrastructure/adapters/smsgate.adapter.js';

export interface ServerContext {
  app: Express;
  queueService: MessageQueueService;
  workerService: MessageWorkerService;
}

export function createServer(): ServerContext {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows web dashboard assets
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Static files for Web UI Dashboard
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // ── Infrastructure Layer ───────────────────────────────────────────
  const messageRepo = new MessageRepository();
  const deviceRepo = new DeviceRepository();
  const tenantRepo = new TenantRepository();

  // Select gateway driver based on config
  let gatewayDriver: ISmsGatewayDriver;
  if (config.gatewayMode === 'smsgate') {
    gatewayDriver = new SmsGateServerAdapter();
    logger.info('Gateway driver: SMS Gateway for Android™ Private Server');
  } else {
    gatewayDriver = new MockGatewayAdapter();
    logger.info('Gateway driver: Mock (simulated delivery — no Android device required)');
  }

  // Queue & Worker
  const queueService = new MessageQueueService();
  const routerService = new DeviceRouterService(deviceRepo);
  const webhookService = new WebhookService();

  // Core services
  const messageService = new MessageService(messageRepo, tenantRepo, queueService);
  const authService = new AuthService(messageService);

  // Worker (consumes from queue, dispatches via gateway)
  const workerService = new MessageWorkerService(
    messageRepo,
    tenantRepo,
    gatewayDriver,
    routerService,
    webhookService,
    queueService
  );

  // ── Auth middleware ────────────────────────────────────────────────
  const authMiddleware = createAuthMiddleware(tenantRepo);
  const rateLimiter = createRateLimiter();

  // ── Controllers ────────────────────────────────────────────────────
  const healthController = new HealthController(gatewayDriver);
  const messagesController = new MessagesController(messageService);
  const devicesController = new DevicesController(deviceRepo, gatewayDriver);
  const webhooksController = new WebhooksController(messageRepo, tenantRepo, webhookService);
  const authController = new AuthController(authService, tenantRepo);

  // ── Routes ─────────────────────────────────────────────────────────
  // Public health routes
  app.use('/health', createHealthRoutes(healthController));

  // Public authentication & OTP routes
  app.use('/v1/auth', createAuthRoutes(authController));

  // Webhook callbacks from the SMS Gateway server (no tenant auth)
  app.use('/v1/webhooks', createWebhooksRoutes(webhooksController, authMiddleware));

  // Authenticated tenant API routes
  app.use('/v1/messages', authMiddleware, rateLimiter, createMessagesRoutes(messagesController));
  app.use('/v1/devices', authMiddleware, createDevicesRoutes(devicesController));

  // Raw API Info Endpoint
  app.get('/api-info', (_req, res) => {
    res.json({
      service: 'SMS Gateway SaaS API',
      version: '1.0.0',
      poweredBy: 'SMS Gateway for Android™',
      gatewayDriver: gatewayDriver.name,
      docs: {
        health: '/health',
        readiness: '/health/ready',
        login: 'POST /v1/auth/login',
        verifyOtp: 'POST /v1/auth/verify-otp',
        sendMessage: 'POST /v1/messages',
        getMessages: 'GET /v1/messages',
        getMessage: 'GET /v1/messages/:id',
        listDevices: 'GET /v1/devices',
        syncDevices: 'POST /v1/devices/sync',
        testWebhook: 'POST /v1/webhooks/test',
      },
      preconfiguredUser: {
        email: 'musamwange2@gmail.com',
        phone: '0748329410',
        note: 'Password: as provided by user. OTP dispatched via SMS Gateway upon login.',
      },
      apiKey: 'ak_live_demo123',
    });
  });

  // Fallback for SPA routing
  app.get('*', (_req, res, next) => {
    if (_req.accepts('html')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    } else {
      next();
    }
  });

  // ── Error handler (must be last) ───────────────────────────────────
  app.use(errorHandler);

  return { app, queueService, workerService };
}
