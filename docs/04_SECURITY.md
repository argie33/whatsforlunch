# 04 — Security

This is enterprise-grade. Every recommendation is mandatory unless explicitly noted as optional.

**Frameworks**: OWASP MASVS v2.x · OWASP Mobile Top 10 (2024) · AWS Well-Architected Security Pillar · NIST 800-63B · CIS AWS Foundations · SOC 2 readiness

## Threat model summary

| Threat | Likelihood | Impact | Mitigation summary |
|---|---|---|---|
| Stolen device → account takeover | Medium | High | Biometric unlock; short access tokens; refresh rotation |
| Credential stuffing on Cognito | Medium | High | Cognito advanced security; WAF rate limit; breach corpus check |
| API abuse (free tier exhaustion) | High | Medium | Per-user rate limits in Lambda + WAF; daily AI quotas |
| Photo upload abuse (large/malicious files) | Medium | Medium | Pre-signed URL with size+type constraints; magic byte verification; virus scan post-upload |
| Cross-household data leakage | Low | Critical | AppSync resolver auth; deny-by-default IAM; integration tests |
| Reverse-engineered app extracts secrets | Low | Medium | No secrets in app; Hermes bytecode; Proguard; cert pinning optional |
| Account deletion bypass (GDPR violation) | Low | Critical | Step Functions cascade; audit log; 30-day SLA |
| Compromised dependency | Medium | Variable | Dependabot; Snyk; CodeQL; package signing |
| AWS account compromise | Low | Catastrophic | MFA mandatory; least privilege IAM; CloudTrail object lock; GuardDuty |
| Bedrock prompt injection extracting other users' data | Low | High | Strict tool-use schemas; never include other users' data in prompts; eval suite |

## OWASP Mobile Top 10 (2024) mitigations

| ID | Risk | Our mitigation |
|---|---|---|
| **M1** Improper Credential Usage | Cognito; never embed API keys in app; Cognito Identity Pool tokens for AWS access |
| **M2** Inadequate Supply Chain Security | Pinned `package-lock.json` (pnpm); Snyk + Dependabot; signed Expo updates (`expo-updates` code signing); EAS Build provenance attestations |
| **M3** Insecure Authentication/Authorization | Cognito + short-lived JWTs (60min ID, 60min access, 30day refresh w/ rotation); AppSync `@aws_auth` directives; resolver-level membership checks |
| **M4** Insufficient Input/Output Validation | Zod schemas (client + Lambda) generated from GraphQL; AppSync request mapping templates reject oversized payloads |
| **M5** Insecure Communication | TLS 1.3 only on all endpoints; HSTS on web surfaces; certificate transparency monitoring |
| **M6** Inadequate Privacy Controls | Data minimization (no phone, no precise location stored unless explicit consent); explicit consent on photo storage; ATT prompt only when needed (we don't track, so we don't show) |
| **M7** Insufficient Binary Protection | Hermes bytecode (default Expo SDK 51+); Android: ProGuard/R8 (`minifyEnabled true`, `shrinkResources true`); iOS: bitcode + dSYM stripping |
| **M8** Security Misconfiguration | GraphQL introspection disabled in prod; iOS ATS strict; Android NetworkSecurityConfig restrictive |
| **M9** Insecure Data Storage | `expo-secure-store` for tokens; MMKV with encryption; never AsyncStorage for secrets |
| **M10** Insufficient Cryptography | Platform crypto (CommonCrypto / Android Keystore); AWS KMS server-side; no custom crypto |

## Authentication

### Cognito User Pools configuration

- **Pool per environment**: `wfl-dev`, `wfl-staging`, `wfl-prod`
- **Sign-in mechanism**: email (no username)
- **Password policy** (for OAuth fallback): NIST-aligned — min 12 chars, blocked common passwords
- **Token TTLs**:
  - Access token: 60 min
  - ID token: 60 min
  - Refresh token: 30 days, rotation enabled
- **Advanced security mode**: ENFORCED
  - Adaptive auth (low/medium/high risk)
  - Compromised credential check (against breach corpus)
  - Email notification on new device sign-in
- **MFA**: TOTP only (no SMS — SIM-swap risk and cost). Optional at MVP, mandatory for household admins post-launch
- **WebAuthn / passkeys**: roadmap (Cognito GA 2024) via `react-native-passkey`

### Magic link flow (custom auth)

