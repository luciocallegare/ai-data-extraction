import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadPromptTemplate, buildMessages } from '../src/ai/promptBuilder.js';
import { processExtraction } from '../src/ai/postProcessor.js';
import { MockProvider } from '../src/ai/providers/mock.js';

interface GoldenCase {
  id: string;
  input: string;
  expected: Record<string, unknown>;
}

function main() {
  const goldenPath = resolve(process.cwd(), 'eval', 'golden.json');
  const cases: GoldenCase[] = JSON.parse(readFileSync(goldenPath, 'utf-8'));

  const template = loadPromptTemplate('v1');
  const provider = new MockProvider({ errorRate: 0 });

  let totalFields = 0;
  let correctFields = 0;
  let schemaValidCount = 0;
  const results: { id: string; accuracy: number; valid: boolean }[] = [];

  for (const testCase of cases) {
    const messages = buildMessages(template, testCase.input);
    const request = {
      messages,
      model: template.model,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
    };

    const llmResult = await provider.complete(request);
    const processed = await processExtraction(llmResult.content, provider, request);

    const expectedKeys = Object.keys(testCase.expected);
    let caseCorrect = 0;

    for (const key of expectedKeys) {
      totalFields++;
      const actual = processed.data[key];
      const expected = testCase.expected[key];

      if (JSON.stringify(actual) === JSON.stringify(expected)) {
        correctFields++;
        caseCorrect++;
      }
    }

    const accuracy = expectedKeys.length > 0 ? caseCorrect / expectedKeys.length : 1;
    const valid = processed.warnings.length === 0 || !processed.warnings.some((w) => w.includes('failed'));
    if (valid) schemaValidCount++;

    results.push({ id: testCase.id, accuracy, valid });
  }

  const overallAccuracy = totalFields > 0 ? correctFields / totalFields : 0;
  const schemaValidityRate = cases.length > 0 ? schemaValidCount / cases.length : 0;

  console.log('\n=== Eval Results ===\n');
  for (const r of results) {
    console.log(`  ${r.id}: accuracy=${(r.accuracy * 100).toFixed(0)}% schemaValid=${r.valid}`);
  }
  console.log(`\n  Overall field accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);
  console.log(`  Schema validity rate:  ${(schemaValidityRate * 100).toFixed(1)}%`);
  console.log(`  Cases evaluated:       ${cases.length}`);
  console.log('');
}

main();
