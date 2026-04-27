# 21 — RBAC, IAM Roles, and Secrets Management

This is the complete identity, access, and secrets specification. Every role, every permission, every secret, every flow.

## Three identity systems

| System | Who | Purpose |
|---|---|---|
| **Cognito User Pool** | End users (app users) | Authentication for app + permissions in app |
| **AWS IAM** | Cloud services + developers + CI | AWS resource access |
| **GitHub** | Workers / contributors | Code repo access |

These never overlap — a Cognito user is not an IAM principal and vice versa.

## End-user RBAC (in-app roles)

Cognito User Pool stores users. Within the app, each user can have **multiple roles** depending on context (per-household membership).

### Account-level roles

| Role | Granted by | Description |
|---|---|---|
| `user` | Default for every signup | Standard user |
| `premium_user` | RevenueCat webhook → updates Cognito custom attribute | Has active premium subscription |
| `family_user` | RevenueCat webhook | Has active family subscription |
| `app_admin` | Manual (super-rare; for our team only) | Customer support, content moderation |
| `app_superadmin` | Manual (only company founders) | Account management, financial operations |
| `banned` | Auto + manual | Blocked from sign-in (terms violation) |

Stored as **Cognito custom attributes**:
- `custom:tier` = `free` | `premium` | `family`
- `custom:role` = `user` | `app_admin` | `app_superadmin` | `banned`
- `custom:tier_expires_at` = ISO date

### Household-level roles

Per-household roles stored in DynamoDB `HouseholdMember` row:

| Role | Capabilities |
|---|---|
| `owner` | Full control: rename, delete, invite, remove members, change roles, all data RW |
| `member` | Read all, create/edit own + others' items, mark eaten/tossed |
| `viewer` | Read-only: see items but cannot modify |

A user can be `owner` of one household and `member` of another simultaneously.

### Permission matrix (in-app actions)

Format: `Action → Required role(s)`

#### Account
| Action | Required |
|---|---|
| View own profile | self |
| Edit own profile | self |
| Delete own account | self |
| Export own data | self |

#### Household
| Action | Required |
|---|---|
| Create household | any user |
| View household | member, viewer, owner |
| Edit household name/photo | owner |
| Delete household | owner |
| Invite members | owner |
| Remove members | owner |
| Change member roles | owner |
| Leave household | self (any role) |
| Transfer ownership | owner |

#### Containers & items
| Action | Required |
|---|---|
| Create container | member, owner |
| View containers | viewer, member, owner |
| Update container nickname | member, owner |
| Archive container | member, owner |
| Create item | member, owner |
| View item | viewer, member, owner |
| Update any item | member, owner |
| Delete item | member, owner |
| Mark eaten/tossed | viewer, member, owner |

Note: viewers can mark "eaten" because seeing what was eaten is core to household coordination, but viewers cannot create new items.

#### AI
| Action | Required |
|---|---|
| Photo classify | any (subject to quota; premium higher quota) |
| OCR expiry date | any (subject to quota) |
| OCR receipt | premium / family |
| Recipe suggest | any (subject to quota) |
| Restaurant suggest | any (subject to quota) |

#### Subscription
| Action | Required |
|---|---|
| View own subscription | self |
| Manage subscription | self (deep links to Apple/Google) |

#### Admin (for our team only)
| Action | Required |
|---|---|
| View any user | app_admin |
| View any household | app_admin |
| Suspend user | app_admin |
| Force password reset | app_admin |
| Manual subscription override | app_superadmin |
| Issue refunds (in-app) | app_superadmin |
| View Cognito users via console | IAM (separate) |

### Authorization enforcement (where it lives)

```
Layer 1 (Edge): WAF rate limits + reputation
Layer 2 (API): Cognito JWT validates token, extracts sub + custom:tier + custom:role
Layer 3 (Resolver): AppSync function checks household membership + role
Layer 4 (Lambda): Business logic re-validates (defense in depth)
Layer 5 (Data): DynamoDB partition key includes household ID; Lambda IAM role scoped
```

#### Resolver pattern

Every household-scoped operation runs `checkHouseholdMembership` AppSync function first:

