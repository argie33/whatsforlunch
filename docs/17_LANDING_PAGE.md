# 17 — Marketing Landing Page

A simple website at `whatsforlunch.app` that markets the product, hosts privacy/terms, and routes users to App Store / Play Store. Hosted on AWS, deployed via CDK + GitHub Actions.

## Why we need this (day one)

1. **App Store + Play Store both require a marketing URL** in their listings
2. **Privacy Policy and Terms of Service must be hosted somewhere public** (mandatory)
3. **Universal Links / App Links require web hosting** (`apple-app-site-association` and `assetlinks.json`)
4. **First impression for press, beta testers, and curious people**
5. **SEO foothold** for `whatsforlunch.app`-related searches
6. **Email signature destination** for support emails

## Pages required

### `/` — Home (the landing)
Simple, single-page, fast.

```
┌─────────────────────────────────────────────┐
│   [logo]  WhatsForLunch              [Sign in?]│
│                                              │
│                                              │
│         Stop wasting food.                   │
│                                              │
│         Track everything in your kitchen.    │
│         Get reminded just in time.           │
│         Cook what's about to spoil.          │
│                                              │
│  ┌────────────────┐  ┌────────────────┐     │
│  │ 📱 App Store   │  │ ▶ Google Play  │     │
│  └────────────────┘  └────────────────┘     │
│                                              │
│         [hero screenshot of app, ~440pt]     │
│                                              │
└─────────────────────────────────────────────┘
   ─────────────────────────────────────────
   Three feature blocks below:
   1. "Snap a photo" (AI classification)
   2. "Get reminded" (notifications)
   3. "Cook smart" (recipe suggestions)
   ─────────────────────────────────────────
   FAQ accordion (5-7 questions)
   ─────────────────────────────────────────
   Footer: links to /privacy, /terms, /support, /press, social
```

**MVP: single-page, no nav menu beyond footer.** Add more pages as needed.

### `/privacy` — Privacy Policy (required)
Static page rendered from Markdown.

### `/terms` — Terms of Service (required)
Static page rendered from Markdown.

### `/support` — Support / FAQ landing
Either an iframe of Notion (MVP) or custom page with FAQ + contact form (post-MVP).

### `/press` — Press Kit (Wave 2+)
Logo download, screenshots, founder bio, press inquiries email.

### `/c/:qrToken` — QR code redirect
Universal Link target. Logic:
- If app installed → opens app via Universal Link
- If app not installed → redirects to App Store / Play Store with attribution
- The page itself shows: "Open in WhatsForLunch app" with download CTAs as fallback

### `/auth/verify` — Magic link landing
The magic link target. Mobile users open this link → Universal Link triggers app open. Desktop users see "open this link on your phone."

### `/.well-known/apple-app-site-association` — required for iOS Universal Links

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "<TEAM_ID>.app.whatsforlunch.mobile",
        "paths": ["/c/*", "/auth/verify*"]
      }
    ]
  }
}
```

Served as `application/json` (no `.json` extension), `Cache-Control: max-age=3600`.

### `/.well-known/assetlinks.json` — required for Android App Links

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.whatsforlunch.mobile",
    "sha256_cert_fingerprints": ["<SHA256>"]
  }
}]
```

### `/sitemap.xml` and `/robots.txt`
Standard SEO basics.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | **Astro** (static site generator, zero JS by default) |
| Hosting | **S3 + CloudFront** (within our existing infra) |
| Styling | Tailwind CSS |
| Markdown | Astro's built-in MDX support for /privacy, /terms |
| Images | Astro Image (optimized, responsive) |
| Fonts | System or Inter via fontsource |
| Forms (post-MVP) | Cloudflare Turnstile + Lambda → SES |
| Analytics | Plausible (privacy-friendly, $9/mo) or PostHog (already paid for) |

**Why Astro over alternatives**:
- Static HTML by default (fast, cheap to host, no runtime cost)
- Markdown / MDX first-class for legal pages
- Free, open source
- Beats Next.js for static sites (no React server overhead)
- Beats vanilla HTML (developer ergonomics, components)
- Beats Webflow / Framer (no vendor lock-in, deployable to our AWS)

## Repository structure

```
apps/
├── mobile/                    # the React Native app
└── web/                       # NEW — marketing site
    ├── src/
    │   ├── pages/
    │   │   ├── index.astro
    │   │   ├── privacy.mdx
    │   │   ├── terms.mdx
    │   │   ├── support.astro
    │   │   ├── press.astro
    │   │   ├── c/[token].astro      # QR redirect
    │   │   └── auth/verify.astro    # magic link landing
    │   ├── public/
    │   │   ├── .well-known/
    │   │   │   ├── apple-app-site-association
    │   │   │   └── assetlinks.json
    │   │   ├── robots.txt
    │   │   ├── sitemap.xml
    │   │   ├── og-image.png
    │   │   ├── favicon.ico
    │   │   └── apple-touch-icon.png
    │   ├── components/
    │   │   ├── Hero.astro
    │   │   ├── Features.astro
    │   │   ├── DownloadButtons.astro
    │   │   ├── FAQ.astro
    │   │   └── Footer.astro
    │   ├── layouts/
    │   │   └── BaseLayout.astro
    │   └── content/
    │       ├── privacy.md           # source of truth for privacy
    │       └── terms.md
    ├── astro.config.mjs
    ├── tailwind.config.cjs
    └── package.json
```

## CDK stack for the web

Add to `infra/cdk/lib/stacks/`:

