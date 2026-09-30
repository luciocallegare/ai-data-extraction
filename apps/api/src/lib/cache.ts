import { createHash } from 'node:crypto';
import type { ExtractionResult } from '../ai/types.js';

interface CacheEntry {
  result: ExtractionResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCached(key: string): ExtractionResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCached(key: string, result: ExtractionResult): void {
  cache.set(key, { result, timestamp: Date.now() });
}

export function cacheKey(inputText: string, promptVersion: string, model: string): string {
  const normalized = inputText.trim().toLowerCase();
  return createHash('sha256').update(`${normalized}:${promptVersion}:${model}`).digest('hex');
}
