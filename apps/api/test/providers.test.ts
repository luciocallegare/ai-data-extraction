import { describe, it, expect } from 'vitest';
import { MockProvider } from '../src/ai/providers/mock.js';
import type { LLMRequest } from '../src/ai/types.js';

const request: LLMRequest = {
  messages: [{ role: 'user', content: '<user_input>Contact john@example.com or visit https://example.com</user_input>' }],
  model: 'mock',
  temperature: 0.1,
  maxTokens: 1024,
};

describe('MockProvider', () => {
  it('returns deterministic structured output', async () => {
    const provider = new MockProvider();
    const result = await provider.complete(request);

    expect(result.content).toContain('emails');
    expect(result.content).toContain('john@example.com');
    expect(result.content).toContain('urls');
    expect(result.content).toContain('https://example.com');
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
    expect(result.model).toBe('mock');
  });

  it('produces valid JSON', async () => {
    const provider = new MockProvider();
    const result = await provider.complete(request);
    const parsed = JSON.parse(result.content);
    expect(typeof parsed).toBe('object');
    expect(parsed).not.toBeNull();
  });

  it('extracts amounts and dates', async () => {
    const req: LLMRequest = {
      messages: [{ role: 'user', content: '<user_input>Price is $49.99, date: 12/25/2026</user_input>' }],
      model: 'mock',
      temperature: 0.1,
      maxTokens: 1024,
    };
    const provider = new MockProvider();
    const result = await provider.complete(req);
    const parsed = JSON.parse(result.content);
    expect(parsed.amounts).toContain('$49.99');
    expect(parsed.dates).toContain('12/25/2026');
  });

  it('throws on simulated error when errorRate is 1', async () => {
    const provider = new MockProvider({ errorRate: 1 });
    await expect(provider.complete(request)).rejects.toThrow('simulated LLM failure');
  });

  it('does not throw when errorRate is 0', async () => {
    const provider = new MockProvider({ errorRate: 0 });
    await expect(provider.complete(request)).resolves.toBeDefined();
  });
});
