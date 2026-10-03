import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, LLMRequest, LLMResult, LLMStreamChunk } from '../types.js';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash-001') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async complete(request: LLMRequest): Promise<LLMResult> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const systemMessage = request.messages.find((m) => m.role === 'system');
    const userMessages = request.messages.filter((m) => m.role !== 'system');

    const prompt = userMessages.map((m) => m.content).join('\n\n');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemMessage?.content,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      },
    });

    const response = result.response;
    const content = response.text();

    

    // Fallback to estimation if usage metadata is not available
    const usageMetadata = result.response.usageMetadata;
    const promptTokens = usageMetadata?.promptTokenCount ?? this.estimateTokens(prompt);
    const completionTokens = usageMetadata?.candidatesTokenCount ?? this.estimateTokens(content);

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
      },
      model: this.modelName,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const systemMessage = request.messages.find((m) => m.role === 'system');
    const userMessages = request.messages.filter((m) => m.role !== 'system');

    const prompt = userMessages.map((m) => m.content).join('\n\n');

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemMessage?.content,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      },
    });

    let accumulated = '';
    for await (const chunk of result.stream) {
      const delta = chunk.text();
      if (delta) {
        accumulated += delta;
        yield { content: accumulated, done: false };
      }
    }

    const finalResponse = await result.response;

    const usage = finalResponse.usageMetadata;

    const promptTokens = usage?.promptTokenCount ?? this.estimateTokens(prompt);
    const completionTokens = usage?.candidatesTokenCount ?? this.estimateTokens(accumulated);

    yield {
      content: accumulated,
      done: true,
      usage: {
        promptTokens,
        completionTokens,
      },
      model: this.modelName,
    };
  }
}