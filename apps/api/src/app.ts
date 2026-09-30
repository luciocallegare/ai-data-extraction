import Fastify, { type FastifyError, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rateLimit.js';
import authRoutes from './routes/auth.js';
import extractionRoutes from './routes/extractions.js';

export function buildApp() {
  const app = Fastify({ logger: false });

  app.register(cors, { origin: true, credentials: true });

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation failed', details: error.issues });
    }
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      logger.error({ err: error }, 'unhandled error');
      return reply.code(500).send({ error: 'Internal server error' });
    }
    return reply.code(statusCode).send({ error: error.message });
  });

  app.register(dbPlugin);
  app.register(authPlugin);
  app.register(rateLimitPlugin);

  app.register(authRoutes);
  app.register(extractionRoutes);

  app.get('/health', async () => ({ status: 'ok', provider: config.LLM_PROVIDER }));

  return app;
}