```javascript
// infra/cdk/lib/appsync/functions/checkHouseholdMembership.js
export function request(ctx) {
  const userId = ctx.identity.sub;
  const householdId = ctx.args.input?.householdId ?? ctx.args.householdId;
  if (!householdId) util.error('Missing householdId', 'BAD_REQUEST');
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
    }),
  };
}

export function response(ctx) {
  if (!ctx.result || ctx.result.deletedAt) {
    util.unauthorized('Not a member of this household');
  }
  // Stash for downstream resolver
  ctx.stash.householdMember = ctx.result;
  return ctx.prev.result;
}
```

#### Role-based mutation gates

For owner-only operations, follow up with `requireRole`:

```javascript
// infra/cdk/lib/appsync/functions/requireRole.js
export function request(ctx) {
  return {};
}
export function response(ctx) {
  const required = ctx.stash.requiredRole;
  const actual = ctx.stash.householdMember.role;
  if (actual !== required && !(required === 'member' && actual === 'owner')) {
    util.unauthorized(`Requires role: ${required}`);
  }
  return ctx.prev.result;
}
```

Used in `removeHouseholdMember`, `deleteHousehold`, etc.

#### Premium gating

For premium-only AI operations:

```javascript
// In classify-food Lambda
import { getUserTier } from '../shared/auth';

const tier = await getUserTier(event.identity.sub);
if (tier === 'free') {
  const usedToday = await getQuota(userId);
  if (usedToday >= FREE_TIER_DAILY_LIMIT) {
    throw new QuotaExceededError('Upgrade to premium for unlimited AI');
  }
}
```

## AWS IAM Roles (cloud)

### Service roles (Lambda execution)

Each Lambda has its own execution role with **least privilege**. No `*` resources.

#### `LambdaRole-classify-food`
- `bedrock:InvokeModel` on specific Claude model ARNs only
- `dynamodb:GetItem`, `PutItem`, `UpdateItem` on `WFL-Main-{env}` only
- `s3:GetObject` on `wfl-photos-{env}` only
- `secretsmanager:GetSecretValue` on `wfl/ai/*` only
- `kms:Decrypt` on the KMS key for those resources only
- CloudWatch Logs write

#### `LambdaRole-ocr-expiry-date`
- `textract:DetectDocumentText`
- `bedrock:InvokeModel` (fallback)
- DynamoDB scoped
- S3 read
- KMS

#### `LambdaRole-ocr-receipt`
- `textract:StartExpenseAnalysis`, `GetExpenseAnalysis`
- DynamoDB scoped
- S3 read
- KMS

#### `LambdaRole-suggest-recipes`, `LambdaRole-suggest-restaurants`
- `bedrock:InvokeModel`
- `secretsmanager:GetSecretValue` for Google Places key (restaurants only)
- DynamoDB read
- KMS

#### `LambdaRole-delete-account`
- DynamoDB read/write/delete on `WFL-Main-{env}`
- `cognito-idp:AdminDeleteUser`, `AdminDisableUser` on the User Pool
- `s3:DeleteObject` on photos bucket
- Step Functions execute

#### `LambdaRole-export-data`
- DynamoDB read
- S3 write (exports bucket)
- KMS

#### `LambdaRole-revenuecat-webhook`
- `cognito-idp:AdminUpdateUserAttributes`
- DynamoDB update on Profile
- `secretsmanager:GetSecretValue` for webhook secret

#### `LambdaRole-notify-expiring`
- DynamoDB query (GSI2 scan)
- `sns:Publish` on platform endpoints
- KMS

#### `LambdaRole-image-resize`
- `s3:GetObject`, `PutObject` on photos bucket
- KMS

#### `LambdaRole-auth-create-challenge`
- DynamoDB Put (token storage)
- `ses:SendEmail` from `noreply@whatsforlunch.app`
- KMS

#### `LambdaRole-auth-verify-challenge`
- DynamoDB GetItem + DeleteItem (single-use)
- KMS

#### `LambdaRole-food-rules-publish`
- DynamoDB read/write on RULES partition
- AppSync invalidate cache (if using cached resolvers)

