# @wfl/web

Astro marketing site. Hosts landing page, privacy policy, terms, Universal Links files.

**Owner**: W10 (design / polish)

## Where to start

1. Read [`docs/17_LANDING_PAGE.md`](../../docs/17_LANDING_PAGE.md) for the full spec
2. Read [`docs/22_MARKETING_SEO.md`](../../docs/22_MARKETING_SEO.md) for SEO strategy
3. Read [`docs/18_DNS_DOMAINS.md`](../../docs/18_DNS_DOMAINS.md) for URLs and Universal Links

## Build

To be scaffolded (Astro + Tailwind). Per [`docs/17_LANDING_PAGE.md`](../../docs/17_LANDING_PAGE.md):

```
apps/web/
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── privacy.mdx
│   │   ├── terms.mdx
│   │   ├── support.astro
│   │   ├── press.astro
│   │   ├── c/[token].astro       # QR redirect
│   │   └── auth/verify.astro     # magic link landing
│   └── public/
│       └── .well-known/
│           ├── apple-app-site-association
│           └── assetlinks.json
└── ...
```
