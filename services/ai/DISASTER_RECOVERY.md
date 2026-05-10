# 🔄 Disaster Recovery & Backup Procedures (Production)

**Purpose**: Protect data and enable rapid recovery from catastrophic failures  
**RTO**: Restore service within 30 minutes  
**RPO**: Lose at most 1 hour of data  
**Owner**: W1 (CDK/Infrastructure) + W4 (AI Lambda)

---

## Failure Scenarios

| Scenario                  | Severity | Impact                      | RTO     | Recovery                     |
| ------------------------- | -------- | --------------------------- | ------- | ---------------------------- |
| DynamoDB table corrupted  | P1       | Data loss                   | 30 min  | PITR to last clean snapshot  |
| S3 bucket compromised     | P1       | Photo loss                  | 30 min  | Restore from versioning      |
| Lambda code bug (deploy)  | P1       | Wrong classifications       | 5 min   | Rollback to previous version |
| Bedrock service outage    | P2       | Classification unavailable  | 1 hour  | Fallback to mock client      |
| All us-east-1 unavailable | P1       | Complete service down       | 2 hours | Manual failover to us-west-2 |
| Accidental data deletion  | P2       | Classification history lost | 1 hour  | PITR restore                 |

---

## Data Backup Strategy

### DynamoDB Backup

**Current Configuration:**

- Point-in-Time Recovery (PITR): ✅ Enabled (35 day retention)
- Continuous backups: ✅ Automatic (every 5 minutes)
- On-demand backups: Manual as needed

**How It Works:**

```
DynamoDB maintains transaction log + snapshots
Every transaction is logged + replicated
PITR allows restore to ANY point in last 35 days
Granularity: Second-level (restore to exact timestamp)
```

**Restore Procedure (If Data Corrupted):**

```bash
# 1. Identify corruption time (e.g., 2026-04-27 14:30:00 UTC)
# 2. Restore to 1 minute before corruption
aws dynamodb restore-table-to-point-in-time \
  --source-table-name ai_classifications \
  --target-table-name ai_classifications-restored \
  --restore-date-time 2026-04-27T14:29:00Z \
  --region us-east-1

# 3. Verify data integrity
aws dynamodb scan \
  --table-name ai_classifications-restored \
  --filter-expression "attribute_exists(classification)" \
  --limit 10

# 4. Rename tables (point traffic to restored)
# Option A (manual): Update Lambda env var to use ai_classifications-restored
# Option B (automated): Update DynamoDB table alias

# 5. Verify application works
node health-check.mjs

# 6. Delete old corrupted table
aws dynamodb delete-table --table-name ai_classifications
```

**Time to Restore**: 30-60 seconds (restore operation) + 5 min (traffic switch)

**Cost of PITR**: Included in DynamoDB on-demand pricing (no additional cost)

---

### S3 Bucket Backup (Photo Storage)

**Current Configuration:**

- Versioning: ✅ Enabled (keep all versions)
- Lifecycle: Delete old -resized images only (keep originals indefinitely)
- Cross-region replication: ❌ Not enabled (upgrade for HA)

**How It Works:**

```
Every upload creates new object version
Old versions are retained indefinitely
Can restore any version at any time
Cost: ~$0.023/GB per version
```

**Restore Procedure (If Photo Deleted or Corrupted):**

```bash
# 1. List all versions of a photo
aws s3api list-object-versions \
  --bucket wfl-photos \
  --prefix items/item-123.jpg \
  --region us-east-1

# Output example:
# {
#   "Versions": [
#     {
#       "Key": "items/item-123.jpg",
#       "VersionId": "abc123xyz...",
#       "LastModified": "2026-04-27T14:30:00Z",
#       "Size": 150000
#     },
#     {
#       "Key": "items/item-123.jpg",
#       "VersionId": "def456uvw...",
#       "LastModified": "2026-04-26T10:15:00Z",
#       "Size": 155000
#     }
#   ]
# }

# 2. Copy desired version to current
aws s3api copy-object \
  --bucket wfl-photos \
  --copy-source wfl-photos/items/item-123.jpg?versionId=abc123xyz \
  --key items/item-123.jpg \
  --region us-east-1

# 3. Verify restore
aws s3 head-object --bucket wfl-photos --key items/item-123.jpg
```

**Time to Restore**: <1 minute per photo

