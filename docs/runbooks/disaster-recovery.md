# Runbook: Disaster Recovery

**Last tested**: Fill in after each drill  
**Drill frequency**: Monthly (first Monday of each month)  
**Owner**: W1 (Infrastructure)

---

## Scope

This runbook covers three disaster tiers:

| Tier | Scenario                                     | RTO target | RPO target            |
| ---- | -------------------------------------------- | ---------- | --------------------- |
| 1    | Single Lambda or resolver error              | < 5 min    | zero (no data loss)   |
| 2    | DynamoDB data corruption / accidental delete | < 30 min   | < 5 min (PITR)        |
| 3    | Full CloudFormation stack deleted            | < 2 hours  | < 15 min (PITR + Git) |

---

## Tier 1 — Single-service failure

Lambda error spike, AppSync 5xx, resolver panic.

**See**: [rollback-cdk.md](rollback-cdk.md), [rollback-bedrock-prompt.md](rollback-bedrock-prompt.md)

---

## Tier 2 — DynamoDB Point-in-Time Recovery (PITR)

### When to trigger

- Alarm `wfl-dynamo-throttle-prod` fires AND item count drops unexpectedly
- Support ticket: "all my food items disappeared"
- Accidental `DeleteItem` or `BatchWriteItem` ran with wrong keys

### Step-by-step

```bash
# 1. Confirm PITR is enabled
aws dynamodb describe-continuous-backups \
  --table-name WFL-Main-prod \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription'

# Expected output includes:
#   "PointInTimeRecoveryStatus": "ENABLED"
#   "EarliestRestorableDateTime": "<timestamp>"
#   "LatestRestorableDateTime":   "<timestamp>"
```

```bash
# 2. Identify the recovery point
# Use a time ~2 minutes before the incident
RECOVERY_TIME="2026-04-27T14:22:00Z"   # ← replace with actual incident time minus 2 min

# 3. Restore to a new table
aws dynamodb restore-table-to-point-in-time \
  --source-table-name WFL-Main-prod \
  --target-table-name WFL-Main-prod-pitr-restore \
  --restore-date-time "$RECOVERY_TIME"
```

```bash
# 4. Wait for restore to complete (typically 5-30 min)
aws dynamodb wait table-exists --table-name WFL-Main-prod-pitr-restore

# Confirm item count
aws dynamodb describe-table \
  --table-name WFL-Main-prod-pitr-restore \
  --query 'Table.ItemCount'
```

```bash
# 5. Validate sample data
aws dynamodb scan \
  --table-name WFL-Main-prod-pitr-restore \
  --max-items 5 \
  --filter-expression 'entityType = :t' \
  --expression-attribute-values '{":t":{"S":"User"}}'
```

```bash
# 6. If data looks correct: hot-swap traffic
# Option A (preferred): Update CDK DataStack to point TABLE_NAME to restored table
# → Edit infra/cdk/lib/stacks/data-stack.ts tableName env override, redeploy API stack

# Option B (quick): Rename tables (requires no active DynamoDB streams consumer)
# aws dynamodb update-table --table-name WFL-Main-prod --table-status ...
# NOTE: DynamoDB table rename is not supported natively; use CDK redeploy path (Option A)
```

```bash
# 7. After traffic migrated: delete the original corrupted table
# ⚠️  DO NOT delete until data is confirmed good on restored table
aws dynamodb delete-table --table-name WFL-Main-prod   # ← only when explicitly confirmed safe
```

```bash
# 8. Rename restored table to production name via CDK
# Edit data-stack.ts: tableName: 'WFL-Main-prod'  (remove override)
cd infra/cdk
pnpm cdk deploy WFL-Data-prod --context env=prod --require-approval never
```

### Post-recovery

- [ ] Run smoke tests: `pnpm test:smoke:prod`
- [ ] Verify CloudWatch latency returns to baseline
- [ ] Notify affected users (if any data gap) via support@whatsforlunch.app
- [ ] File incident report in GitHub (label: `incident`)
- [ ] Update "Last tested" field at the top of this runbook

