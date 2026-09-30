import type { LLMResult } from './types.js';
import { loadPromptTemplate, buildMessages } from './promptBuilder.js';
import { processExtraction } from './postProcessor.js';
import { createProvider } from './providers/index.js';
import { cacheKey, getCached, setCached } from '../lib/cache.js';
import { sanitizeInput, truncateInput } from '../lib/sanitize.js';
import { precheckQuota, recordUsage } from '../lib/quota.js';
import { Extraction } from '../models/Extraction.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const MAX_INPUT_LENGTH = 10_000;
const PROMPT_VERSION = 'v1';

export interface ExtractionResponse {
  id: string;
  data: Record<string, unknown>;
  confidence: Record<string, number>;
  unknownFields: string[];
  warnings: string[];
  cached: boolean;
}

export async function runExtraction(
  userId: string,
  rawText: string,
  parentExtractionId: string | null = null,
): Promise<ExtractionResponse> {
  const inputText = truncateInput(sanitizeInput(rawText), MAX_INPUT_LENGTH);
  const template = loadPromptTemplate(PROMPT_VERSION);
  const messages = buildMessages(template, inputText);

  const key = cacheKey(inputText, template.version, template.model);
  const cached = getCached(key);
  if (cached) {
    const extraction = await Extraction.create({
      userId,
      inputText,
      result: cached,
      promptVersion: template.version,
      model: template.model,
      provider: config.LLM_PROVIDER,
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: 0,
      status: 'success',
      parentExtractionId,
    });
    logger.info({ extractionId: extraction._id, userId, cached: true }, 'extraction served from cache');
    return { id: extraction._id.toString(), ...cached, cached: true };
  }

  const estimatedTokens = Math.ceil(inputText.length / 4) + template.maxTokens;
  const quota = await precheckQuota(userId, estimatedTokens);
  if (!quota.allowed) {
    const err = new Error('Daily token quota exceeded') as Error & { statusCode: number };
    err.statusCode = 429;
    throw err;
  }

  const provider = createProvider();
  const llmRequest = {
    messages,
    model: template.model,
    temperature: template.temperature,
    maxTokens: template.maxTokens,
  };

  const start = Date.now();
  let result: LLMResult;
  try {
    result = await provider.complete(llmRequest);
  } catch (err) {
    const latencyMs = Date.now() - start;
    await Extraction.create({
      userId,
      inputText,
      result: { error: 'llm_failed' },
      promptVersion: template.version,
      model: template.model,
      provider: config.LLM_PROVIDER,
      tokensIn: 0,
      tokensOut: 0,
      latencyMs,
      status: 'error',
      parentExtractionId,
    });
    logger.error({ err, userId, latencyMs }, 'LLM provider failed');
    const e = new Error('LLM provider failed') as Error & { statusCode: number };
    e.statusCode = 502;
    throw e;
  }
  const latencyMs = Date.now() - start;

  const processed = await processExtraction(result.content, provider, llmRequest);

  const totalTokens = result.usage.promptTokens + result.usage.completionTokens;
  await recordUsage(userId, totalTokens);
  setCached(key, processed);

  const extraction = await Extraction.create({
    userId,
    inputText,
    result: processed,
    promptVersion: template.version,
    model: result.model,
    provider: config.LLM_PROVIDER,
    tokensIn: result.usage.promptTokens,
    tokensOut: result.usage.completionTokens,
    latencyMs,
    status: 'success',
    parentExtractionId,
  });

  logger.info(
    { extractionId: extraction._id, userId, latencyMs, tokensIn: result.usage.promptTokens, tokensOut: result.usage.completionTokens },
    'extraction complete',
  );

  return { id: extraction._id.toString(), ...processed, cached: false };
}