```
1. User enters email
2. Mobile: InitiateAuth(USER_PASSWORD_AUTH-stub) → Cognito triggers DefineAuthChallenge
3. DefineAuthChallenge Lambda: returns CUSTOM_CHALLENGE
4. CreateAuthChallenge Lambda:
   - Generate cryptographically random nonce
   - Store HMAC(nonce, server_secret) + email + IP class + UA hash + 10min TTL in DynamoDB
   - Send magic link email via SES: https://app.whatsforlunch.app/auth/verify?token=<nonce>
   - Return public challenge: { destination: "email" }
5. User clicks link → Universal Link opens app → app calls RespondToAuthChallenge with token
6. VerifyAuthChallengeResponse Lambda:
   - Look up token in DynamoDB
   - Conditional delete (single-use)
   - Verify HMAC, IP class, UA hash
   - Return success
7. Cognito issues tokens
```

Single-use enforced by DynamoDB conditional write. TTL 10min. IP class binding mitigates link interception.

### Apple Sign-In

- Mandatory on iOS if Google Sign-In offered (App Store guideline 4.8)
- Library: `@invertase/react-native-apple-authentication`
- Capture identityToken, send to Cognito federated identity
- Apple rejects re-authentication after 60 days; design flow to re-auth gracefully

### Google Sign-In

- Library: `@react-native-google-signin/google-signin`
- Configure OAuth client IDs per platform in Google Cloud Console
- Send idToken to Cognito federated identity

### Token storage on device

- **Refresh + ID tokens**: `expo-secure-store` (iOS Keychain `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, Android Keystore-backed EncryptedSharedPreferences)
- **Access token**: in-memory only (never persisted)
- **Tokens never written to**: AsyncStorage, plain MMKV, files, console logs

### Biometric re-auth

- `expo-local-authentication` for Face ID / Touch ID / fingerprint
- Optional setting; required for: viewing item history, deleting account, changing email
- Falls back to passcode if biometric unavailable

## Authorization

### Layered model

```
Layer 1: Edge (CloudFront + WAF)
  - Block known-bad IPs, geo-block (if needed), rate limit per IP

Layer 2: API (AppSync)
  - Cognito User Pools authorizer validates JWT
  - Schema-level @aws_cognito_user_pools directive

Layer 3: Resolver
  - AppSync function checkHouseholdMembership runs before mutations
  - Confirms requesting user is a member of the household
  - For owner-only ops, confirms role=owner

Layer 4: Data
  - DynamoDB partition key includes household ID
  - Lambda execution role IAM policies scope to specific tables/keys
  - S3 bucket policies enforce per-user/household path prefixes
```

### Resolver auth checks (canonical implementation)

```js
// AppSync function: checkHouseholdMembership
export function request(ctx) {
  const userId = ctx.identity.sub;
  const householdId = ctx.args.input.householdId ?? ctx.args.householdId;
  if (!householdId) throw util.error('Missing householdId', 'BAD_REQUEST');

  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
    }),
  };
}

export function response(ctx) {
  if (!ctx.result) {
    util.unauthorized('Not a member of this household');
  }
  ctx.stash.householdMember = ctx.result;
  return ctx.prev.result;
}
```

This pattern is used by every mutation that operates on a household-scoped resource.

## Encryption

### At rest

| Resource | Encryption | Key management |
|---|---|---|
| DynamoDB | AWS-managed → CMK upgrade | KMS CMK with annual rotation |
| S3 photos bucket | SSE-KMS w/ bucket key | Per-env CMK |
| S3 exports bucket | SSE-KMS | Per-env CMK |
| CloudWatch Logs | SSE-KMS | Per-env CMK |
| Lambda env vars | KMS-encrypted | Default Lambda KMS key |
| Secrets Manager | KMS-encrypted | Per-env CMK |
| EBS volumes (Bedrock) | AWS-managed | N/A (Bedrock managed) |
| Mobile WatermelonDB | SQLCipher | Key derived per-install, stored in SecureStore |
| Mobile MMKV | Encryption mode | Key per-install, stored in SecureStore |

### In transit

- **TLS 1.3** minimum everywhere; TLS 1.2 disabled where supported
- **HSTS** with preload on web surfaces (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`)
- **Certificate transparency** monitoring via CloudWatch
- **Certificate pinning**: NOT enabled at MVP; adds operational risk; Cognito/AppSync use AWS-managed certs

### On device

- iOS: data protection class `NSFileProtectionCompleteUntilFirstUserAuthentication` for non-secret app data; `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` for SecureStore
- Android: `EncryptedSharedPreferences` for SecureStore; SQLCipher for WatermelonDB; FBE (file-based encryption) on supported devices

## API security

### GraphQL hardening

