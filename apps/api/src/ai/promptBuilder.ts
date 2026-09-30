import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

export interface PromptTemplate {
  version: string;
  model: string;
  temperature: number;
  maxTokens: number;
  system: string;
  userTemplate: string;
}

export function loadPromptTemplate(version: string): PromptTemplate {
  const filePath = resolve(process.cwd(), 'prompts', `extraction.${version}.yaml`);
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = parse(raw) as Record<string, unknown>;
  return {
    version: parsed.version as string,
    model: parsed.model as string,
    temperature: parsed.temperature as number,
    maxTokens: parsed.max_tokens as number,
    system: parsed.system as string,
    userTemplate: parsed.user_template as string,
  };
}

export function buildMessages(
  template: PromptTemplate,
  userText: string,
): { role: 'system' | 'user'; content: string }[] {
  const userContent = template.userTemplate.replace('{{user_text}}', userText);
  return [
    { role: 'system', content: template.system },
    { role: 'user', content: userContent },
  ];
}