### IAM policy template (least-privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBScopedAccess",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCT:table/WFL-Main-${env}"
    },
    {
      "Sid": "S3PhotosScopedAccess",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::wfl-photos-${env}/*",
      "Condition": {
        "StringEquals": { "aws:RequestedRegion": "us-east-1" }
      }
    },
    {
      "Sid": "BedrockClaudeOnly",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-*",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6-*"
      ]
    },
    {
      "Sid": "KmsDecryptOnly",
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:us-east-1:ACCT:key/${cmk-id}"
    },
    {
      "Sid": "SecretsScopedAccess",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCT:secret:wfl/${env}/ai/*"
    },
    {
      "Sid": "CWLogs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Sid": "XRayTracing",
      "Effect": "Allow",
      "Action": ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
      "Resource": "*"
    }
  ]
}
```

CDK has constructs to make this DRY — see `infra/cdk/lib/constructs/lambda-fn.ts`.

### AppSync data source roles

AppSync needs to call DynamoDB and Lambdas. Each data source has a scoped role:

- **AppSync → DynamoDB**: scoped to `WFL-Main-{env}` only
- **AppSync → Lambda**: `lambda:InvokeFunction` only on specific Lambda ARNs

### Cognito trigger roles

The Lambdas configured as Cognito triggers have separate roles, scoped to:
- DynamoDB writes for profile creation
- SES sending only from `noreply@whatsforlunch.app`
- KMS decrypt

### Cross-service trust

- AppSync trusts Cognito JWT (via authorization config)
- API Gateway trusts Cognito JWT (for future REST endpoints)
- CloudFront trusts ACM certs
- Lambda trusts AppSync via resource-based policy
- S3 trusts CloudFront via OAC

## Human IAM Roles (developers, ops, support)

### Roles in AWS (defined in CDK + IAM Identity Center)

#### `wfl-developer`
- Read-only on prod
- Read/write on dev + staging
- Cannot modify IAM, KMS keys, billing
- Access to: CloudWatch, X-Ray, Lambda console (read), DynamoDB console (read prod), AppSync (read prod)

#### `wfl-infra-engineer` (W1's role)
- All `wfl-developer` permissions
- CDK deploy on dev + staging (via OIDC)
- Read IAM, KMS configs in prod
- No prod-write outside CDK

#### `wfl-prod-deployer` (CI only, via OIDC)
- CDK deploy on prod
- Limited time window (only when GitHub Action runs)
- Cannot modify IAM root, billing, organization settings

#### `wfl-security-auditor`
- Read-only across all envs
- Read GuardDuty, Security Hub, CloudTrail
- Cannot modify anything

#### `wfl-billing-admin`
- Cost Explorer access
- Budgets management
- No service access

#### `wfl-support`
- Read access to CloudWatch Logs (sanitized)
- Cognito console: search users, force password reset, disable users
- Cannot delete users (only `wfl-prod-deployer` cascade handles deletion)

#### `wfl-superadmin`
- Used by founders only
- All permissions
- MFA mandatory
- CloudTrail logged + alerted on every use

### Permission boundaries

To prevent privilege escalation, every role has a **permission boundary** that caps what they can do regardless of attached policies:

```typescript
// CDK
const boundary = new iam.ManagedPolicy(this, 'WflPermissionBoundary', {
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ['iam:CreateUser', 'iam:CreateAccessKey', 'organizations:*'],
      resources: ['*'],
    }),
    new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ['*'],
      resources: ['*'],
      conditions: {
        StringNotEquals: { 'aws:RequestedRegion': ['us-east-1', 'us-west-2'] },
      },
    }),
  ],
});

new iam.Role(this, 'WflDeveloper', {
  ...
  permissionsBoundary: boundary,
});
```

### MFA enforcement

- All human roles require MFA (TOTP)
- IAM policies use `aws:MultiFactorAuthPresent` condition
- Console sessions limited to 1 hour
- API access via SSO-issued temporary creds

### IAM Identity Center (SSO)

For human access to AWS:
- IAM Identity Center is the identity provider
- Users defined once
- Permission sets map to AWS account roles
- Console URL: `wfl.awsapps.com/start`

No IAM users (other than emergency break-glass account) — everyone uses Identity Center.

### Break-glass account

One IAM user with admin permissions, MFA mandatory, credentials in a sealed envelope (1Password vault accessible only by founders). Used only if Identity Center is down.

## OIDC for GitHub Actions (no AWS access keys)

We use **OpenID Connect** so GitHub Actions get short-lived AWS credentials without storing access keys in GitHub secrets.

### Setup

```typescript
// infra/cdk/lib/stacks/security-stack.ts
const provider = new iam.OpenIdConnectProvider(this, 'GitHubOIDC', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: ['sts.amazonaws.com'],
  thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],  // GitHub's actions thumbprint
});

// Per-environment role
const stagingDeployer = new iam.Role(this, 'GitHubActionsStagingDeployer', {
  roleName: 'GitHubActionsStagingDeployer',
  assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
    StringEquals: {
      'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    },
    StringLike: {
      'token.actions.githubusercontent.com:sub': [
        'repo:wfl-org/whatsforlunch:ref:refs/heads/main',
        'repo:wfl-org/whatsforlunch:environment:staging',
      ],
    },
  }),
  permissionsBoundary: deployerBoundary,
  inlinePolicies: { /* CDK + S3 + CloudFront permissions */ },
});

