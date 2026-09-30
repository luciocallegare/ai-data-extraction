import fp from 'fastify-plugin';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export default fp(async (app) => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('connected to mongodb');
  } catch (err) {
    logger.error({ err }, 'mongodb connection failed');
    throw err;
  }

  app.addHook('onClose', async () => {
    await mongoose.disconnect();
    logger.info('disconnected from mongodb');
  });
});