**Cost of Versioning**: ~$0.023/GB × number of versions

- At 1000 items × 3 versions = 3000 objects = $75/month per GB
- Keep only 3-5 recent versions to control cost

**Recommendation**: Enable lifecycle to delete old versions after 30 days

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket wfl-photos \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "delete-old-versions",
        "Filter": {"Prefix": "items/"},
        "NoncurrentVersionExpiration": {"NoncurrentDays": 30},
        "Status": "Enabled"
      }
    ]
  }'
```

---

### Lambda Code Backup (Rollback)

**Current Configuration:**

- CI/CD: GitHub (git history)
- Lambda versions: Manual tagging recommended
- Rollback: <30 seconds (update-function-code)

**How It Works:**

```
Keep Lambda function code in git
Tag releases: v1.0.0, v1.0.1, v1.0.2
Store Lambda zip files in S3: s3://wfl-lambdas/classify-food-v1.0.0.zip
If deployed version has bugs, redeploy from previous zip
```

**Rollback Procedure (If Deploy Breaks Production):**

```bash
# 1. Detect the issue (CloudWatch error spike)
# Symptom: Error rate >5% for 1+ minute

# 2. Identify previous working version
# From deployment history or git tags
PREVIOUS_VERSION="v1.0.1"

# 3. Rollback Lambda code
aws lambda update-function-code \
  --function-name classify-food-lambda \
  --s3-bucket wfl-lambdas \
  --s3-key classify-food-${PREVIOUS_VERSION}.zip \
  --region us-east-1

# 4. Verify rollback (wait for Lambda to re-initialize)
sleep 5

# 5. Run health check
node health-check.mjs

# Expected: All 27 health checks pass
```

**Time to Rollback**: <30 seconds

**Cost of Code Backup**: Minimal (~100 MB per version × 5 versions = 500 MB in S3 = $0.01/month)

---

## High-Availability Failover (Regional)

**Current Setup**: Single region (us-east-1)

**Failover Scenario**: If entire us-east-1 is down (outage, natural disaster)

### Pre-Failover Setup (One-time, before launch)

**1. Enable Cross-Region Replication for S3:**

```bash
# Replicate photos from us-east-1 to us-west-2
aws s3api put-bucket-replication \
  --bucket wfl-photos \
  --replication-configuration '{
    "Role": "arn:aws:iam::ACCOUNT:role/s3-replication",
    "Rules": [{
      "Status": "Enabled",
      "Priority": 1,
      "Destination": {
        "Bucket": "arn:aws:s3:::wfl-photos-backup",
        "ReplicationTime": {"Status": "Enabled", "Time": {"Minutes": 15}}
      }
    }]
  }'

# Creates replica bucket in us-west-2 (s3://wfl-photos-backup)
# New uploads replicate within 15 minutes
```

**2. Enable DynamoDB Global Tables (Optional, for HA):**

```bash
# Replicate ai_classifications table to us-west-2
aws dynamodb create-global-table \
  --global-table-name ai_classifications \
  --replication-group RegionName=us-east-1,RegionName=us-west-2
```

**3. Deploy Standby Lambda (Optional):**

```bash
# Deploy identical Lambda stack to us-west-2
# Update environment: AWS_REGION=us-west-2
# Don't activate unless primary region fails
```

### During Failover (If us-east-1 Down)

**1. Detect Outage** (5-10 minutes)

```bash
# CloudWatch alarm: "All Lambda functions unavailable for 5 min"
# Triggers SNS notification to oncall
```

**2. Initiate Failover** (manual)

```bash
# 1. Update AppSync to point to us-west-2 Lambda
aws appsync update-data-source \
  --api-id YOUR_API_ID \
  --name ClassifyFoodLambda \
  --service-role-arn arn:aws:iam::ACCOUNT:role/appsync-role \
  --lambda-config functionArn=arn:aws:lambda:us-west-2:ACCOUNT:function:classify-food-lambda

# 2. Update mobile app to use us-west-2 endpoint
# (Requires app update or env var change)

