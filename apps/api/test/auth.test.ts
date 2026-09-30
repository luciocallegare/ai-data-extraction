import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import authPlugin from '../src/plugins/auth.js';

let app: any;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-test-secret-16';
  app = Fastify();
  await app.register(authPlugin);
  app.get('/_test/protected', {
    preHandler: (request: any, reply: any) => app.authenticate(request, reply),
  }, async () => ({ ok: true }));
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('auth guard', () => {
  it('rejects requests with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/_test/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_test/protected',
      cookies: { token: 'invalid.token.here' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('allows requests with a valid token', async () => {
    const token = app.jwt.sign({ sub: 'test-user-id' });
    const res = await app.inject({
      method: 'GET',
      url: '/_test/protected',
      cookies: { token },
    });
    expect(res.statusCode).toBe(200);
  });
});
