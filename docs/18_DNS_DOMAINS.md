# 18 — DNS, Domains, URLs, Certificates

Every URL we need, every DNS record, every certificate. Managed via Route 53 + ACM via CDK.

## Apex domain

**Primary**: `whatsforlunch.app` (TBD — confirm before MVP)

**Why `.app`**: requires HTTPS by default (HSTS preloaded TLD), good for a mobile app brand, ~$15/yr.

**Alternatives if not available**:
- `whatsforlunch.io`
- `whatsforlunch.co`
- `wfl.app`

## DNS authority

**Use Route 53** for the apex domain (managed via CDK).

If domain is registered elsewhere (e.g., Namecheap), delegate the NS records to Route 53.

```typescript
// CDK: hosted zone
const hostedZone = new route53.HostedZone(this, 'HostedZone', {
  zoneName: 'whatsforlunch.app',
});
```

## Subdomain map (full)

| Subdomain | Purpose | Backend | Environment |
|---|---|---|---|
| `whatsforlunch.app` | Marketing landing page | CloudFront → S3 (web) | prod |
| `www.whatsforlunch.app` | 301 → apex | CloudFront redirect | prod |
| `app.whatsforlunch.app` | Universal Link target + magic link landing | CloudFront → S3 (web) | prod |
| `api.whatsforlunch.app` | AppSync GraphQL (HTTP) | CloudFront → AppSync | prod |
| `realtime.whatsforlunch.app` | AppSync GraphQL subscriptions (WebSocket) | AppSync (real-time) | prod |
| `mcp.whatsforlunch.app` | MCP server (Wave 6) | API Gateway → Lambda | prod |
| `cdn.whatsforlunch.app` | Static assets (food rule icons, app images) | CloudFront → S3 | prod |
| `photos.whatsforlunch.app` | Signed S3 URLs for photos | CloudFront → S3 | prod |
| `staging.whatsforlunch.app` | Staging marketing site | CloudFront → S3 | staging |
| `api-staging.whatsforlunch.app` | Staging AppSync | CloudFront → AppSync | staging |
| `app-staging.whatsforlunch.app` | Staging Universal Link target | CloudFront → S3 | staging |
| `dev-<name>.whatsforlunch.app` | Per-developer environment | CloudFront → AppSync | dev |
| `pr-<num>.preview.whatsforlunch.app` | Ephemeral PR environment | CloudFront → AppSync | dev (ephemeral) |
| `status.whatsforlunch.app` | Status page (Wave 3+) | Instatus / Better Stack | prod |
| `mail.whatsforlunch.app` | (placeholder — used internally for tracking, not user-facing) | SES | prod |

## Required URLs by use case

### App Store / Play Store listings
- Marketing URL: `https://whatsforlunch.app/`
- Privacy Policy URL: `https://whatsforlunch.app/privacy`
- Support URL: `https://whatsforlunch.app/support`
- Terms URL: `https://whatsforlunch.app/terms`

### Universal Links (iOS) / App Links (Android)
- AASA file: `https://app.whatsforlunch.app/.well-known/apple-app-site-association`
- assetlinks.json: `https://app.whatsforlunch.app/.well-known/assetlinks.json`
- QR scan deep links: `https://app.whatsforlunch.app/c/<token>`
- Magic link verification: `https://app.whatsforlunch.app/auth/verify?token=<nonce>`
- Apple Sign-In return URL: `https://app.whatsforlunch.app/auth/apple/callback`
- Google Sign-In return URL: `https://app.whatsforlunch.app/auth/google/callback`

### Mobile API endpoints
- GraphQL: `https://api.whatsforlunch.app/graphql`
- WebSocket subscriptions: `wss://realtime.whatsforlunch.app/graphql`
- REST webhooks (future): `https://api.whatsforlunch.app/v1/*`
- RevenueCat webhook: `https://api.whatsforlunch.app/webhooks/revenuecat`

### Email infrastructure
- SES sending domain: `whatsforlunch.app` (with DKIM, SPF, DMARC)
- Magic links sent from: `noreply@whatsforlunch.app`
- Support emails: `support@whatsforlunch.app`
- General: `hello@whatsforlunch.app`
- Press: `press@whatsforlunch.app`
- Security disclosures: `security@whatsforlunch.app`

