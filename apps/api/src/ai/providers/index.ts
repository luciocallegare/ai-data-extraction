import { config } from '../../config.js';
import type { LLMProvider } from '../types.js';
import { MockProvider } from './mock.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';

export function createProvider(): LLMProvider {
  switch (config.LLM_PROVIDER) {
    case 'openai':
      if (!config.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
      return new OpenAIProvider(config.OPENAI_API_KEY);
    case 'anthropic':
      if (!config.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
      return new AnthropicProvider(config.ANTHROPIC_API_KEY);
    case 'mock':
    default:
      return new MockProvider();
  }
}

export { MockProvider, OpenAIProvider, AnthropicProvider };
