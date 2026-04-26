# services/

Lambda functions organized by domain.

**Owners**: W2, W3, W4

## Layout (per docs/01_ARCHITECTURE.md)

```
services/
├── shared/                # Common Lambda helpers (Powertools, clients)
├── ai/                    # W4 — Bedrock + Textract Lambdas
│   ├── classify-food/
│   ├── ocr-expiry-date/
│   ├── ocr-receipt/
│   ├── suggest-recipes/
│   ├── suggest-restaurants/
│   ├── learn-preferences/
│   └── evals/             # AI eval suite
├── auth/                  # W3 — Cognito triggers
│   ├── define-challenge/
│   ├── create-challenge/
│   ├── verify-challenge/
│   ├── pre-signup/
│   └── post-confirm/
├── notifications/         # W2 — Push notification Lambdas
│   └── notify-expiring/
├── account/               # W2 — Account management
│   ├── delete-account/
│   └── export-data/
├── billing/               # W2 — RevenueCat webhook
│   └── revenuecat-webhook/
└── images/                # W4 — Image processing
    └── image-resize/
```

## Where to start

- W2: [`docs/02_DATA_MODEL.md`](../docs/02_DATA_MODEL.md), [`docs/03_API_SPEC.md`](../docs/03_API_SPEC.md)
- W3: [`docs/04_SECURITY.md`](../docs/04_SECURITY.md), [`docs/21_RBAC_AND_SECRETS.md`](../docs/21_RBAC_AND_SECRETS.md)
- W4: [`docs/06_AI_INTEGRATION.md`](../docs/06_AI_INTEGRATION.md)