- **Introspection disabled in prod**: WAF rule blocks `__schema` / `__type` queries from non-allowlisted IPs
- **Depth limit**: 7 (custom Lambda authorizer)
- **Complexity limit**: 1000 points (each field weighted)
- **Query timeout**: 30s
- **Max request size**: 1 MB

### Rate limiting

| Layer | Limit | Tool |
|---|---|---|
| WAF rate-based | 2000 req / 5 min / IP | AWS WAF |
| Per-user general | 1000 req / min | AppSync resolver-stash counter (Dynamo) |
| Per-user mutations | 200 req / min (free), 500 (premium) | Same |
| Per-user AI | 10/day photo, 30/day OCR (free) | Lambda check before Bedrock call |
| Per-user expensive | 5 recipe / 5 receipt / day (free) | Lambda |

### Input validation

- All inputs go through Zod schemas (generated from GraphQL SDL)
- AppSync request mapping templates reject malformed input (e.g. `$util.error` on missing fields)
- Lambdas re-validate (defense in depth)

### File upload security

```
1. Client requests pre-signed PUT URL
   - Lambda generates URL with constraints:
     - Max size: 10 MB
     - Allowed Content-Type: image/jpeg, image/png, image/heic
     - TTL: 15 min
     - Path: photos/<householdId>/<uuid>.<ext>
2. Client PUTs file to S3 directly (never proxied)
3. S3 ObjectCreated event triggers validation Lambda
   - Read first 16 bytes
   - Verify magic bytes (file-type npm package):
     JPEG: FF D8 FF | PNG: 89 50 4E 47 | HEIC: 66 74 79 70 68 65 69 63
   - If invalid: delete + audit
4. Strip EXIF (sharp .withMetadata({ exif: false }))
5. Generate thumbnail variants
6. ClamAV scan (Lambda layer) — if HIGH risk, quarantine
7. Update item record with photoPath
```

### SSRF prevention

- Photo uploads use pre-signed URLs (server never fetches user-supplied URLs)
- Future external integrations: validate URLs, block RFC1918, link-local (169.254.0.0/16), metadata IP (169.254.169.254)
- DNS resolution server-side before fetch

## Mobile-specific hardening

### Anti-tampering

- **Hermes bytecode**: enabled (default Expo SDK 51+) — non-trivial to reverse
- **Android ProGuard/R8**: `minifyEnabled true`, `shrinkResources true` in release config
- **iOS bitcode + dSYM stripping**: configured in EAS build profile
- **Code signing**: standard App Store / Play Store signing

### Attestation

- **iOS**: DeviceCheck / App Attest via `expo-device` + Apple's framework
- **Android**: Play Integrity API
- Used to verify app authenticity for sensitive operations (account deletion, premium activation)

### Jailbreak / root detection

- **`jail-monkey`**: signal not gate
- On detected jailbreak/root: tag analytics events, restrict household-shared writes, do not block all functionality
- Hard blocks cause false positives and App Store unhappy reviewers

### Screen capture protection

- `expo-screen-capture` `preventScreenCaptureAsync()` on:
  - Auth screens (magic link entry)
  - Household invite screens
  - Account settings
- iOS: blocks recording (not screenshots; accept this limitation)
- Android: `FLAG_SECURE` blocks both

### Deep link validation

- iOS Universal Links: AASA file at `https://app.whatsforlunch.app/.well-known/apple-app-site-association`
- Android App Links: assetlinks.json at `https://app.whatsforlunch.app/.well-known/assetlinks.json` with `autoVerify="true"`
- All deep link parameters validated with Zod before routing
- QR token deep links: validate token format (UUIDv4) and existence in Dynamo before showing UI

### iOS App Transport Security

- Default ATS enabled (no `NSAllowsArbitraryLoads` exceptions)
- Reject any third-party SDK requesting ATS exceptions

### Android Network Security Config

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```

No user-installed CAs trusted in release builds.

## AWS cloud security

### IAM least-privilege

- One execution role per Lambda
- Scoped to specific table, KMS key, S3 prefix
- No `*` resources
- `aws:SourceArn` and `aws:PrincipalOrgID` conditions where applicable

### VPC

- Lambdas calling Bedrock and writing to DynamoDB do **not** need VPC
- VPC-enable only Lambdas accessing private resources (none at MVP)

### WAF rules (CloudFront + AppSync)

- AWSManagedRulesCommonRuleSet
- AWSManagedRulesKnownBadInputsRuleSet
- AWSManagedRulesAmazonIpReputationList
- Rate-based rule: 2000 req / 5 min / IP
- Custom: block GraphQL introspection from public
- Geo-block: not enabled at MVP, ready to enable

### GuardDuty + Security Hub

- GuardDuty: enabled in all regions; findings → Security Hub
- Security Hub: AWS Foundational Security Best Practices + CIS AWS Foundations standards
- IAM Access Analyzer: enabled on org; review external access weekly

### CloudTrail

- Multi-region trail
- Log file validation enabled
- Logs to dedicated S3 bucket with object lock (compliance mode, 1 year retention)
- Bucket in separate account (security audit account, post-MVP)

### S3 bucket security

- Account-level Public Access Block: ON
- Bucket policies deny non-TLS (`aws:SecureTransport=false`)
- CloudFront with OAC; never public bucket policies
- Versioning enabled on photos bucket

### Security headers (web surfaces)

For privacy policy page, AASA host, deep link landing pages:

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
```

