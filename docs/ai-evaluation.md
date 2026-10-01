# AI Evaluation Strategy

How to measure quality, detect regressions, and handle wrong answers in production.

## Golden Dataset

Located at `apps/api/eval/golden.json` — ~10 representative cases covering:
- Emails (contact info)
- Invoices (amounts, dates, emails)
- Job postings (salary, dates, contact)
- Support tickets (emails, amounts, dates)
- Meetings (dates, URLs, phones)

Each case has:
```json
{
  "id": "invoice-1",
  "input": "Invoice total is $1,250.00 due by 03/15/2026. Contact billing@acme.com",
  "expected": { "amounts": ["$1,250.00"], "dates": ["03/15/2026"], "emails": ["billing@acme.com"] }
}
```

## Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Field-level accuracy** | `correct_fields / total_expected_fields` across all cases | > 90% |
| **Schema validity rate** | `% of outputs that pass Zod schema without repair` | 100% (with repair) |
| **Repair rate** | `% of outputs requiring repair retry` | < 5% |
| **Latency p95** | End-to-end extraction time | < 2s (mock), < 5s (real LLM) |
| **Token cost** | Average tokens per extraction | Track per provider |

## Running the Eval

```bash
cd apps/api
npm run eval
```

Output:
```
=== Eval Results ===

  email-1: accuracy=100% schemaValid=true
  email-2: accuracy=100% schemaValid=true
  invoice-1: accuracy=100% schemaValid=true
  ...

  Overall field accuracy: 95.2%
  Schema validity rate:  100.0%
  Cases evaluated:       10
```

The runner uses `MockProvider` (deterministic, no API key) so it runs in CI.

## CI Integration

Add to your pipeline:
```yaml
- name: Run AI eval
  run: |
    cd apps/api
    npm ci
    npm run eval
  # Fail if accuracy drops below threshold
```

Example threshold check (pseudo):
```bash
ACCURACY=$(npm run eval 2>&1 | grep "Overall field accuracy" | sed 's/.*: \([0-9.]*\)%.*/\1/')
if (( $(echo "$ACCURACY < 90" | bc -l) )); then
  echo "Accuracy regression detected: $ACCURACY%"
  exit 1
fi
```

## Detecting Regressions After Prompt/Model Changes

1. **Baseline** — Record metrics after each successful prompt/model change (commit hash + metrics).
2. **Compare** — On PR, run eval against baseline. Flag if:
   - Field accuracy drops > 2%
   - Schema validity drops
   - New repair failures appear
3. **Investigate** — Look at specific failing cases; often a prompt tweak broke one pattern.

## Handling "AI Gives Wrong Answer" in Production

### 1. Feedback Button (UI)
- "Flag incorrect" button on `/extractions/[id]`
- POST `/extractions/:id/feedback` → stores `{ extractionId, userId, field, expectedValue, comment }`
- Review queue in admin dashboard

### 2. Prompt Rollback
- Each extraction stores `promptVersion` and `model`
- If regression detected: revert prompt YAML, redeploy, or flip `LLM_PROVIDER` to previous model
- Can also deploy multiple prompt versions behind a feature flag for A/B

### 3. Review Queue
- Scheduled job: pull extractions with `feedback` or low confidence (`unknownFields.length > 0`)
- Human reviews, corrects, adds to golden dataset
- Retrain/fine-tune if pattern emerges (future)

### 4. Alerting
- CloudWatch alarm on `postProcessor` warnings > threshold
- Log structured warning events for SIEM

## Extending the Golden Dataset

1. Add new case to `apps/api/eval/golden.json`
2. Run `npm run eval` — should pass with current prompt
3. If it fails, adjust prompt in `prompts/extraction.v1.yaml` and re-run
4. Commit both — this *is* the regression test

## Future Improvements

- **Embedding-based similarity** for fuzzy matching (e.g., "$1,250" vs "1250.00")
- **Per-field confidence calibration** using historical accuracy
- **A/B testing framework** for prompt versions
- **Automatic golden set expansion** from flagged production data