### Future
- MCP: `https://mcp.whatsforlunch.app/v1`
- Public REST API: `https://api.whatsforlunch.app/v1` (versioned)

## Route 53 records (CDK)

```typescript
// Apex: alias to CloudFront web distribution
new route53.ARecord(this, 'WebApex', {
  zone: hostedZone,
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(webDistribution)),
});

// www: same alias (or use 301 redirect)
new route53.ARecord(this, 'WebWww', {
  zone: hostedZone,
  recordName: 'www',
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(webDistribution)),
});

// app subdomain (Universal Links host)
new route53.ARecord(this, 'AppSubdomain', {
  zone: hostedZone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(webDistribution)),
});

// api subdomain (AppSync)
new route53.ARecord(this, 'ApiSubdomain', {
  zone: hostedZone,
  recordName: 'api',
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(apiDistribution)),
});

// realtime subdomain (AppSync WebSocket)
new route53.CnameRecord(this, 'RealtimeSubdomain', {
  zone: hostedZone,
  recordName: 'realtime',
  domainName: appsync.realtimeDns,
});

// SES MX + DKIM + SPF + DMARC
new route53.MxRecord(this, 'MxRecord', {
  zone: hostedZone,
  values: [{ priority: 10, hostName: 'inbound-smtp.us-east-1.amazonaws.com' }],
});

new route53.TxtRecord(this, 'SpfRecord', {
  zone: hostedZone,
  values: ['v=spf1 include:amazonses.com ~all'],
});

// DKIM records auto-created by SES; reference by name
sesIdentity.dkimTokens.forEach((token, i) => {
  new route53.CnameRecord(this, `DkimRecord${i}`, {
    zone: hostedZone,
    recordName: `${token}._domainkey`,
    domainName: `${token}.dkim.amazonses.com`,
  });
});

new route53.TxtRecord(this, 'DmarcRecord', {
  zone: hostedZone,
  recordName: '_dmarc',
  values: ['v=DMARC1; p=quarantine; rua=mailto:dmarc@whatsforlunch.app; pct=100'],
});

// CAA records: only allow Amazon to issue certs
new route53.CaaRecord(this, 'CaaRecord', {
  zone: hostedZone,
  values: [
    { flag: 0, tag: route53.CaaTag.ISSUE, value: 'amazon.com' },
    { flag: 0, tag: route53.CaaTag.ISSUEWILD, value: 'amazon.com' },
    { flag: 0, tag: route53.CaaTag.IODEF, value: 'mailto:security@whatsforlunch.app' },
  ],
});
```

## ACM certificates

**ACM is free, auto-renewed, integrates with CloudFront and ALB.**

Two strategies:

### Strategy A — One wildcard cert (simpler)
- `*.whatsforlunch.app` + `whatsforlunch.app`
- Covers all subdomains
- Use for CloudFront

### Strategy B — Per-subdomain certs (more granular, recommended for prod)
- `whatsforlunch.app` (apex + www via SAN)
- `app.whatsforlunch.app`
- `api.whatsforlunch.app`
- `cdn.whatsforlunch.app`
- `photos.whatsforlunch.app`
- `mcp.whatsforlunch.app`

CDK example:

```typescript
const cert = new acm.Certificate(this, 'WebCert', {
  domainName: 'whatsforlunch.app',
  subjectAlternativeNames: ['www.whatsforlunch.app', 'app.whatsforlunch.app'],
  validation: acm.CertificateValidation.fromDns(hostedZone),
});
```

**Important**: Certificates for CloudFront must be in `us-east-1`. Use `crossRegionReferences: true` if your stack is in another region.

## DNSSEC (post-MVP)

Enable DNSSEC on Route 53 hosted zone for DNS spoofing protection. Adds ~$2/mo for KMS key.

Not enabled at MVP; add in Wave 2.

## Vanity domains (deferred)

Right now, all subdomains live under `whatsforlunch.app`. We're not paying for vanity domains like `wfl.app` or country TLDs.