# 3. Verify failover
node health-check.mjs --region us-west-2
```

**3. Post-Failover**

```bash
# 1. Monitor error rate (should be <1%)
# 2. Check latency (may be higher due to region distance)
# 3. Monitor cost (multi-region = 2x cost)
# 4. Wait for us-east-1 to recover
# 5. Failback to us-east-1 (reverse steps above)
```

**RTO (Regional Failover)**: 15-30 minutes
**Cost During Failover**: 2x normal (dual active)

---

## Disaster Recovery Checklist

### Monthly DR Drill (1st of month)

**1. Test DynamoDB PITR Restore** (15 min)

```bash
# 1. Create test table from PITR
aws dynamodb restore-table-to-point-in-time \
  --source-table-name ai_classifications \
  --target-table-name ai_classifications-test-restore \
  --restore-date-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --region us-east-1

# 2. Verify record count matches
aws dynamodb scan --table-name ai_classifications-test-restore \
  --select COUNT --output text | awk '{print "Restored records: " $1}'

aws dynamodb scan --table-name ai_classifications \
  --select COUNT --output text | awk '{print "Current records: " $1}'

# 3. Delete test table
aws dynamodb delete-table --table-name ai_classifications-test-restore
```

**Expected**: <1 minute to restore, record counts match

**2. Test Lambda Rollback** (5 min)

```bash
# 1. Check current Lambda version
aws lambda get-function --function-name classify-food-lambda \
  --query 'Configuration.CodeSha256'

# 2. Simulate rollback
aws lambda update-function-code \
  --function-name classify-food-lambda \
  --s3-bucket wfl-lambdas \
  --s3-key classify-food-v1.0.0.zip

# 3. Verify health
node health-check.mjs

# 4. Rollback to current
aws lambda update-function-code \
  --function-name classify-food-lambda \
  --s3-bucket wfl-lambdas \
  --s3-key classify-food-current.zip
```

**Expected**: Rollback succeeds, health checks pass

**3. Test S3 Version Recovery** (5 min)

```bash
# 1. Pick a test photo
TEST_PHOTO="items/test-photo.jpg"

# 2. List versions
aws s3api list-object-versions \
  --bucket wfl-photos \
  --prefix $TEST_PHOTO | jq '.Versions | length'

# 3. Restore from second-newest version
VERSION_ID=$(aws s3api list-object-versions \
  --bucket wfl-photos \
  --prefix $TEST_PHOTO \
  --query 'Versions[1].VersionId' -o text)

aws s3api copy-object \
  --bucket wfl-photos \
  --copy-source wfl-photos/$TEST_PHOTO?versionId=$VERSION_ID \
  --key $TEST_PHOTO

# 4. Verify restored
aws s3 head-object --bucket wfl-photos --key $TEST_PHOTO
```

**Expected**: Restore succeeds, version restored

**4. Backup Status Check** (5 min)

```bash
# 1. Verify PITR is enabled
aws dynamodb describe-table --table-name ai_classifications \
  --query 'Table.ContinuousBackupsDescription.PointInTimeRecoveryDescription'

# Expected: Status = ENABLED

# 2. Verify S3 versioning
aws s3api get-bucket-versioning --bucket wfl-photos \
  --query 'Status'

# Expected: Status = Enabled

# 3. Verify backup bucket exists
aws s3 ls | grep wfl-photos-backup || echo "⚠️  No backup bucket found"
```

### Post-Incident Actions

After any production incident:

```bash
# 1. Was backup needed? (y/n)
#    If YES: Document what failed and why backup saved you

# 2. Review backup strategy
#    - Is PITR configured? (should be)
#    - Is S3 versioning sufficient? (should be)
#    - Can we restore in <30 min? (should be)

# 3. Update disaster recovery plan if needed
#    - Faster detection? (reduce RTO)
#    - Faster recovery? (test procedures)
#    - Prevent recurrence? (add monitoring)

# 4. Document incident + recovery in runbook
#    Path: INCIDENT_RESPONSE.md
```

---

## Data Consistency Validation

### Weekly Consistency Check

**Verify DynamoDB data matches expectations:**

```bash
# 1. Count total records
TOTAL=$(aws dynamodb scan --table-name ai_classifications \
  --select COUNT --output text | awk '{print $1}')
echo "Total ai_classifications records: $TOTAL"

# 2. Count records per user
aws dynamodb scan --table-name ai_classifications \
  --projection-expression userId \
  --output text | awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# 3. Check for orphaned records (missing userId)
aws dynamodb scan --table-name ai_classifications \
  --filter-expression "attribute_not_exists(userId)" \
  --select COUNT --output text

