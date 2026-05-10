# Runbook: CDK Stack Rollback

**When to use**: A CDK deploy introduced a regression (Lambda error rate spiked, API returning 5xx, alarm fired).

## 1. Identify the bad deploy

```bash
# Find the last two deploys on the affected stack
aws cloudformation describe-stack-events \
  --stack-name WFL-API-staging \
  --query 'StackEvents[?ResourceStatus==`UPDATE_COMPLETE`].[Timestamp,LogicalResourceId]' \
  --max-items 20
```

## 2. Revert to previous version

```bash
# Check out the last known good commit
git log --oneline -10
git checkout <last-good-sha>

# Redeploy that version to the affected environment
cd infra/cdk
pnpm cdk deploy WFL-API-staging --context env=staging --require-approval never
```

## 3. Verify recovery

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name WFL-API-staging \
  --query 'Stacks[0].StackStatus'

# Run smoke tests
pnpm test:smoke:staging
```

## 4. Post-incident

- File a GitHub issue tagged `incident`
- Update the relevant doc if a process failed
- Post to `#deploys` with the incident summary

## SLA

Target: < 5 minutes from alert to rollback complete.