const prodDeployer = new iam.Role(this, 'GitHubActionsProdDeployer', {
  ...
  // More restrictive trust policy
  StringLike: {
    'token.actions.githubusercontent.com:sub': [
      'repo:wfl-org/whatsforlunch:environment:production',  // GitHub env approval gates this
    ],
  },
});
```

### Usage in workflows

```yaml
permissions:
  id-token: write   # CRITICAL: required for OIDC
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsStagingDeployer
          aws-region: us-east-1
      - run: aws sts get-caller-identity  # confirm assumed
```

No `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` ever stored in GitHub.

### OIDC trust narrowing

We narrow trust to specific:
- **Repository**: `wfl-org/whatsforlunch` only
- **Branch**: `refs/heads/main` for staging
- **Environment**: `production` for prod (GitHub UI requires manual approval)

Any commit to a fork or random branch cannot assume our roles.

## Secrets Management

### Three secret stores (each with a purpose)

| Store | What | Why |
|---|---|---|
| **AWS Secrets Manager** | Third-party API keys, webhook secrets, DB passwords (if any) | Rotation support, KMS encryption, IAM-scoped |
| **AWS SSM Parameter Store (Standard)** | Non-secret config (model IDs, feature flags, retention days) | Free, version history |
| **GitHub Actions secrets** | Bootstrap secrets (Expo token, Snyk token) and OIDC role ARNs | CI-only access |

We **never** store the same secret in multiple places. We never check secrets into git (gitleaks pre-commit blocks this).

### What goes where (canonical list)

#### In AWS Secrets Manager (per environment)

```
wfl/{env}/ai/anthropic-api-key            # Bedrock-fallback only (post-MVP)
wfl/{env}/ai/google-places-api-key        # restaurant lookups
wfl/{env}/billing/revenuecat-webhook-secret  # HMAC for webhook validation
wfl/{env}/billing/revenuecat-public-key   # for RevenueCat SDK
wfl/{env}/auth/magic-link-hmac-secret     # for signing magic link nonces
wfl/{env}/auth/apple-signin-private-key   # .p8 file contents
wfl/{env}/auth/google-oauth-client-secret # OAuth client secret
wfl/{env}/sentry/dsn                      # if treated as secret (we treat it as secret to avoid abuse)
wfl/{env}/sentry/auth-token               # for source map uploads from Lambda
wfl/{env}/posthog/api-key                 # backend-side PostHog ingestion
wfl/{env}/ses/dkim-private-key            # email DKIM signing (optional, AWS-managed by default)
```

Convention: `wfl/{env}/<system>/<name>`. Each secret is its own resource.

Rotation:
- API keys we control (HMAC, auth keys): 90-day rotation via Lambda
- Third-party keys (Google Places, etc.): manual rotation when vendor recommends

#### In SSM Parameter Store

```
/wfl/{env}/config/bedrock-model-haiku       # "anthropic.claude-haiku-4-5-..."
/wfl/{env}/config/bedrock-model-sonnet      # "anthropic.claude-sonnet-4-6-..."
/wfl/{env}/config/prompt-version-classify   # int, increments on prompt change
/wfl/{env}/config/free-tier-daily-photo     # 10
/wfl/{env}/config/photo-retention-days-free # 90
/wfl/{env}/config/notify-quiet-hours-default # "22:00-07:00"
/wfl/{env}/config/feature-flags             # JSON, used for backend feature flagging
/wfl/{env}/dns/web-cf-distribution-id       # CloudFront distribution ID
/wfl/{env}/dns/api-cf-distribution-id
```

Cheaper than Secrets Manager (free for Standard tier), supports version history.

#### In GitHub Actions secrets

##### Repo-level (apply to all workflows)
```
EXPO_TOKEN                    # EAS / Expo account token
MAESTRO_CLOUD_API_KEY         # Maestro Cloud E2E testing
CHROMATIC_TOKEN               # Visual regression (future)
SNYK_TOKEN                    # Dependency scanning
SEMGREP_APP_TOKEN             # SAST scanning
SENTRY_AUTH_TOKEN             # Sentry release creation
SENTRY_ORG                    # Sentry org slug
SENTRY_PROJECT_BACKEND        # Sentry project slug for Lambda/API
SENTRY_PROJECT_MOBILE         # Sentry project slug for mobile app
CODECOV_TOKEN                 # Coverage reporting
GITLEAKS_LICENSE              # Secret scanning
MOBSF_API_KEY                 # Mobile SAST (future)
SLACK_DEPLOY_WEBHOOK          # Slack incoming webhook for deploy notifications
STAGING_APPSYNC_URL           # Used by benchmark script in nightly CI
```

##### Environment-level (per env: dev, staging, production, preview)
```
AWS_OIDC_ROLE_ARN             # ARN of IAM role to assume (per env)
APPSYNC_HEALTH_URL            # Base URL for post-deploy health check
WEB_S3_BUCKET                 # S3 bucket name for web app static files
WEB_CF_DIST_ID                # CloudFront distribution ID for web app
```

##### Production-only environment secrets
```
APPLE_API_KEY_ID              # App Store Connect API key ID
APPLE_API_ISSUER_ID           # App Store Connect API issuer ID
APPLE_API_KEY                 # base64-encoded .p8 file
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  # Google Play service account credentials
INSTATUS_API_KEY              # Status page API key
INSTATUS_PAGE_ID              # Status page ID
```

##### Repo variables (non-secret)
```
WEB_CF_DIST_ID_DEV
WEB_CF_DIST_ID_STAGING
WEB_CF_DIST_ID_PROD
POSTHOG_PROJECT_ID
SENTRY_ORG
```

### Secret access patterns

#### Lambda runtime secret loading

Lambdas load secrets via the **AWS Parameters and Secrets Lambda Extension** for in-memory caching:

```typescript
// services/shared/secrets.ts
import fetch from 'node-fetch';