# Expected: 0 orphaned records
```

### Monthly Data Audit

**Verify recent records are valid:**

```bash
# 1. Sample 20 recent records
aws dynamodb scan --table-name ai_classifications \
  --limit 20 \
  --projection-expression userId,taskType,costUsd,createdAt \
  --output json | jq '.Items'

# 2. Check for anomalies:
#    - Missing fields? (should be complete)
#    - Negative costs? (should be positive)
#    - Future timestamps? (should be past)
#    - All taskTypes valid? (classify_food, ocr_expiry_date, image_resize)
```

---

## Backup Retention Policy

| Data             | Backup Method      | Retention                 | Cost                 | RTO    |
| ---------------- | ------------------ | ------------------------- | -------------------- | ------ |
| DynamoDB         | PITR               | 35 days                   | Included             | 30-60s |
| DynamoDB         | On-demand snapshot | Manual (keep 1-2)         | $0.10/GB             | 30-60s |
| S3 photos        | Versioning         | 30 days (lifecycle)       | $0.023/GB × versions | <1 min |
| S3 backup region | Replication        | Same as primary           | Matched storage      | 15 min |
| Lambda code      | S3 + git           | All releases (5 versions) | $0.01/month          | <30s   |
| CloudWatch logs  | Logs export        | 30 day retention          | Included             | N/A    |

---

## Backup Size Estimation

### Monthly Data Growth

```
DynamoDB (ai_classifications):
  - 1000 calls/day = 30,000 records/month
  - Each record: ~1 KB
  - Growth: ~30 MB/month
  - Storage cost: $0.25/month (negligible)

S3 (photos):
  - 1000 items/day = 30,000 items/month
  - Each photo: ~500 KB original + 250 KB resized
  - Raw: ~22.5 GB/month
  - After -resized cleanup (7-day lifecycle): ~3.5 GB/month
  - Versioning (30-day retention): ~3 versions = ~10.5 GB
  - Storage cost: ~$0.25/month (at current scale)

Lambda backup:
  - 5 versions × 50 MB each = 250 MB = $0.006/month
```

### Backup Cost Summary

- **DynamoDB PITR**: Included (no extra cost)
- **S3 versioning**: ~$0.25/month
- **S3 replication** (if enabled): ~$0.20/month (cross-region copy)
- **Lambda backup**: ~$0.006/month
- **Total backup cost**: ~$0.45/month (0.08% of total)

---

## Security Considerations

### Backup Encryption

```bash
# DynamoDB PITR: Encrypted with same key as source table
# S3 bucket: Encrypted with KMS (verify)
# S3 replication: Encrypted in transit (HTTPS) and at rest (KMS)
# Lambda backup: Stored in encrypted S3 (verify)

# Verify all backups encrypted:
aws dynamodb describe-table --table-name ai_classifications \
  --query 'Table.SSEDescription'

aws s3api get-bucket-encryption --bucket wfl-photos

aws s3api get-bucket-encryption --bucket wfl-photos-backup
```

### Backup Access Control

```bash
# DynamoDB: PITR access via IAM (only admin role)
# S3 backup bucket: Private (no public access)
# Lambda backup: S3 bucket with restricted access
# CloudWatch logs: Encrypted with CloudWatch Logs key

# Principle: Backups as secure as production data
```

---

## Runbook Summary

**If DynamoDB data is corrupted:**

1. Identify corruption time (from logs or user report)
2. Restore table via PITR to 1 min before corruption
3. Verify data integrity (health-check.mjs)
4. Switch traffic to restored table
5. Delete corrupted table

**If S3 photos are deleted/corrupted:**

1. List object versions: `aws s3api list-object-versions`
2. Find desired version
3. Restore via copy-object
4. Verify in application

**If Lambda code has bugs:**

1. Detect via CloudWatch error spike
2. Find previous working version
3. Rollback via update-function-code
4. Verify health-check.mjs passes
5. Investigate + fix root cause

**If entire region us-east-1 fails:**

1. Failover to us-west-2 Lambda + DynamoDB
2. Switch AppSync data source
3. Wait for region recovery
4. Failback to us-east-1

---

**Last Updated**: 2026-04-27  
**Next Review**: Monthly DR drill (1st of month)  
**Owner**: W1 (CDK/Infrastructure) + W4 (Operations)

**Backup Status**: ✅ PITR + Versioning Enabled, Ready for Production