When relevant (post-Series A or major partnership), revisit:
- `wfl.app` — short, brandable
- `whats.cooking` — fun TLD
- Country TLDs for regional launch (`whatsforlunch.de`, `.fr`, etc.)

## Domain registrar

**Recommendation**: Register via **AWS Route 53 Domains** for:
- Single bill
- Auto-renewal
- IAM-controlled access
- DNSSEC native

If domain is on Namecheap / GoDaddy / etc., transfer to Route 53 within 60 days of MVP launch.

## Email DNS records

| Record | Value |
|---|---|
| `MX` (apex) | `10 inbound-smtp.us-east-1.amazonaws.com` |
| `TXT` (apex) — SPF | `v=spf1 include:amazonses.com ~all` |
| `CNAME` (`<token>._domainkey`) — DKIM | `<token>.dkim.amazonses.com` (3 records) |
| `TXT` (`_dmarc`) — DMARC | `v=DMARC1; p=quarantine; rua=mailto:dmarc@whatsforlunch.app; pct=100` |
| `MX` (`mail`) | (only if running our own mail server, which we're not) |

DMARC starts at `p=quarantine` (warn). Move to `p=reject` after 30 days of clean reports.

## TLS configuration

| Endpoint | TLS Min | Ciphers |
|---|---|---|
| CloudFront (web + api) | TLS 1.3 (TLS 1.2 fallback) | AWS recommended (TLSv1.2_2021 or TLSv1.3) |
| AppSync direct | TLS 1.2+ (managed by AWS) | AWS managed |
| ALB (none at MVP) | TLS 1.3 | Modern |

HSTS preload enabled on apex domain after stable for 30+ days.

## DNS rollout sequence (pre-launch)

1. **Week -4**: Register domain via Route 53 Domains. Create hosted zone.
2. **Week -3**: Issue ACM certs (DNS-validated, auto via CDK).
3. **Week -3**: Deploy CDK web stack. Confirm `https://whatsforlunch.app` shows the landing page.
4. **Week -2**: Deploy CDK api stack. Confirm `https://api.whatsforlunch.app/graphql` returns playground.
5. **Week -2**: Deploy `app.whatsforlunch.app` with AASA + assetlinks.
6. **Week -2**: Validate Universal Links / App Links via Apple's test tool + Google's test tool.
7. **Week -1**: Submit AASA + assetlinks to Google's verification (`https://digitalassetlinks.googleapis.com/v1/statements:list`).
8. **Week -1**: Set up SES + DKIM/SPF/DMARC. Send test magic link.
9. **Week 0**: Launch. Monitor cert renewal, DNS propagation.

## Operational runbook items

- **Cert about to expire**: ACM auto-renews 60 days before expiry; alarm if renewal fails
- **DNS resolver failure**: Route 53 has 100% SLA; if it ever fails, AWS issue
- **DMARC reports**: weekly review of dmarc-reports@whatsforlunch.app
- **Domain auto-renew**: enabled; alarm 90 days before expiry as backup

## DNS-related security

- **CAA records** restrict cert issuance to Amazon
- **DMARC at `p=quarantine`** prevents spoofing of @whatsforlunch.app
- **HSTS preload** prevents downgrade attacks
- **DNSSEC** (post-MVP) prevents cache poisoning

## What we DON'T register at MVP

- Country TLDs (`.de`, `.fr`, etc.)
- Misspellings (typosquats) — revisit if we hit > 50K users
- Trademark / brand defensive registrations — revisit when funded

## Domain costs

| Item | Annual |
|---|---|
| `whatsforlunch.app` registration | ~$15 |
| Route 53 hosted zone | $0.50/mo = $6/yr |
| Route 53 queries | < $1/yr at our scale |
| ACM certs | Free |
| DNSSEC (when enabled) | ~$24/yr (KMS key) |

Total DNS overhead: ~$25/yr.

## Cross-references

- Landing page deployment → [17_LANDING_PAGE.md](17_LANDING_PAGE.md)
- CI/CD pipeline → [19_CICD_PIPELINE.md](19_CICD_PIPELINE.md)
- Email security → [04_SECURITY.md](04_SECURITY.md)
- Architecture → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
