import type { LLMStreamChunk } from './types.js';
import { loadPromptTemplate, buildMessages } from './promptBuilder.js';
import { processExtraction } from './postProcessor.js';
import { createProvider, getProviderModel } from './providers/index.js';
import { cacheKey, getCached, setCached } from '../lib/cache.js';
import { sanitizeInput, truncateInput } from '../lib/sanitize.js';
import { precheckQuota, recordUsage } from '../lib/quota.js';
import { Extraction } from '../models/Extraction.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const MAX_INPUT_LENGTH = 10_000;
const PROMPT_VERSION = 'v1';
const CACHE_VERSION = 'v2';

export async function* runExtractionStream(
  userId: string,
  rawText: string,
  parentExtractionId: string | null = null,
): AsyncIterable<LLMStreamChunk> {
  const inputText = truncateInput(sanitizeInput(rawText), MAX_INPUT_LENGTH);
  const template = loadPromptTemplate(PROMPT_VERSION);
  const messages = buildMessages(template, inputText);
  const providerModel = getProviderModel();

  const key = cacheKey(inputText, template.version, providerModel) + ':' + CACHE_VERSION;
  const cached = getCached(key);
  if (cached) {
    const metadata = cached.metadata;
    const extraction = await Extraction.create({
      userId,
      inputText,
      result: cached.result,
      promptVersion: template.version,
      model: metadata.model,
      provider: metadata.provider,
      tokensIn: metadata.tokensIn,
      tokensOut: metadata.tokensOut,
      latencyMs: metadata.latencyMs,
      status: 'success',
      parentExtractionId,
    });
    logger.info({ extractionId: extraction._id, userId, cached: true }, 'extraction served from cache');
    yield { content: JSON.stringify({ id: extraction._id.toString(), ...cached.result, cached: true, ...metadata }), done: true };
    return;
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
    model: providerModel,
    temperature: template.temperature,
    maxTokens: template.maxTokens,
  };

  if (!provider.stream) {
    const result = await provider.complete(llmRequest);
    const processed = await processExtraction(result.content, provider, llmRequest);
    const totalTokens = result.usage.promptTokens + result.usage.completionTokens;
    await recordUsage(userId, totalTokens);

    const metadata = {
      model: result.model,
      provider: config.LLM_PROVIDER,
      tokensIn: result.usage.promptTokens,
      tokensOut: result.usage.completionTokens,
      latencyMs: 0,
    };
    setCached(key, processed, metadata);

    const extraction = await Extraction.create({
      userId,
      inputText,
      result: processed,
      promptVersion: template.version,
      model: metadata.model,
      provider: metadata.provider,
      tokensIn: metadata.tokensIn,
      tokensOut: metadata.tokensOut,
      latencyMs: metadata.latencyMs,
      status: 'success',
      parentExtractionId,
    });

    yield { content: JSON.stringify({ id: extraction._id.toString(), ...processed, cached: false, ...metadata }), done: true };
    return;
  }

  let fullContent = '';
  let finalStreamChunk: LLMStreamChunk | null = null;
  for await (const chunk of provider.stream(llmRequest)) {
    fullContent = chunk.content;
    finalStreamChunk = chunk;
    yield chunk;
  }

  const processed = await processExtraction(fullContent, provider, llmRequest);
  const totalTokens = (finalStreamChunk?.usage?.promptTokens ?? 0) + (finalStreamChunk?.usage?.completionTokens ?? 0);
  await recordUsage(userId, totalTokens);

  const metadata = {
    model: providerModel,
    provider: config.LLM_PROVIDER,
    tokensIn: finalStreamChunk?.usage?.promptTokens ?? 0,
    tokensOut: finalStreamChunk?.usage?.completionTokens ?? 0,
    latencyMs: 0,
  };
  setCached(key, processed, metadata);

  const extraction = await Extraction.create({
    userId,
    inputText,
    result: processed,
    promptVersion: template.version,
    model: metadata.model,
    provider: metadata.provider,
    tokensIn: metadata.tokensIn,
    tokensOut: metadata.tokensOut,
    latencyMs: metadata.latencyMs,
    status: 'success',
    parentExtractionId,
  });

  yield { content: JSON.stringify({ id: extraction._id.toString(), ...processed, cached: false, ...metadata }), done: true };
}