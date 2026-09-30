import { buildApp } from './app.js';
import { config } from './config.js';

const app = buildApp();

app
  .listen({ port: config.PORT, host: '0.0.0.0' })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
