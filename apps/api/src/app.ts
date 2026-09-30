import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';

export function buildApp() {
  const app = Fastify({ logger: false });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get('/health', async () => ({ status: 'ok', provider: config.LLM_PROVIDER }));

  return app;
}
