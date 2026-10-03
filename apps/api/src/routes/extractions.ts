import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { runExtraction } from '../ai/service.js';
import { runExtractionStream } from '../ai/streaming.js';
import { Extraction } from '../models/Extraction.js';

const createSchema = z.object({
  text: z.string().min(1).max(10_000),
});

const refineSchema = z.object({
  question: z.string().min(1).max(1_000),
});

export default async function extractionRoutes(app: FastifyInstance) {
  app.post('/extractions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { text } = createSchema.parse(request.body);
    const userId = request.user.sub;
    const result = await runExtraction(userId, text);
    return reply.code(201).send(result);
  });

  app.post('/extractions/:id/refine', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { question } = refineSchema.parse(request.body);
    const userId = request.user.sub;

    const parent = await Extraction.findOne({ _id: id, userId });
    if (!parent) return reply.code(404).send({ error: 'Extraction not found' });

    const parentData = JSON.stringify(parent.result?.data ?? {}, null, 2);
    const text = `Previous extraction:\n${parentData}\n\nFollow-up question: ${question}`;

    const result = await runExtraction(userId, text, parent._id.toString());
    return reply.code(201).send(result);
  });

  function flattenExtraction(doc: any) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { result, ...rest } = obj;
  return { ...rest, ...(result || {}) };
}

  app.get('/extractions', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.user.sub;
    const extractions = await Extraction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-inputText');
    return { extractions: extractions.map(flattenExtraction) };
  });

  app.get('/extractions/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    const extraction = await Extraction.findOne({ _id: id, userId });
    if (!extraction) return reply.code(404).send({ error: 'Extraction not found' });
    return flattenExtraction(extraction);
  });

  app.delete('/extractions/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    const result = await Extraction.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) return reply.code(404).send({ error: 'Extraction not found' });
    return reply.code(204).send();
  });

  app.options('/extractions/stream', async (request, reply) => {
    const origin = request.headers.origin ?? '*';
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return reply.code(204).send();
  });

  app.post('/extractions/stream', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { text } = createSchema.parse(request.body);
    const userId = request.user.sub;

    const origin = request.headers.origin ?? '*';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    try {
      for await (const chunk of runExtractionStream(userId, text)) {
        const data = JSON.stringify(chunk);
        reply.raw.write(`data: ${data}\n\n`);
      }
      reply.raw.write('data: [DONE]\n\n');
    } catch (err) {
      const errorData = JSON.stringify({ error: (err as Error).message });
      reply.raw.write(`data: ${errorData}\n\n`);
    } finally {
      reply.raw.end();
    }
  });
}
