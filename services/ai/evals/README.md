# AI Evaluation Suite

Automated testing and benchmarking for all AI models used in WhatsFresh.

## Structure

```
evals/
├── classify-food/       # Photo classification dataset + eval scripts
│   ├── photos/          # ~500-1000 labeled food photos
│   ├── ground-truth.csv # food_type, days_safe, confidence
│   └── eval.ts          # Classification accuracy, calibration
├── ocr-expiry-date/     # Expiry date OCR dataset
│   ├── receipts/        # ~50 packaging photos
│   ├── ground-truth.csv # expected date, confidence
│   └── eval.ts
├── ocr-receipt/         # Receipt parsing dataset
│   ├── receipts/        # ~100 receipt images
│   ├── ground-truth.csv # line items, total amount
│   └── eval.ts
└── shared/              # Common eval utilities
    └── metrics.ts       # Accuracy, latency, cost calculation
```

## Running evals

```bash
pnpm ai:eval classify-food
pnpm ai:eval ocr-expiry-date
pnpm ai:eval ocr-receipt
```

Each eval outputs:
- **Accuracy**: % of top-choice predictions correct
- **Calibration**: precision-recall for confidence thresholds
- **Latency**: P50, P95, P99 (ms)
- **Cost**: total tokens, estimated USD cost
- **Regressions**: flagged if accuracy drops > 2%

## CI integration

Evals run on every PR that touches `services/ai/` or prompt changes. Build fails if:
- Accuracy drops > 2%
- P95 latency > 5s (per model SLA)
- Any critical eval dataset is missing

## Phase B checklist

- [ ] Collect 500+ labeled food photos (diverse cuisines, lighting, containers)
- [ ] Collect 50+ expiry date packaging images (various date formats)
- [ ] Collect 100+ receipt images (various retailers, formats)
- [ ] Implement eval scripts for all three tasks
- [ ] Set up Langfuse or Braintrust for eval tracking
- [ ] Configure eval CI job
- [ ] Define acceptable accuracy/latency baselines