### Secrets management

- **Secrets Manager**: third-party API keys (Google Places, RevenueCat webhook secret)
- **SSM Parameter Store**: non-secret config (model IDs, retention days, feature flags)
- Lambdas use **Parameters and Secrets Lambda Extension** for caching
- Rotation: Secrets Manager auto-rotation enabled where supported (90 days for Google Places key — manual)

## Data protection (privacy)

### PII classification

| Tier | Examples | Treatment |
|---|---|---|
| **Tier 1** (high) | Email, auth tokens, photos with EXIF | KMS encryption, no logging, redaction |
| **Tier 2** (medium) | Display name, household membership, food labels | KMS encryption |
| **Tier 3** (low) | Anonymized analytics, food rule lookups | Standard storage |

### Data minimization

- No phone number collected (skip SMS MFA)
- No precise location stored unless user explicitly enables (for restaurant search; opt-in)
- EXIF stripped on photo upload
- Browser fingerprinting / device fingerprinting: NONE

### GDPR Article 17 (right to deletion)

- In-app "Delete Account" button (App Store mandatory)
- Email confirmation required
- Step Function `delete-account-flow`:
  1. Disable Cognito user (immediate)
  2. Mark profile `deletedAt`
  3. For each household where user is sole owner: delete entire household + items + photos
  4. Remove user from other households
  5. Delete user-owned data (devices, prefs, learned prefs, stats)
  6. Delete S3 photos
  7. Delete Cognito user (final)
  8. Audit log entry: `account.deleted`
  9. Confirmation email
- Complete within 30 days (GDPR requirement)

### GDPR Article 15 (right to access)

- In-app "Export My Data" button
- `export-data` Lambda generates ZIP with:
  - `profile.json`
  - `households/<id>/items.json`
  - `households/<id>/photos/*.jpg`
  - `events.json` (audit log)
- Delivered via signed S3 URL, valid 7 days

### CCPA

