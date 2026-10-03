import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import authPlugin from '../src/plugins/auth.js';
import extractionRoutes from '../src/routes/extractions.js';
import authRoutes from '../src/routes/auth.js';
import dbPlugin from '../src/plugins/db.js';

let app: any;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-test-secret-16';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/extract-test';
  process.env.LLM_PROVIDER = 'mock';
  
  app = Fastify();
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(extractionRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('extraction streaming and metadata persistence', () => {
  let authCookie: string;
  let userId: string;

  beforeAll(async () => {
    // Register and login a test user
    const uniqueEmail = `test-stream-${Date.now()}@example.com`;
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: uniqueEmail, password: 'password123' },
    });
    expect(reg.statusCode).toBe(201);
    const cookie = reg.cookies.find((c: any) => c.name === 'token');
    authCookie = cookie.value;
  });

  it('should create extraction via stream endpoint and persist metadata correctly', async () => {
    const text = 'Contact john@example.com for invoice $1,250.00 due by 03/15/2026';

    // Create extraction via stream endpoint
    const streamRes = await app.inject({
      method: 'POST',
      url: '/extractions/stream',
      payload: { text },
      cookies: { token: authCookie },
    });

    expect(streamRes.statusCode).toBe(200);

    // Parse SSE response
    const lines = streamRes.body.split('\n\n').filter((l: string) => l.startsWith('data: ') && l !== 'data: [DONE]');
    const chunks = lines.map((l: string) => JSON.parse(l.slice(6)));
    
    // Find the LAST final chunk (done: true) - the wrapper chunk
    const finalChunkWrapper = chunks.filter((c: any) => c.done === true).pop();
    expect(finalChunkWrapper).toBeDefined();
    
    // The final chunk wrapper has the full extraction data inside the `content` field as a JSON string
    const finalChunk = JSON.parse(finalChunkWrapper.content);
    expect(finalChunk).toBeDefined();
    expect(finalChunk.id).toBeDefined();
    expect(finalChunk.data).toBeDefined();
    expect(finalChunk.confidence).toBeDefined();
    expect(finalChunk.unknownFields).toBeDefined();
    expect(finalChunk.warnings).toBeDefined();
    expect(finalChunk.cached).toBe(false);
    expect(finalChunk.model).toBe('mock');
    expect(finalChunk.provider).toBe('mock');
    expect(finalChunk.tokensIn).toBeGreaterThan(0);
    expect(finalChunk.tokensOut).toBeGreaterThan(0);
    expect(finalChunk.latencyMs).toBeGreaterThanOrEqual(0);

    // Now fetch the extraction via GET endpoint
    const getRes = await app.inject({
      method: 'GET',
      url: `/extractions/${finalChunk.id}`,
      cookies: { token: authCookie },
    });

    expect(getRes.statusCode).toBe(200);
    const extraction = getRes.json();

    // Verify all metadata fields are present and correct
    expect(extraction._id).toBe(finalChunk.id);
    expect(extraction.model).toBe('mock');
    expect(extraction.provider).toBe('mock');
    expect(extraction.tokensIn).toBeGreaterThan(0);
    expect(extraction.tokensOut).toBeGreaterThan(0);
    expect(extraction.latencyMs).toBeGreaterThanOrEqual(0);
    expect(extraction.status).toBe('success');
    expect(extraction.data).toBeDefined();
    expect(extraction.confidence).toBeDefined();
    expect(extraction.unknownFields).toBeDefined();
    expect(extraction.warnings).toBeDefined();
    expect(extraction.createdAt).toBeDefined();
    expect(extraction.userId).toBeDefined();

    // Verify tokens match between stream response and GET response
    expect(extraction.tokensIn).toBe(finalChunk.tokensIn);
    expect(extraction.tokensOut).toBe(finalChunk.tokensOut);
    expect(extraction.latencyMs).toBe(finalChunk.latencyMs);
    expect(extraction.model).toBe(finalChunk.model);
    expect(extraction.provider).toBe(finalChunk.provider);
  });

  it('should return cached metadata correctly on second request', async () => {
    const text = 'Email jane@test.com about $500 due 01/01/2026';

    // First request
    const firstStream = await app.inject({
      method: 'POST',
      url: '/extractions/stream',
      payload: { text },
      cookies: { token: authCookie },
    });

    const firstLines = firstStream.body.split('\n\n').filter((l: string) => l.startsWith('data: ') && l !== 'data: [DONE]');
    const firstChunks = firstLines.map((l: string) => JSON.parse(l.slice(6)));
    const firstFinalWrapper = firstChunks.filter((c: any) => c.done === true).pop();
    expect(firstFinalWrapper).toBeDefined();
    const firstFinal = JSON.parse(firstFinalWrapper.content);
    expect(firstFinal).toBeDefined();
    expect(firstFinal.id).toBeDefined();

    // Second request (should be cached)
    const secondStream = await app.inject({
      method: 'POST',
      url: '/extractions/stream',
      payload: { text },
      cookies: { token: authCookie },
    });

    const secondLines = secondStream.body.split('\n\n').filter((l: string) => l.startsWith('data: ') && l !== 'data: [DONE]');
    const secondChunks = secondLines.map((l: string) => JSON.parse(l.slice(6)));
    const secondFinalWrapper = secondChunks.filter((c: any) => c.done === true).pop();
    expect(secondFinalWrapper).toBeDefined();
    const secondFinal = JSON.parse(secondFinalWrapper.content);
    expect(secondFinal).toBeDefined();
    expect(secondFinal.cached).toBe(true);

    // Metadata should match between cached and original
    expect(secondFinal.tokensIn).toBe(firstFinal.tokensIn);
    expect(secondFinal.tokensOut).toBe(firstFinal.tokensOut);
    expect(secondFinal.latencyMs).toBe(firstFinal.latencyMs);
    expect(secondFinal.model).toBe(firstFinal.model);
    expect(secondFinal.provider).toBe(firstFinal.provider);

    // Fetch via GET and verify
    const getRes = await app.inject({
      method: 'GET',
      url: `/extractions/${secondFinal.id}`,
      cookies: { token: authCookie },
    });

    expect(getRes.statusCode).toBe(200);
    const extraction = getRes.json();
    expect(extraction.tokensIn).toBe(firstFinal.tokensIn);
    expect(extraction.tokensOut).toBe(firstFinal.tokensOut);
    expect(extraction.latencyMs).toBe(firstFinal.latencyMs);
    expect(extraction.model).toBe(firstFinal.model);
    expect(extraction.provider).toBe(firstFinal.provider);
  });
});