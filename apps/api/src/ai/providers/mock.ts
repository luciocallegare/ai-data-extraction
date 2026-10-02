import type { LLMProvider, LLMRequest, LLMResult, LLMStreamChunk } from '../types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockProvider implements LLMProvider {
  private errorRate: number;

  constructor(options: { errorRate?: number } = {}) {
    this.errorRate = options.errorRate ?? 0;
  }

  async complete(request: LLMRequest): Promise<LLMResult> {
    await sleep(200 + Math.random() * 300);

    if (this.errorRate > 0 && Math.random() < this.errorRate) {
      throw new Error('MockProvider: simulated LLM failure');
    }

    const userMessage = request.messages.find((m) => m.role === 'user');
    const text = userMessage?.content ?? '';
    const rawText = text
      .replace(/<user_input>/g, '')
      .replace(/<\/user_input>/g, '')
      .trim();

    const data: Record<string, unknown> = {};

    const emails = rawText.match(/[\w.-]+@[\w.-]+\.\w+/g);
    if (emails) data.emails = [...new Set(emails)];

    const urls = rawText.match(/https?:\/\/[^\s]+/g);
    if (urls) data.urls = [...new Set(urls)];

    const amounts = rawText.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (amounts) data.amounts = [...new Set(amounts)];

    const dates = rawText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g);
    if (dates) data.dates = [...new Set(dates)];

    const phones = rawText.match(/\+?\d[\d\s\-().]{7,}\d/g);
    if (phones) data.phones = [...new Set(phones)];

    data.summary = `Extracted ${Object.keys(data).length - 1} field types from ${rawText.length} characters`;

    const content = JSON.stringify(data, null, 2);

    return {
      content,
      usage: {
        promptTokens: Math.ceil(text.length / 4),
        completionTokens: Math.ceil(content.length / 4),
      },
      model: request.model,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const result = await this.complete(request);
    const words = result.content.split(' ');
    let accumulated = '';
    for (const word of words) {
      accumulated += word + ' ';
      yield { content: accumulated, done: false };
      await sleep(20);
    }
    yield {
      content: result.content,
      done: true,
      usage: result.usage,
      model: result.model,
    };
  }
}
