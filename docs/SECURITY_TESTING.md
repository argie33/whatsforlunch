# Security Testing Plan (Phase C)

This document outlines all security tests required before MVP launch.

## 1. Unit Tests

### Auth Security

> Tests implemented in `services/auth/__tests__/crypto.test.ts`

- [x] Magic link nonce generation produces cryptographically random values
- [x] HMAC verification uses timing-safe comparison
- [x] Nonce expires after 10 minutes
- [ ] Nonce is deleted after first use (requires mocked DynamoDB — integration test)
- [x] IP class binding tolerates expected variance
- [x] Invalid HMAC is rejected

### Rate Limiting

- [ ] Rate limit counter increments on each request
- [ ] Limit exceeded returns 429 status
- [ ] Window resets correctly after 60 seconds
- [ ] Different operation types have different limits
- [ ] Concurrent requests are counted accurately

### Quota Enforcement

- [ ] Quota check returns available/remaining counts
- [ ] Deduction happens after successful operation
- [ ] Quota resets at midnight UTC
- [ ] Different tiers have different quotas
- [ ] Quota exhaustion blocks further requests

## 2. Integration Tests

### Cross-Tenant Data Leakage

> AppSync pipeline function tests implemented in `infra/cdk/lib/appsync/functions/__tests__/security.test.js`

```typescript
// Test: User A cannot access Household B (not a member)
const userA = await signUpUser('a@example.com');
const householdB = await createHousehold('B', ownerUserId: 'user-b-id');

const result = await userA.query(GET_HOUSEHOLD, { id: householdB.id });
expect(result.errors).toContainEqual(expect.objectContaining({
  message: 'Not a member of this household'
}));
```

### Household Membership Enforcement

```typescript
// Test: User is member, can access
const user = await signUpUser('test@example.com');
const household = await createHousehold('Test', { ownerId: user.id });
const result = await user.query(GET_HOUSEHOLD, { id: household.id });
expect(result.data.household).toBeDefined();
```

### Role-Based Access Control

```typescript
// Test: Non-owner cannot delete household
const owner = await signUpUser('owner@example.com');
const member = await signUpUser('member@example.com');
const household = await createHousehold('Test', { ownerId: owner.id });
await addHouseholdMember(household.id, member.id, 'member');

const result = await member.mutation(DELETE_HOUSEHOLD, { id: household.id });
expect(result.errors).toContainEqual(expect.objectContaining({
  message: 'Only household owner can perform this action'
}));
```

### Rate Limit Enforcement

```typescript
// Test: Exceeding rate limit returns 429
const user = await signUpUser('test@example.com');
const promises = [];
for (let i = 0; i < 105; i++) {
  promises.push(user.query(GET_ITEMS, { householdId }));
}

const results = await Promise.all(promises);
const rateLimited = results.filter(r => r.status === 429);
expect(rateLimited.length).toBeGreaterThan(0);
```

### AI Quota Enforcement

```typescript
// Test: Free tier users have 50 AI ops/day
const user = await signUpUser('test@example.com', { tier: 'free' });
for (let i = 0; i < 51; i++) {
  const result = await user.mutation(CLASSIFY_FOOD, { imageUrl: '...' });
  if (i < 50) {
    expect(result.data).toBeDefined();
  } else {
    expect(result.errors).toContainEqual(expect.objectContaining({
      message: 'AI quota exceeded'
    }));
  }
}
```

## 3. OWASP MASVS L1 Self-Assessment

> **Status: Complete** (2026-04-27) — see `OWASP_MASVS_L1_ASSESSMENT.md`
>
> 18/20 requirements met. Wave 2 deferred: root/jailbreak detection.

## 4. Penetration Testing Plan

### Scope

- Mobile app (iOS + Android builds)
- AppSync GraphQL API
- Cognito authentication flow
- Backend Lambda functions

### Out of Scope (post-MVP)

- Load testing / DDoS simulation (AWS WAF/Shield handles this)
- Network-level testing (AWS responsibility)
- Third-party service security (Anthropic/Google/Apple responsibility)

### Test Cases

#### Authentication