const PORT = 2773;  // extension default port
const TOKEN = process.env.AWS_SESSION_TOKEN!;

export async function getSecret(name: string): Promise<string> {
  const r = await fetch(
    `http://localhost:${PORT}/secretsmanager/get?secretId=${encodeURIComponent(name)}`,
    { headers: { 'X-Aws-Parameters-Secrets-Token': TOKEN } }
  );
  const json = await r.json();
  return JSON.parse(json.SecretString);
}

export async function getParam(name: string): Promise<string> {
  const r = await fetch(
    `http://localhost:${PORT}/systemsmanager/parameters/get?name=${encodeURIComponent(name)}`,
    { headers: { 'X-Aws-Parameters-Secrets-Token': TOKEN } }
  );
  const json = await r.json();
  return json.Parameter.Value;
}
```

Cache TTL: 5 minutes (extension default). Reduces calls + cost.

#### CDK reading SSM at synth time

Pre-baked config (deployed at synth):

```typescript
const modelId = ssm.StringParameter.valueFromLookup(
  this, '/wfl/prod/config/bedrock-model-haiku'
);
```

#### Local dev secret loading

Local dev pulls non-prod secrets from `.env.local` (gitignored):

```bash
# apps/mobile/.env.local
EXPO_PUBLIC_API_URL=https://api-dev-yourname.preview.whatsforlunch.app/graphql
EXPO_PUBLIC_COGNITO_USER_POOL_ID=...
EXPO_PUBLIC_COGNITO_CLIENT_ID=...
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_POSTHOG_KEY=...
```

`.env.local` is gitignored. `pnpm cdk:outputs` regenerates it from the deployed dev stack.

### Secret rotation

| Secret | Rotation cadence | Method |
|---|---|---|
| `magic-link-hmac-secret` | 90 days | Lambda rotation function |
| KMS CMKs | Annual (auto) | KMS managed |
| Apple Sign-In key | When team rotates | Manual |
| Google OAuth secret | When team rotates | Manual |
| RevenueCat webhook secret | Annual | Manual + webhook URL update |
| Google Places key | Annual | Manual |
| Cognito refresh tokens | 30 days (rotate on use) | Cognito managed |
| Cognito access/ID tokens | 60 minutes | Cognito managed |
| User passwords (OAuth fallback) | Never expire (NIST guidance) | N/A |

### Secret leak response

If a secret is accidentally exposed:
1. Rotate immediately (manual override the rotation Lambda)
2. Audit CloudTrail for any usage between leak and rotation
3. Notify affected users if their data was accessed
4. Add post-mortem ADR

Detection:
- gitleaks pre-commit hook
- gitleaks scan in CI
- GitHub secret scanning (auto)
- Snyk
- Quarterly manual audit

### What's NOT in any secret store

- Public values (App IDs, Cognito User Pool IDs in prod) — these are visible to mobile apps
- Sentry DSN (technically public — embedded in shipped app — but we treat as secret to discourage abuse)
- Color tokens, design constants
- Anything checkable into git

## Application-level user permissions

Beyond AWS IAM, the app enforces user permissions in resolvers and Lambdas. The full permission matrix is at the top of this doc.

### Implementation pattern

```typescript
// services/shared/auth.ts
export async function requireAuth(event: AppSyncEvent): Promise<{ userId: string; tier: string }> {
  if (!event.identity?.sub) throw new UnauthorizedError('Not authenticated');
  const profile = await getProfile(event.identity.sub);
  if (profile.role === 'banned') throw new UnauthorizedError('Account suspended');
  return { userId: event.identity.sub, tier: profile.tier };
}

