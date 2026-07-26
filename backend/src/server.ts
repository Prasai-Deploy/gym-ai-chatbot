import { app } from './app/app';
import { env } from '@config/env';
import { logger } from '@logger/index';
import http from 'http';

const server = http.createServer(app);

server.listen(env.PORT, () => {
  logger.info(`🚀 STRIVA v2 Backend started on port ${env.PORT} in ${env.NODE_ENV} mode.`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    // Future: Close database connections here
    process.exit(0);
  });

  // Force close if taking too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal(reason, 'Unhandled Rejection');
  process.exit(1);
});