- [ ] Attempt to use expired magic link
- [ ] Attempt to reuse magic link (single-use enforcement)
- [ ] Attempt to steal magic link from another network
- [ ] Attempt to guess/brute-force nonce
- [ ] Intercept and replay session token
- [ ] Modify JWT claims and send to API
- [ ] Extract API key from app binary
- [ ] Test against credential stuffing

#### Authorization

- [ ] Attempt cross-household data access
- [ ] Attempt to modify other user's profile
- [ ] Attempt to delete other user's items
- [ ] Attempt owner-only ops as member
- [ ] Attempt to escalate role (member → owner)
- [ ] Test household membership checks on all operations

#### API Security

- [ ] GraphQL introspection in production
- [ ] GraphQL injection attacks
- [ ] Oversized payload (GraphQL + photo uploads)
- [ ] Rate limit bypass attempts
- [ ] Regex DoS in search fields

#### Data Security

- [ ] Attempt to download photos without permission
- [ ] Attempt to export data without authentication
- [ ] Verify EXIF data is stripped from uploads
- [ ] Verify photos use server-side encryption (KMS)
- [ ] Check for secrets in logs

#### Mobile App

- [ ] Reverse engineering to extract hardcoded secrets
- [ ] Attempt to modify APK/IPA post-compilation
- [ ] Check for debuggable code in release build
- [ ] Verify certificate pinning (if implemented)
- [ ] Check for obfuscation (Hermes bytecode, ProGuard)

### Tools

- **OWASP ZAP**: API fuzzing and vulnerability scanning
- **Burp Suite**: Manual testing and request manipulation
- **MobSF**: Mobile app binary analysis
- **Semgrep**: Static analysis of Lambda code
- **CodeQL**: Advanced code scanning

### Timeline

- **Week 1**: Authentication + authorization penetration testing
- **Week 2**: API security + data security testing
- **Week 3**: Mobile app analysis + remediation
- **Final review**: Team huddle on findings

## 5. MobSF Analysis

### Setup

```bash
# Install MobSF
pip install mobsf

# Start MobSF server
mobsf

# Visit http://localhost:8000
```

### Scanning Release Builds

```bash
# iOS (extract from ipa)
unzip app.ipa
./MobSF/scan payload/Payload/WhatsFresh.app

# Android
./MobSF/scan app-release.apk
```

### High Priority Findings

- [ ] No hardcoded API keys / secrets
- [ ] Code obfuscation enabled (Hermes, ProGuard)
- [ ] Keystore configured correctly
- [ ] Biometric auth fallback implemented
- [ ] No debug symbols in release build
- [ ] No sensitive logs in production

## 6. Compliance Checklist

### GDPR

- [ ] Account deletion works (Article 17)
- [ ] Data export works (Article 15)
- [ ] 30-day SLA documented
- [ ] Privacy policy references specific data categories

### CCPA

- [ ] Privacy policy includes CCPA disclosures
- [ ] "Do Not Sell My Data" link on landing page
- [ ] Opt-out mechanism functional

### COPPA (Children's Privacy)

- [ ] Age gate on signup (13+ minimum)
- [ ] Parent consent flow documented
- [ ] No behavioral tracking for <13

## 7. Post-Penetration Test Plan

For each finding:
1. Record severity (Critical / High / Medium / Low)
2. Assign remediation owner
3. Track in GitHub Issues with label `security`
4. Re-test after fix
5. Document resolution

### Severity Levels

- **Critical**: Immediate data leakage or account takeover
  - Fix before launch
- **High**: Significant risk with moderate effort
  - Fix before launch unless documented exception
- **Medium**: Lower risk or requires attacker sophistication
  - Fix in Phase 2 unless unfeasible to defer
- **Low**: Informational; hardening recommendations
  - Backlog for future improvement

## 8. Security Audit Sign-Off

Before MVP launch, W3 lead and security reviewer sign off:

- [ ] All Critical findings resolved
- [ ] All High findings resolved or documented exception
- [ ] OWASP MASVS L1 self-assessment complete
- [ ] MobSF scan reviewed
- [ ] Penetration test report reviewed
- [ ] Team security review meeting held