export async function requireHouseholdRole(
  userId: string,
  householdId: string,
  minimumRole: 'viewer' | 'member' | 'owner'
): Promise<HouseholdMember> {
  const member = await getHouseholdMember(householdId, userId);
  if (!member) throw new ForbiddenError('Not a member');
  const ranks = { viewer: 1, member: 2, owner: 3 };
  if (ranks[member.role] < ranks[minimumRole]) {
    throw new ForbiddenError(`Requires ${minimumRole} role`);
  }
  return member;
}
```

Used in every Lambda business logic entry point.

## SQL injection (and equivalent) protection

We use **DynamoDB**, which doesn't have SQL — but the analogous risk is **expression injection** and **NoSQL injection**.

Protections:
- All inputs parsed by Zod schemas (typed, length-limited, format-validated)
- AppSync request mapping templates use `$util.dynamodb.toMapValues()` (parameter binding)
- Lambda code uses **DynamoDB DocumentClient** with parameter substitution, never string concatenation
- No `eval()` or `new Function()` anywhere in our code
- Future RDS / Aurora (if added): parameterized queries only, never string interpolation

Audit:
- Semgrep rule `p/sql-injection` runs in CI
- Code review checks for query construction

## Cross-references

- API auth model → [03_API_SPEC.md](03_API_SPEC.md)
- Security frameworks → [04_SECURITY.md](04_SECURITY.md)
- CI/CD OIDC → [19_CICD_PIPELINE.md](19_CICD_PIPELINE.md)
- Architecture → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
