#!/usr/bin/env node

/**
 * Deploy Day 6 Automation Script
 *
 * Purpose: Automated mock→production flip for Phase C launch
 * Run: node deploy-day6.mjs
 *
 * Tasks:
 * 1. Verify AWS infrastructure is ready (Lambda, DynamoDB, S3, IAM)
 * 2. Update Lambda code to use production clients
 * 3. Run health check to validate connectivity
 * 4. Verify cost tracking accuracy
 * 5. Deploy monitoring and alerts
 * 6. Generate deployment report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Configuration
const AWS_REGION = 'us-east-1';
const LAMBDAS = [
  'classify-food-lambda',
  'ocr-expiry-date-lambda',
  'image-resize-lambda'
];
const DYNAMODB_TABLE = 'ai_classifications';
const S3_BUCKET = 'wfl-photos';

let report = {
  timestamp: new Date().toISOString(),
  checks: [],
  errors: [],
  warnings: [],
  actions: []
};

// Helper functions
function addCheck(name, passed, message = '') {
  report.checks.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}${message ? ': ' + message : ''}`);
}

function addError(message) {
  report.errors.push(message);
  console.log(`❌ ERROR: ${message}`);
}

function addWarning(message) {
  report.warnings.push(message);
  console.log(`⚠️  WARNING: ${message}`);
}

function addAction(message) {
  report.actions.push(message);
  console.log(`📋 ACTION: ${message}`);
}

async function checkCommand(command, successText = '') {
  try {
    const { stdout } = await execAsync(command);
    return { success: true, output: stdout.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Phase 1: AWS Infrastructure Validation
async function validateInfrastructure() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ PHASE 1: AWS Infrastructure Validation                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check AWS credentials
  const credCheck = await checkCommand('aws sts get-caller-identity');
  if (credCheck.success) {
    const identity = JSON.parse(credCheck.output);
    addCheck('AWS Credentials Valid', true, `Account: ${identity.Account}`);
  } else {
    addError('AWS credentials not configured. Run: aws configure');
    return false;
  }

  // Check Lambda functions exist
  for (const lambda of LAMBDAS) {
    const check = await checkCommand(
      `aws lambda get-function --function-name ${lambda} --region ${AWS_REGION} --query 'Configuration.FunctionName'`
    );
    addCheck(`Lambda: ${lambda}`, check.success);
    if (!check.success) addAction(`Deploy Lambda: ${lambda}`);
  }

  // Check DynamoDB table
  const dbCheck = await checkCommand(
    `aws dynamodb describe-table --table-name ${DYNAMODB_TABLE} --region ${AWS_REGION} --query 'Table.TableStatus'`
  );
  if (dbCheck.success && dbCheck.output.includes('ACTIVE')) {
    addCheck(`DynamoDB: ${DYNAMODB_TABLE}`, true, 'Status: ACTIVE');
  } else {
    addError(`DynamoDB table ${DYNAMODB_TABLE} not found or not ACTIVE`);
    addAction(`Create DynamoDB table: ${DYNAMODB_TABLE}`);
  }

  // Check S3 bucket
  const s3Check = await checkCommand(
    `aws s3 ls s3://${S3_BUCKET} --region ${AWS_REGION}`
  );
  addCheck(`S3 Bucket: ${S3_BUCKET}`, s3Check.success);
  if (!s3Check.success) {
    addAction(`Create S3 bucket: ${S3_BUCKET}`);
  }

  // Check IAM roles
  for (const lambda of LAMBDAS) {
    const roleName = `${lambda}-role`;
    const roleCheck = await checkCommand(
      `aws iam get-role --role-name ${roleName} --query 'Role.RoleName'`
    );
    addCheck(`IAM Role: ${roleName}`, roleCheck.success);
  }

  // Check Bedrock access
  const bedrockCheck = await checkCommand(
    `aws bedrock list-foundation-models --region ${AWS_REGION} --query 'modelSummaries[?contains(modelId, \`claude-3-5-haiku\`)]'`
  );
  if (bedrockCheck.success) {
    addCheck('Bedrock: Claude 3.5 Haiku', true);
  } else {
    addWarning('Bedrock models not accessible. Verify region supports Bedrock.');
    addAction('Enable Bedrock models in AWS region.');
  }

  // Check Textract access
  const textractCheck = await checkCommand(
    `aws textract list-adapter-versions --region ${AWS_REGION}`
  );
  addCheck('Textract Service', textractCheck.success);

  return report.errors.length === 0;
}

// Phase 2: Update Lambda Code (Mock → Production)
async function updateLambdaCode() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ PHASE 2: Update Lambda Code (Mock → Production)           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const files = [
    {
      path: 'services/ai/classify-food/src/index.ts',
      find: 'const USE_MOCK_BEDROCK = true;',
      replace: 'const USE_MOCK_BEDROCK = false;'
    },
    {
      path: 'services/ai/ocr-expiry-date/src/index.ts',
      find: 'const USE_MOCK_TEXTRACT = true;',
      replace: 'const USE_MOCK_TEXTRACT = false;'
    },
    {
      path: 'services/ai/image-resize/src/index.ts',
      find: 'const USE_MOCK_S3 = true;',
      replace: 'const USE_MOCK_S3 = false;'
    }
  ];

  for (const file of files) {
    if (fs.existsSync(file.path)) {
      const content = fs.readFileSync(file.path, 'utf-8');
      if (content.includes(file.find)) {
        const updated = content.replace(file.find, file.replace);
        fs.writeFileSync(file.path, updated);
        addCheck(`Updated: ${file.path}`, true);
        report.actions.push(`Rebuilt Lambda: ${file.path}`);
      } else {
        addWarning(`Mock toggle not found in ${file.path}`);
      }
    } else {
      addAction(`File not found: ${file.path} (may need manual update)`);
    }
  }

  addAction('Rebuild Lambda code with: npm run build');
  addAction('Re-deploy Lambda with CDK or update-function-code');

  return report.errors.length === 0;
}

// Phase 3: Verify Lambda Connectivity
async function verifyLambdaConnectivity() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ PHASE 3: Verify Lambda Connectivity                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Invoke classify-food with test payload
  const payload = {
    arguments: {
      photoPath: 's3://wfl-photos/test/test.jpg',
      userId: '00000000-0000-0000-0000-000000000001',
      householdId: '00000000-0000-0000-0000-000000000001',
      itemId: 'item-test-001',
      storageLocation: 'fridge'
    },
    identity: {
      sub: '00000000-0000-0000-0000-000000000001',
      claims: {
        email: 'test@example.com'
      }
    }
  };

  const invokeCommand = `aws lambda invoke \
    --function-name classify-food-lambda \
    --region ${AWS_REGION} \
    --payload '${JSON.stringify(payload)}' \
    /tmp/lambda-response.json \
    2>&1`;

  try {
    const { stdout } = await execAsync(invokeCommand);
    const response = JSON.parse(fs.readFileSync('/tmp/lambda-response.json', 'utf-8'));

    if (response.classification && response.classification.foodType) {
      addCheck('classify-food Lambda', true, 'Invoked successfully');
    } else {
      addWarning('classify-food Lambda returned unusual response');
    }
  } catch (error) {
    addWarning(`Lambda invocation test may need manual verification: ${error.message}`);
  }

  console.log('ℹ️  Run health-check.mjs after deployment for full validation');
}

// Phase 4: Verify Cost Tracking
async function verifyCostTracking() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ PHASE 4: Verify Cost Tracking                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Cost Tracking Configuration:');
  console.log('  - Haiku input tokens:  $0.8/million');
  console.log('  - Haiku output tokens: $4.0/million');
  console.log('  - Cache read tokens:   $0.1/million (8x cheaper)');
  console.log('  - Expected cost/call:  ~$0.0009 (with >90% cache hit)');
  console.log('');

  // Verify monitoring.ts has correct pricing
  const monitoringPath = 'services/shared/src/monitoring.ts';
  if (fs.existsSync(monitoringPath)) {
    const monitoring = fs.readFileSync(monitoringPath, 'utf-8');

    const haiku_input = monitoring.includes('0.8');
    const haiku_output = monitoring.includes('4.0');
    const cache_read = monitoring.includes('0.1');

    addCheck('Haiku input pricing ($0.8/M)', haiku_input);
    addCheck('Haiku output pricing ($4.0/M)', haiku_output);
    addCheck('Cache read pricing ($0.1/M)', cache_read);
  } else {
    addAction('Verify pricing in monitoring.ts');
  }

  // Check CloudWatch custom metrics
  console.log('\nCloudWatch Metrics to Monitor:');
  console.log('  - CustomAI/AICallCost');
  console.log('  - CustomAI/CacheHitRate');
  console.log('  - CustomAI/InputTokens');
  console.log('  - CustomAI/OutputTokens');
  console.log('');
  addAction('Deploy CloudWatch alarms using: CLOUDWATCH_SETUP.md');
}

// Phase 5: Security Validation
async function validateSecurity() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ PHASE 5: Security Validation                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check S3 public access
  try {
    const publicCheck = await execAsync(
      `aws s3api get-bucket-public-access-block --bucket ${S3_BUCKET} --region ${AWS_REGION}`
    );
    const config = JSON.parse(publicCheck.stdout);
    const allBlocked = config.PublicAccessBlockConfiguration.BlockPublicAcls &&
                       config.PublicAccessBlockConfiguration.BlockPublicPolicy;
    addCheck('S3 Public Access Blocked', allBlocked);
  } catch (error) {
    addWarning('Could not verify S3 public access settings');
    addAction('Enable block public access: aws s3api put-public-access-block');
  }

  // Check DynamoDB encryption
  try {
    const dbInfo = await execAsync(
      `aws dynamodb describe-table --table-name ${DYNAMODB_TABLE} --region ${AWS_REGION}`
    );
    const table = JSON.parse(dbInfo.stdout).Table;
    const encrypted = table.SSEDescription?.Status === 'ENABLED';
    addCheck('DynamoDB Encryption', encrypted);

    const pitrEnabled = table.ContinuousBackupsDescription?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus === 'ENABLED';
    addCheck('DynamoDB Point-in-Time Recovery', pitrEnabled);
  } catch (error) {
    addWarning('Could not verify DynamoDB security settings');
  }

  // Check Lambda timeout
  for (const lambda of LAMBDAS) {
    try {
      const config = await execAsync(
        `aws lambda get-function-configuration --function-name ${lambda} --region ${AWS_REGION}`
      );
      const funcConfig = JSON.parse(config.stdout);
      const timeout = funcConfig.Timeout;
      if (timeout >= 30) {
        addCheck(`Lambda ${lambda} Timeout`, true, `${timeout}s`);
      } else {
        addWarning(`Lambda ${lambda} timeout too low: ${timeout}s (should be ≥30s)`);
      }
    } catch (error) {
      addWarning(`Could not verify Lambda timeout for ${lambda}`);
    }
  }

  addAction('Complete full security audit using: SECURITY_VALIDATION.md');
}

// Phase 6: Generate Deployment Report
async function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ PHASE 6: Deployment Report                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const checksPassed = report.checks.filter(c => c.passed).length;
  const checksTotal = report.checks.length;
  const passPercent = checksTotal > 0 ? ((checksPassed / checksTotal) * 100).toFixed(0) : 0;

  console.log(`
📊 DEPLOYMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checks Passed:    ${checksPassed}/${checksTotal} (${passPercent}%)
Errors:           ${report.errors.length}
Warnings:         ${report.warnings.length}
Manual Actions:   ${report.actions.length}

Status: ${report.errors.length === 0 ? '✅ READY FOR PRODUCTION' : '⚠️  REQUIRES FIXES'}

`);

  if (report.errors.length > 0) {
    console.log(`\n❌ ERRORS (Fix these before proceeding):\n`);
    report.errors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  }

  if (report.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (Review and resolve if needed):\n`);
    report.warnings.forEach((w, i) => console.log(`  ${i+1}. ${w}`));
  }

  if (report.actions.length > 0) {
    console.log(`\n📋 MANUAL ACTIONS REQUIRED:\n`);
    report.actions.forEach((a, i) => console.log(`  ${i+1}. ${a}`));
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps (Phase C Day 6):
  1. Address all ERRORS above
  2. Resolve all WARNINGS
  3. Complete all MANUAL ACTIONS
  4. Run: node health-check.mjs (27 comprehensive health checks)
  5. Run: npx ts-node evals/classify-food/eval.ts (real Bedrock eval)
  6. Review: TESTING_PROCEDURES.md Day 6 section

Phase C Deployment Timeline:
  Day 6:   Infrastructure validation + real Bedrock classification
  Day 7:   AppSync mutations + OCR fallback
  Day 8:   DynamoDB storage + mobile end-to-end
  Day 10:  Load testing (1 req/sec sustained, 10 req/sec spike)
  Day 15:  Production launch + 24-hour soak test complete

On-Call Setup:
  - Slack channel: #ai-lambda-alerts
  - SNS topics: ai-alerts-critical, ai-alerts-high, ai-alerts-medium
  - Escalation path: W4 Lead → CTO (for P1 incidents)
  - Incident response: INCIDENT_RESPONSE.md

`);

  // Save report to file
  const reportPath = 'deploy-day6-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}\n`);
}

// Main execution
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   DEPLOY DAY 6 AUTOMATION                 ║
║                 Phase C Infrastructure Launch              ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // Phase 1: Validate infrastructure
    const infraOk = await validateInfrastructure();
    if (!infraOk) {
      console.log('\n⚠️  Infrastructure validation failed. Please fix issues before continuing.\n');
      process.exit(1);
    }

    // Phase 2: Update Lambda code
    await updateLambdaCode();

    // Phase 3: Verify connectivity
    await verifyLambdaConnectivity();

    // Phase 4: Verify cost tracking
    await verifyCostTracking();

    // Phase 5: Security validation
    await validateSecurity();

    // Phase 6: Generate report
    await generateReport();

    process.exit(report.errors.length === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Deployment automation failed:', error.message);
    process.exit(1);
  }
}

main();
