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
