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
  stream?(request: LLMRequest): AsyncIterable<string>;
}

export interface ExtractionResult {
  data: Record<string, unknown>;
  confidence: Record<string, number>;
  unknownFields: string[];
  warnings: string[];
}
