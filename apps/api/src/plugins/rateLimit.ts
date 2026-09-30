import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config.js';

export default fp(async (app) => {
  await app.register(rateLimit, {
    max: config.NODE_ENV === 'test' ? 1000 : 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });
});
