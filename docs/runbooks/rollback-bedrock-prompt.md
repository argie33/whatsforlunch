# Runbook: Bedrock Prompt Rollback

**When to use**: AI classification accuracy has degraded, or eval CI caught a regression after a prompt version bump.

## 1. Identify the bad prompt version

```bash
# Check current PROMPT_VERSION in the classify-food Lambda
aws lambda get-function-configuration \
  --function-name WFL-classify-food-staging \
  --query 'Environment.Variables.PROMPT_VERSION'
```

## 2. Revert PROMPT_VERSION

In `services/ai/classify-food/handler.ts`, find:

```typescript
const PROMPT_VERSION = 'v2';  // ← change back to previous version
```

Or override via env var without redeployment (faster):

```bash
aws lambda update-function-configuration \
  --function-name WFL-classify-food-staging \
  --environment "Variables={PROMPT_VERSION=v1}"
```

## 3. Verify

```bash
# Re-run the eval suite against staging
pnpm ai:eval classify-food --env staging

# Check accuracy is back within thresholds
```

## 4. Root cause

- Review the prompt diff between the bad version and the good version
- Check `services/ai/evals/` for the failing test cases
- Add the failing case to the eval dataset before re-introducing the prompt change

## SLA

Env-var override: < 1 minute (no redeploy).
Code rollback + deploy: < 5 minutes.
