import { config } from '../../config.js';
import type { LLMProvider } from '../types.js';
import { MockProvider } from './mock.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';

export function createProvider(): LLMProvider {
  switch (config.LLM_PROVIDER) {
    case 'openai':
      if (!config.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
      return new OpenAIProvider(config.OPENAI_API_KEY);
    case 'anthropic':
      if (!config.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
      return new AnthropicProvider(config.ANTHROPIC_API_KEY);
    case 'gemini':
      if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');
      return new GeminiProvider(config.GEMINI_API_KEY, config.GEMINI_MODEL);
    case 'mock':
    default:
      return new MockProvider();
  }
}

export function getProviderModel(): string {
  switch (config.LLM_PROVIDER) {
    case 'openai':
      return config.OPENAI_MODEL;
    case 'anthropic':
      return config.ANTHROPIC_MODEL;
    case 'gemini':
      return config.GEMINI_MODEL;
    case 'mock':
    default:
      return 'mock';
  }
}

export { MockProvider, OpenAIProvider, AnthropicProvider, GeminiProvider };
