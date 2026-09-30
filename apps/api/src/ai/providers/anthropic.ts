import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMRequest, LLMResult } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(request: LLMRequest): Promise<LLMResult> {
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const userMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await this.client.messages.create({
      model: request.model,
      system: systemMessage?.content,
      messages: userMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
      model: response.model,
    };
  }
}
