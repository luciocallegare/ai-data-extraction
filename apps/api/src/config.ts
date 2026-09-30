import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/extract'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars').default('dev-secret-change-me'),
  LLM_PROVIDER: z.enum(['mock', 'openai', 'anthropic']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