---

## Tier 3 — Full stack deleted (catastrophic)

CloudFormation stacks deleted or AWS account compromised.

```bash
# 1. Check what's gone
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[*].StackName'

# 2. Redeploy from code
git checkout main
cd infra/cdk
pnpm install
pnpm cdk bootstrap aws://ACCOUNT_ID/us-east-1 --context env=prod
pnpm cdk deploy --all --context env=prod --require-approval never
```

```bash
# 3. If DynamoDB table was also deleted, restore from PITR backup
# (the backup may still exist even if the table is gone — check backups)
aws dynamodb list-backups --table-name WFL-Main-prod

# If backup found:
aws dynamodb restore-table-from-backup \
  --target-table-name WFL-Main-prod \
  --backup-arn arn:aws:dynamodb:us-east-1:ACCOUNT:table/WFL-Main-prod/backup/BACKUP_ID
```

```bash
# 4. Re-configure secrets (Secrets Manager entries are separate from CDK stacks)
aws secretsmanager list-secrets --filter Key=name,Values=wfl

# Re-create any missing secrets:
aws secretsmanager create-secret \
  --name wfl/prod/apns-key \
  --secret-string "$(cat apns-key.p8)"
```

```bash
# 5. Re-enable GuardDuty and Security Hub
aws guardduty create-detector --enable
aws securityhub enable-security-hub
```

```bash
# 6. Verify full stack health
pnpm test:smoke:prod
```

---

## Monthly PITR drill

Run on the first Monday of each month against **staging** (not prod).

```bash
# 1. Find a point 30 min ago
TEST_TIME=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
           || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)   # macOS fallback

# 2. Restore staging table to test table
aws dynamodb restore-table-to-point-in-time \
  --source-table-name WFL-Main-staging \
  --target-table-name WFL-Main-staging-pitr-drill \
  --restore-date-time "$TEST_TIME"

# 3. Wait
aws dynamodb wait table-exists --table-name WFL-Main-staging-pitr-drill

# 4. Validate
ITEM_COUNT=$(aws dynamodb describe-table \
  --table-name WFL-Main-staging-pitr-drill \
  --query 'Table.ItemCount' \
  --output text)
echo "Restored item count: $ITEM_COUNT"

# 5. Clean up drill table
aws dynamodb delete-table --table-name WFL-Main-staging-pitr-drill

# 6. Log result
echo "PITR drill PASSED on $(date -u +%Y-%m-%d). Items restored: $ITEM_COUNT" \
  >> docs/runbooks/pitr-drill-log.txt
```

### Drill acceptance criteria

- Restore table exists within 30 minutes
- Item count matches source table ±1% (DynamoDB eventually consistent)
- No AWS console errors during restore
- Drill log entry added to `docs/runbooks/pitr-drill-log.txt`

---

## S3 recovery

Photos bucket (`wfl-photos-prod`) has versioning enabled. To restore a deleted object:

```bash
# List deleted versions
aws s3api list-object-versions \
  --bucket wfl-photos-prod \
  --prefix "households/<HOUSEHOLD_ID>/items/<ITEM_ID>" \
  --query 'DeleteMarkers[*].[Key,VersionId,LastModified]'

# Remove the delete marker (restores the object)
aws s3api delete-object \
  --bucket wfl-photos-prod \
  --key "households/<HOUSEHOLD_ID>/items/<ITEM_ID>/photo.jpg" \
  --version-id <DELETE_MARKER_VERSION_ID>
```

---

## Contacts

| Role               | Contact                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Primary on-call    | #oncall Slack or PagerDuty                                                                |
| AWS Support        | Business plan, case via console                                                           |
| Security incident  | security@whatsforlunch.app                                                                |
| DynamoDB PITR docs | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html |
