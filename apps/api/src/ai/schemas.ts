import { z } from 'zod';

const fieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export const extractionOutputSchema = z.record(z.string(), fieldValueSchema);

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

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
