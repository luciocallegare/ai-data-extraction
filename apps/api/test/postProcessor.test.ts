import { describe, it, expect } from 'vitest';
import { processExtraction } from '../src/ai/postProcessor.js';
import type { LLMProvider, LLMRequest } from '../src/ai/types.js';

const mockProvider: LLMProvider = {
  async complete(_request: LLMRequest) {
    return { content: '{}', usage: { promptTokens: 0, completionTokens: 0 }, model: 'mock' };
  },
};

const baseRequest: LLMRequest = {
  messages: [
    { role: 'user', content: 'Contact John at john@example.com or call 555-1234. His age is 30.' },
    { role: 'assistant', content: '{"name": "John", "age": 30, "email": "john@example.com", "phone": "555-1234"}' }
  ],
  model: 'mock',
  temperature: 0.1,
  maxTokens: 1024,
};

describe('processExtraction', () => {
  it('parses valid JSON output', async () => {
    const result = await processExtraction('{"name": "John", "age": 30}', mockProvider, baseRequest);
    expect(result.data).toEqual({ name: 'John', age: 30 });
    expect(result.confidence.name.status).toBe('VERIFIED');
    expect(result.confidence.name.score).toBeGreaterThan(0);
    expect(result.unknownFields).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('strips markdown code fences', async () => {
    const result = await processExtraction('```json\n{"email": "a@b.com"}\n```', mockProvider, baseRequest);
    expect(result.data).toEqual({ email: 'a@b.com' });
  });

  it('extracts JSON from surrounding text', async () => {
    const result = await processExtraction('Here is the result:\n{"city": "Paris"}\nDone.', mockProvider, baseRequest);
    expect(result.data).toEqual({ city: 'Paris' });
  });

  it('marks null fields as unknown with low confidence', async () => {
    const result = await processExtraction('{"name": "John", "phone": null}', mockProvider, baseRequest);
    expect(result.data).toEqual({ name: 'John', phone: null });
    expect(result.confidence.phone.status).toBe('NOT_FOUND');
    expect(result.unknownFields).toContain('phone');
  });

  it('trims string values', async () => {
    const result = await processExtraction('{"name": "  John  "}', mockProvider, baseRequest);
    expect(result.data.name).toBe('John');
  });

  it('returns empty data for unparseable output', async () => {
    const result = await processExtraction('not json at all', mockProvider, baseRequest);
    expect(result.data).toEqual({});
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('retries once with repair prompt on invalid output', async () => {
    let callCount = 0;
    const repairProvider: LLMProvider = {
      async complete(_request: LLMRequest) {
        callCount++;
        return { content: '{"fixed": true}', usage: { promptTokens: 0, completionTokens: 0 }, model: 'mock' };
      },
    };

    const result = await processExtraction('{"key": {"bad": "type"}}', repairProvider, baseRequest);
    expect(callCount).toBe(1);
    expect(result.data).toEqual({ fixed: true });
    expect(result.warnings).toContain('Output required one repair attempt');
  });

  it('returns empty data when repair also fails', async () => {
    let callCount = 0;
    const failProvider: LLMProvider = {
      async complete(_request: LLMRequest) {
        callCount++;
        return { content: 'still invalid', usage: { promptTokens: 0, completionTokens: 0 }, model: 'mock' };
      },
    };

    const result = await processExtraction('{"key": {"bad": "type"}}', failProvider, baseRequest);
    expect(callCount).toBe(1);
    expect(result.data).toEqual({});
    expect(result.warnings.length).toBeGreaterThan(1);
  });
});