```typescript
// web-stack.ts (sketch)
new s3.Bucket(this, 'WebBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(webBucket, { originAccessIdentity: oai }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    responseHeadersPolicy: securityHeadersPolicy, // CSP, HSTS, etc.
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
  additionalBehaviors: {
    // .well-known files: short cache, application/json content-type
    '/.well-known/*': {
      origin: new origins.S3Origin(webBucket),
      cachePolicy: shortCachePolicy,
      responseHeadersPolicy: wellKnownHeadersPolicy,
    },
  },
  certificate: webCert,
  domainNames: ['whatsforlunch.app', 'www.whatsforlunch.app', 'app.whatsforlunch.app'],
  defaultRootObject: 'index.html',
  errorResponses: [
    { httpStatus: 404, responseHttpStatus: 404, responsePagePath: '/404.html' },
  ],
  webAclId: webAcl.attrArn,  // attach WAF
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US/EU only at MVP
});
```

**WAF on the web** (cheap, sensible rules):
- AWSManagedRulesCommonRuleSet
- AWSManagedRulesAmazonIpReputationList
- Rate limit 5000 req/5min/IP

**Security headers** (response headers policy):

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.posthog.com; font-src 'self';
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Deploy pipeline

Add to `.github/workflows/`:

```yaml
# deploy-web.yml
name: Deploy Web
on:
  push:
    branches: [main]
    paths: ['apps/web/**']
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @wfl/web build
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_PROD }}
          aws-region: us-east-1
      - run: aws s3 sync apps/web/dist s3://wfl-web-prod --delete --cache-control 'max-age=31536000,public' --exclude '*.html' --exclude '.well-known/*'
      - run: aws s3 sync apps/web/dist s3://wfl-web-prod --cache-control 'max-age=300,public' --exclude '*' --include '*.html'
      - run: aws s3 sync apps/web/dist s3://wfl-web-prod --content-type 'application/json' --cache-control 'max-age=3600' --exclude '*' --include '.well-known/*'
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.WEB_CF_DIST_ID }} --paths '/*'
```

Cache strategy:
- Static assets (JS, CSS, images): 1 year, immutable
- HTML: 5 min (allow quick updates)
- `.well-known/*`: 1 hour, application/json content-type

## Performance targets

- Lighthouse score: ≥ 95 on every metric (Performance, Accessibility, Best Practices, SEO)
- LCP < 1.5s on 3G
- Total page weight < 200KB (excluding hero image)
- No render-blocking JS

## Accessibility

- All images have alt text
- Color contrast WCAG AA
- Keyboard navigation works
- Screen-reader tested

## SEO basics

- Title + meta description per page
- Open Graph + Twitter Card meta tags
- Schema.org structured data: `MobileApplication`
- Sitemap.xml auto-generated by Astro
- robots.txt allowing all
- Submit sitemap to Google Search Console

## Analytics

**Plausible** ($9/mo) — privacy-friendly, no cookie banner needed (no PII).

OR

**PostHog** (already paid for) — same web analytics, dogfooding our existing tool.

We'll go with PostHog at MVP. No cookie consent needed (PostHog can be configured with no cookies).

## App Store badges

Use **official Apple "Download on the App Store" badge** and **Google Play "Get it on Google Play" badge**.

```html
<a href="https://apps.apple.com/app/idXXXX">
  <img src="/badges/appstore.svg" alt="Download on the App Store" />
</a>
<a href="https://play.google.com/store/apps/details?id=app.whatsforlunch.mobile">
  <img src="/badges/playstore.svg" alt="Get it on Google Play" />
</a>
```

Use **Apple's official artwork** (not custom). Use **Google's official badge generator**.

## Smart App Banner (iOS Safari)

Add to `<head>` so users browsing in Safari on iPhone see a one-tap App Store install:

```html
<meta name="apple-itunes-app" content="app-id=XXXXXXXX">
```

## Email collection (Wave 2+)

Add a "Notify me when X launches" form for new features:
- Cloudflare Turnstile (free, replaces reCAPTCHA)
- POST to API Gateway → Lambda → SES adds to mailing list (in DynamoDB)
- Confirm email opt-in (double opt-in for GDPR)

Not needed at MVP since the product itself is launching.

## Press kit page (Wave 2+)

`/press` page with:
- Logo PNG/SVG (light + dark)
- Hero screenshots (all device sizes, framed)
- Founder bio + photo
- One-line description
- Long description (boilerplate)
- Press inquiries: `press@whatsforlunch.app`

## DNS records for the web (full list in [18_DNS_DOMAINS.md](18_DNS_DOMAINS.md))

- `whatsforlunch.app` → CloudFront alias
- `www.whatsforlunch.app` → CloudFront alias (or 301 to apex)

## Testing

- Local dev: `pnpm --filter @wfl/web dev` runs Astro dev server
- Deploys to PR preview at `pr-123.preview.whatsforlunch.app` via CDK ephemeral env
- Lighthouse CI runs on every PR
- Broken link checker

## Cost

- S3 storage: < $0.10/mo (small site)
- CloudFront: ~$0.50/mo at MVP traffic (1k visitors/mo)
- Total: < $5/mo at MVP scale

## Cross-references

- DNS / domains all listed → [18_DNS_DOMAINS.md](18_DNS_DOMAINS.md)
- CI/CD details → [19_CICD_PIPELINE.md](19_CICD_PIPELINE.md)
- Privacy policy contents → [04_SECURITY.md](04_SECURITY.md)
- App store listing → [10_APP_STORES.md](10_APP_STORES.md)
