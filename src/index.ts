import { createServer } from './api/server.js';
import { config } from './config/index.js';
import { logger } from './shared/logger/index.js';

async function main() {
  logger.info('──────────────────────────────────────────────');
  logger.info('  📱 SMS Gateway SaaS API — Starting');
  logger.info('  Powered by SMS Gateway for Android™');
  logger.info('──────────────────────────────────────────────');

  const { app, queueService, workerService } = createServer();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 SaaS API running on http://localhost:${config.port}`);
    logger.info(`   Health:    http://localhost:${config.port}/health`);
    logger.info(`   API Info:  http://localhost:${config.port}/`);
    logger.info(`   Mode:      ${config.gatewayMode === 'mock' ? '🧪 Mock (try-it-now)' : '📡 Live SMS Gateway'}`);
    logger.info('');
    logger.info('  📌 Demo API Key: ak_live_demo123');
    logger.info('  📖 Send your first SMS:');
    logger.info(`     curl -X POST http://localhost:${config.port}/v1/messages \\`);
    logger.info('       -H "Authorization: Bearer ak_live_demo123" \\');
    logger.info('       -H "Content-Type: application/json" \\');
    logger.info("       -d '{\"to\": \"+1234567890\", \"text\": \"Hello from SaaS Gateway!\"}'");
    logger.info('──────────────────────────────────────────────');
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal, cleaning up...');

    server.close(async () => {
      try {
        await queueService.close();
        await workerService.close();
      } catch (err) {
        // best-effort cleanup
      }
      logger.info('Goodbye 👋');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