- "Do Not Sell or Share My Personal Information" link in privacy policy (we don't sell, but disclose)
- Honor Global Privacy Control header on web surfaces

### COPPA

- Sign-up gated by DOB (must be 13+)
- App Store age rating: 12+
- Reject under-13 accounts; redirect to "ask a parent"

### Logging hygiene

- Structured JSON logs (Powertools Logger)
- **Never log**:
  - Full email (hash with SHA-256 + per-env salt)
  - Auth tokens
  - Photo bytes
  - Bedrock prompts containing user content
  - Names of food items (loose privacy — what's in your fridge is private)
- Logger wrapper auto-redacts known PII fields

## Compliance

### SOC 2 readiness (post-MVP)

- AWS Audit Manager SOC 2 framework enabled
- Documented policies (access control, change mgmt, IR)
- Centralized log aggregation
- Quarterly access reviews
- Vendor risk assessments (RevenueCat, PostHog, Sentry, Anthropic, Google)

### Region & data residency

- Default region: us-east-1
- EU users (future): eu-west-1 mirror
- DPA signed with AWS for EU data
- DPA signed with Anthropic if processing EU PII through Claude

### App Store / Play Store privacy declarations

#### App Store Privacy Nutrition Labels

| Category | Data | Linked to user? | Used for tracking? |
|---|---|---|---|
| Contact Info | Email | Yes | No |
| Identifiers | User ID | Yes | No |
| Usage Data | Product Interaction, Crash Data | Yes | No |
| User Content | Photos, food data | Yes | No |
| Diagnostics | Crash data, performance data | No (anon) | No |

We do not track. No third-party tracking SDKs (no Facebook SDK, no AppsFlyer at MVP).

#### Play Store Data Safety

Same categories. Mark:
- Data encrypted in transit: YES
- Data deletion request: YES (in-app)
- Data shared with third parties: NO (only operators: AWS, Anthropic-via-Bedrock, RevenueCat for billing, Sentry for crashes)

### App Tracking Transparency (iOS)

We do **not** track across apps/sites → ATT prompt **not required**. Declare "Data Not Used to Track You" + "Data Not Linked to You" where accurate.

If we add Facebook Login or marketing SDKs later → ATT prompt required.

## Incident response

### Logging strategy

- CloudWatch Logs: 90-day retention hot, S3 archive 7 years (compliance)
- Structured JSON via Powertools Logger
- Correlation IDs threaded through every request

### Alerting (CloudWatch Alarms → SNS → PagerDuty)

| Trigger | Severity |
|---|---|
| Cognito `CompromisedCredentials` events | High |
| > 5 failed logins / user / 5min | Medium |
| WAF blocked requests > 1000/5min spike | High |
| GuardDuty HIGH severity finding | High |
| KMS Decrypt denies | High |
| Unusual Bedrock invocation rate (10x baseline) | High |
| Lambda error rate > 1% | Medium |
| AppSync 5xx rate > 0.5% | Medium |
| DynamoDB throttling | Medium |
| Cost anomaly (> 20% above baseline) | Medium |

### Breach process (documented runbook)

1. **Contain**: revoke Cognito tokens (`AdminUserGlobalSignOut`); rotate KMS keys; disable affected Lambdas
2. **Assess**: CloudTrail + Athena to determine scope; freeze affected data
3. **Notify**:
   - GDPR: supervisory authority within 72 hours
   - CCPA: users "without unreasonable delay"
   - Affected users: email + in-app banner
4. **Remediate**: patch root cause; deploy fix
5. **Document**: post-mortem; update runbook; quarterly drill

### Bug bounty (post-launch)

- HackerOne or Intigriti private program
- Scope: app + AWS infrastructure
- Out of scope: DoS testing, social engineering of staff

## React Native security packages

### Use

| Package | Use |
|---|---|
| `expo-secure-store` | Tokens, secrets |
| `react-native-mmkv` (encryption mode) | Cached non-secret data |
| `react-native-keychain` | Alternative to SecureStore for non-Expo |
| `jail-monkey` | Root/jailbreak signal |
| `expo-screen-capture` | Sensitive screen protection |
| `react-native-passkey` | WebAuthn (roadmap) |
| `expo-local-authentication` | Biometric re-auth |

### Avoid

- `AsyncStorage` for any secret
- `react-native-webview` < 13.x (multiple XSS CVEs)
- Packages with no maintainer activity > 12 months
- Anything from unknown maintainers (check Snyk, npm trends)

## Security validation

### Static analysis

- **Semgrep** with `p/owasp-top-ten`, `p/react`, `p/typescript` rule packs in CI
- **ESLint security plugins**: `eslint-plugin-security`, `eslint-plugin-no-secrets`
- **CodeQL** (GitHub Advanced Security) on every PR

### Dependency scanning

- **Dependabot** on `main` (GitHub, automatic)
- **Snyk** in CI failing build on HIGH severity
- **npm audit** as fallback
- **AWS Inspector** for Lambda layers

### Mobile-specific

- **MobSF** (Mobile Security Framework) static + dynamic scan on each release IPA/APK
- **OWASP MASVS L1** checklist self-assessment before each major release; **L2** before any B2B contract
- Pre-launch: manual review of permissions, deep links, exposed activities

### Penetration testing

- External pentest annually + before any major launch (NCC Group, Trail of Bits, Cure53)
- AWS pentest is pre-authorized for listed services per AWS Customer Support Policy
- Scope: app + infrastructure + auth flows + sync engine

### Continuous validation

- AWS WAF logs → Athena weekly review
- Quarterly chaos testing of rate limits + auth flows
- Quarterly tabletop incident response drill

## Developer security practices

- **No production data in dev/staging**: separate Cognito pools, separate Dynamo tables
- **Dev secrets**: stored in 1Password / GitHub secrets; never committed
- **`gitleaks` pre-commit hook** to catch accidental secrets
- **MFA mandatory** on AWS console + GitHub
- **GitHub branch protection**: required reviews, signed commits (post-MVP), CODEOWNERS
- **Quarterly access reviews**: who has what permissions
- **Annual security training** (post-team-growth)

## Cross-references

- Threat model details per service → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- Data classification → [02_DATA_MODEL.md](02_DATA_MODEL.md)
- API rate limits → [03_API_SPEC.md](03_API_SPEC.md)
- Compliance specifics → [10_APP_STORES.md](10_APP_STORES.md)
