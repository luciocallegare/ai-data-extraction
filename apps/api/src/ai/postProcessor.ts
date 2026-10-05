import type { LLMProvider, LLMRequest, ExtractionResult, FieldConfidence, VerificationStatus, ExtractionConfidence } from './types.js';
import { extractionOutputSchema } from './schemas.js';

function stripCodeFences(content: string): string {
  return content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

function extractJson(content: string): unknown {
  const cleaned = stripCodeFences(content);

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON object found in output');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v.trim() : v));
  return value;
}

/**
 * Heuristic confidence scoring based on verifiable signals.
 * Each signal contributes to a 0-100 score.
 * Status is derived from score thresholds.
 */
function calculateFieldConfidence(key: string, value: unknown, inputText: string): { status: VerificationStatus; signals: string[]; score: number } {
  const signals: string[] = [];
  let score = 0;

  if (value === null) {
    return { status: 'NOT_FOUND', signals: ['not_found'], score: 0 };
  }

  const strValue = String(value);

  // Base score for any non-null extracted value
  score += 30;
  signals.push('extracted_value');

  // Signal 1: Value appears verbatim in input text
  if (inputText.includes(strValue)) {
    score += 25;
    signals.push('verbatim_match');
  }

  // Signal 2: Value matches common regex patterns
  if (isEmail(strValue)) {
    score += 30;
    signals.push('email_format');
  }
  if (isPhone(strValue)) {
    score += 30;
    signals.push('phone_format');
  }
  if (isCurrency(strValue)) {
    score += 30;
    signals.push('currency_format');
  }
  if (isDate(strValue)) {
    score += 30;
    signals.push('date_format');
  }
  if (isUrl(strValue)) {
    score += 30;
    signals.push('url_format');
  }
  if (isNumber(strValue)) {
    score += 20;
    signals.push('number_format');
  }

  // Signal 3: Value length indicates specificity (not a single token)
  if (strValue.length > 10) {
    score += 15;
    signals.push('specific_value');
  } else if (strValue.length > 5) {
    score += 10;
    signals.push('moderate_length');
  }

  // Signal 4: Value appears in expected format (not garbled)
  if (/^[a-zA-Z0-9@.\-_/\s]+$/.test(strValue)) {
    score += 10;
    signals.push('clean_format');
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Derive status from score
  let status: VerificationStatus;
  if (score >= 60) status = 'VERIFIED';
  else if (score >= 30) status = 'UNCERTAIN';
  else status = 'NOT_FOUND';

  return { status, signals, score };
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string): boolean {
  return /^[\+]?[\d\s\-\(\)]{7,}$/.test(value);
}

function isCurrency(value: string): boolean {
  return /^[\$€£¥]\s*\d{1,3}(?:[,\.]\d{3})*(?:\.\d{2})?$/.test(value) || /^\d{1,3}(?:[,\.]\d{3})*(?:\.\d{2})?\s*[\$€£¥]?$/.test(value);
}

function isDate(value: string): boolean {
  return /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(value) || /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/.test(value);
}

function isUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/.test(value);
}

function isNumber(value: string): boolean {
  return /^\d+$/.test(value);
}

async function repair(
  originalContent: string,
  error: { issues: { message: string }[] },
  provider: LLMProvider,
  request: LLMRequest,
): Promise<string> {
  const repairMessages: LLMRequest['messages'] = [
    ...request.messages,
    { role: 'assistant', content: originalContent },
    {
      role: 'user',
      content: [
        'The previous output was not valid JSON matching the required schema.',
        `Error: ${error.issues[0]?.message ?? 'unknown validation error'}`,
        'Output ONLY a valid JSON object of the form { "fieldName": value } where value is string, number, boolean, string[], or null.',
        'Do not include markdown, code fences, or any text outside the JSON object.',
      ].join('\n'),
    },
  ];

  const result = await provider.complete({ ...request, messages: repairMessages });
  return result.content;
}

export async function processExtraction(
  content: string,
  provider: LLMProvider,
  request: LLMRequest,
): Promise<ExtractionResult> {
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = extractJson(content);
  } catch (err) {
    warnings.push(`JSON parse failed: ${(err as Error).message}`);
    return { data: {}, confidence: {}, unknownFields: [], warnings };
  }

  let validation = extractionOutputSchema.safeParse(parsed);

  if (!validation.success) {
    warnings.push(`Schema validation failed: ${validation.error.issues[0]?.message ?? 'unknown error'}`);

    const repairContent = await repair(content, validation.error, provider, request);
    try {
      parsed = extractJson(repairContent);
    } catch (err) {
      warnings.push(`Repair parse failed: ${(err as Error).message}`);
      return { data: {}, confidence: {}, unknownFields: [], warnings };
    }

    validation = extractionOutputSchema.safeParse(parsed);
    if (!validation.success) {
      warnings.push(`Repair validation failed: ${validation.error.issues[0]?.message ?? 'unknown error'}`);
      return { data: {}, confidence: {}, unknownFields: [], warnings };
    }
    warnings.push('Output required one repair attempt');
  }

  const rawData = validation.data;
  const data: Record<string, unknown> = {};
  const confidence: Record<string, { status: VerificationStatus; signals: string[]; score: number }> = {};
  const unknownFields: string[] = [];

  // Use the user's original input text for confidence calculation
  const userMessage = request.messages.find((m) => m.role === 'user');
  const inputText = userMessage?.content ?? '';

  for (const [key, value] of Object.entries(rawData)) {
    const normalized = normalizeValue(value);
    data[key] = normalized;

    const fieldConf = calculateFieldConfidence(key, normalized, inputText);
    confidence[key] = {
      status: fieldConf.status,
      signals: fieldConf.signals,
      score: fieldConf.score,
    };

    if (normalized === null || fieldConf.status === 'NOT_FOUND') {
      unknownFields.push(key);
    }
  }

  return { data, confidence, unknownFields, warnings };
}