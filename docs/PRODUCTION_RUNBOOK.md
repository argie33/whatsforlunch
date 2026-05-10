# Production Runbook — WhatsFresh

Operational procedures for production deployments, incident response, and disaster recovery.

## Environments

- **dev**: Personal developer sandboxes (`dev-<username>`)
- **staging**: Pre-release QA environment (auto-deployed from `main`)
- **prod**: Customer-facing production (manual tagged releases)

## Pre-deployment Checklist

Before deploying to staging or production:

```bash
# 1. Run full test suite
pnpm test

# 2. Type check
pnpm typecheck

# 3. Lint
pnpm lint

# 4. CDK synth (validate infrastructure)
pnpm --filter @wfl/infra cdk:synth --context env=staging
pnpm --filter @wfl/infra cdk:synth --context env=prod

# 5. Review IAM permissions
pnpm --filter @wfl/infra cdk diff --context env=prod

# 6. Check no breaking migrations
# (Review database migration files)
git log --oneline --grep="migration" HEAD~10..
```

## Deployment to Staging

Automatic on merge to `main`:

```bash
# Manually trigger if needed:
gh workflow run deploy-staging.yml -r main
```

**Wait for**: All checks to pass, CloudFormation status = CREATE_COMPLETE or UPDATE_COMPLETE

**Verify**:
```bash
# Get endpoint
aws cloudformation describe-stacks --stack-name WFL-API-staging \
  --query "Stacks[0].Outputs" | jq '.[] | select(.OutputKey=="AppSyncApiUrl")'

# Smoke test
curl -X POST https://<API_ENDPOINT>/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

## Production Deployment

Manual tagged releases only:

```bash
# 1. Tag release
git tag v1.2.3
git push origin v1.2.3

# 2. Monitor CI/CD (auto-triggers on tag)
gh workflow view deploy-production -w 50

# 3. Verify stack
aws cloudformation describe-stacks --stack-name WFL-API-prod --query "Stacks[0].StackStatus"

# 4. Smoke tests
pnpm test:e2e --env=prod

# 5. Monitor CloudWatch for 30 min
# Dashboard: https://console.aws.amazon.com/cloudwatch#dashboards:name=wfl-ops-prod
```

## Incident Response

### Lambda Function Errors

```bash
# Check logs
aws logs tail /aws/lambda/wfl-classify-food-prod --follow --since 5m

# Get correlation IDs from logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/wfl-classify-food-prod \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000

# Search Sentry for that correlation ID
# (Check Sentry dashboard: sentry.io/whatsfresh)
```

### AppSync Errors

```bash
# Check 5xx errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/AppSync \
  --metric-name GraphQL.ServerErrors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

# Get detailed logs
aws logs tail /aws/appsync/wfl-api-prod --follow

# Query test: GraphiQL
# Via AWS Console → AppSync → wfl-api-prod → Queries
```

### DynamoDB Throttling

```bash
# Check consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=wfl-main-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

# Check throttled requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=wfl-main-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

**If throttling**: Scale up provisioned capacity (temporary) or enable auto-scaling.

### Database Issue

```bash
# Check table status
aws dynamodb describe-table --table-name wfl-main-prod \
  --query "Table.TableStatus"

# Point-in-time recovery available?
aws dynamodb describe-continuous-backups --table-name wfl-main-prod \
  --query "ContinuousBackupsDescription"

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name wfl-main-prod-restored \
  --backup-arn arn:aws:dynamodb:us-east-1:ACCOUNT:table/wfl-main-prod/backup/BACKUP_ID
```

## Disaster Recovery

### Point-in-Time Recovery (PITR) Test

Run monthly to verify recovery capability:

```bash
# 1. List available recovery points
aws dynamodb describe-continuous-backups --table-name wfl-main-prod

# 2. Restore to test table (30 min ago)
TEST_TIME=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ)
aws dynamodb restore-table-to-point-in-time \
  --source-table-name wfl-main-prod \
  --target-table-name wfl-main-prod-pitr-test \
  --use-latest-restorable-time

# 3. Validate data
aws dynamodb scan --table-name wfl-main-prod-pitr-test --limit 10

# 4. Delete test table
aws dynamodb delete-table --table-name wfl-main-prod-pitr-test

# 5. Document: "PITR test passed on <DATE>"
```

### Full Stack Recovery

If entire CloudFormation stack is deleted (CATASTROPHIC):

```bash
# 1. Restore infrastructure from code
pnpm cdk:deploy --context env=prod --require-approval never

# 2. Restore database from backup
aws dynamodb restore-table-to-point-in-time \
  --source-table-name wfl-main-prod \
  --target-table-name wfl-main-prod-restored \
  --use-latest-restorable-time

# 3. Migrate data (if needed)
# Run migration Lambda or script to copy data from -restored to new table

# 4. Verify
pnpm test:e2e --env=prod

# 5. Document incident in runbook addendum
```

## Monitoring

### Dashboards

- **Operations**: https://console.aws.amazon.com/cloudwatch#dashboards:name=wfl-ops-prod
- **X-Ray Service Map**: https://console.aws.amazon.com/xray/home#/service-map
- **CloudTrail Audit**: https://console.aws.amazon.com/cloudtrail/home

### Alarms

Alerts configured via SNS:
- ops@whatsfresh.app (medium severity)
- Page PagerDuty for critical (manual setup post-launch)

**Test alert**: `aws sns publish --topic-arn arn:aws:sns:us-east-1:ACCOUNT:wfl-alerts-prod --message "Test alert"`

### Log Retention

- CloudTrail: 7 years (Glacier)
- CloudWatch Logs: 7 days
- Application Logs (Sentry): 90 days

## Cost Management

### Monitor Spending

```bash
# Daily cost
aws ce list-cost-allocation-tags --status Active \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["DynamoDB","Lambda","AppSync"]}}'

# Projected monthly
aws ce get-cost-and-usage \
  --time-period Start=$(date -d 'first day of this month' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Cost Alerts

- DynamoDB: Alert if >$1000/day (likely error loop)
- Lambda: Alert if >$500/day (likely infinite invocation)
- AI (Bedrock): Monitored per-user (max $10/day prod, $1000/day dev)

## Escalation Contacts

- **On-call**: Slack #oncall or PagerDuty
- **AWS Support**: Business support (4-hour response)
- **Security incident**: security@whatsfresh.app

## Runbook Updates

Update this document when:
- [ ] New infrastructure added
- [ ] New alert created
- [ ] Incident procedures change
- [ ] Recovery processes updated

Last updated: `auto-generated on deploy`
Last tested: `PITR recovery passed YYYY-MM-DD`

---

**Emergency?** Start with incident response section above. Escalate if unsure.
