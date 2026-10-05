export interface LLMRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

export interface LLMProvider {
  complete(request: LLMRequest): Promise<LLMResult>;
  stream?(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: { promptTokens: number; completionTokens: number };
  model?: string;
}

export type VerificationStatus = 'VERIFIED' | 'UNCERTAIN' | 'NOT_FOUND';

export interface FieldConfidence {
  status: VerificationStatus;
  signals: string[];
  score: number; // 0-100 heuristic score
}

export interface ExtractionConfidence {
  [fieldName: string]: FieldConfidence;
}

export interface ExtractionResult {
  data: Record<string, unknown>;
  confidence: Record<string, FieldConfidence>;
  unknownFields: string[];
  warnings: string[];
}
