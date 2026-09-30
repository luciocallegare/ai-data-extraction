import type { LLMProvider, LLMRequest, ExtractionResult } from './types.js';
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
  const confidence: Record<string, number> = {};
  const unknownFields: string[] = [];

  for (const [key, value] of Object.entries(rawData)) {
    const normalized = normalizeValue(value);
    data[key] = normalized;

    if (normalized === null) {
      confidence[key] = 0.2;
      unknownFields.push(key);
    } else {
      confidence[key] = 0.9;
    }
  }

  return { data, confidence, unknownFields, warnings };
}
