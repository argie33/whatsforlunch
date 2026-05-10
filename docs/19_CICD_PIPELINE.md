# 19 — CI/CD Pipeline (Full Specification)

This is the complete CI/CD specification. Every pipeline, every check, every deploy gate, every security scan. Builders implement exactly what's described.

## Overall philosophy

- **Trunk-based development**: short-lived branches, merge to `main`
- **Every commit is potentially deployable**: `main` always passes CI
- **Automated everything**: no manual deploys, no manual environment setup
- **Defense in depth**: multiple scans (SAST, DAST, dependency, secret, IaC, container)
- **Fast feedback**: CI under 10 minutes for typical PR
- **Fail closed**: any security or test failure blocks merge
- **Reproducible**: every build pinned to versions, locked dependencies
- **Observable**: every pipeline emits metrics; dashboards for build health
- **Secure by design**: OIDC for cloud auth, no long-lived secrets, signed artifacts

## Source control

### Repository
- **GitHub** organization: `wfl-org` (TBD)
- **Repository**: `whatsfresh` (mono-repo)
- **Default branch**: `main`
- **License**: All-rights-reserved at MVP; consider open-sourcing parts post-launch

### Branch protection rules on `main`
- Require pull request before merging
- Require **at least 1 approval**
- Dismiss stale approvals on new commits
- Require status checks (all listed below) to pass
- Require branches to be up-to-date with main
- Require **conversation resolution**
- Require **signed commits** (post-MVP, all developers GPG/SSH-sign)
- Require **linear history** (squash-only merge strategy)
- Restrict who can push (org admins only; everyone else uses PRs)
- Restrict force pushes (no one)
- Restrict deletions (no one)
- Require code owner reviews for protected paths

### Required status checks (must all be green to merge)
- `ci / typecheck`
- `ci / lint`
- `ci / format`
- `ci / unit-tests`
- `ci / component-tests`
- `ci / graphql-validate`
- `ci / cdk-synth`
- `security / semgrep`
- `security / codeql`
- `security / dependency-scan`
- `security / secret-scan`
- `security / iac-scan`
- `security / sbom`
- `security / license-check`
- `mobile / lint-mobile`
- `mobile / build-android-debug`
- `mobile / e2e-maestro` (selected flows on PR)
- `web / build-web`
- `web / lighthouse`
- `coverage` (≥ defined thresholds)

### CODEOWNERS file

```
# .github/CODEOWNERS
* @wfl-org/maintainers

# Critical paths require specific reviewers
/infra/cdk/                  @wfl-org/infra-team
/services/auth/              @wfl-org/security-team
/services/ai/                @wfl-org/ai-team
/docs/04_SECURITY.md         @wfl-org/security-team
/docs/02_DATA_MODEL.md       @wfl-org/backend-team
/.github/workflows/          @wfl-org/devops-team
```

## Pipelines (complete catalog)

All pipeline files live in `.github/workflows/`. We have **15 distinct pipelines**:

| Pipeline | Trigger | Purpose |
|---|---|---|
| `ci.yml` | PR open / sync | Fast feedback: lint, typecheck, unit |
| `security.yml` | PR open / sync | All security scans |
| `coverage.yml` | PR open / sync | Test coverage report |
| `mobile-pr.yml` | PR open / sync (mobile changes) | Mobile build + E2E |
| `web-pr.yml` | PR open / sync (web changes) | Web build + Lighthouse |
| `pr-env.yml` | PR open / sync | Ephemeral preview environment |
| `pr-cleanup.yml` | PR closed | Tear down preview env |
| `deploy-staging.yml` | Push to main | Auto-deploy backend + web to staging |
| `eas-update-staging.yml` | Push to main (mobile changes) | OTA update to staging channel |
| `deploy-production.yml` | Tag push or manual | Deploy backend + web to prod |
| `mobile-build.yml` | Tag push | EAS Build production iOS + Android |
| `mobile-submit.yml` | Manual after build success | EAS Submit to App Store + Play |
| `eas-update-production.yml` | Manual | OTA hotfix to production channel |
| `nightly.yml` | Daily 03:00 UTC | Full E2E + AI eval + perf benchmarks |
| `dependency-update.yml` | Weekly | Auto-PR for minor/patch updates |

### Pipeline 1 — `ci.yml` (fast feedback, runs on every PR)

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    name: Setup
    runs-on: ubuntu-latest
    outputs:
      node-version: 20.x
      pnpm-version: 9
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm graphql:codegen
      - run: git diff --exit-code  # fail if codegen produced changes not committed

  lint:
    name: Lint
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint -- --max-warnings=0

  format:
    name: Format check
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check

  unit-tests:
    name: Unit tests
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --coverage --reporter=junit --outputFile=junit.xml
      - uses: actions/upload-artifact@v4
        with:
          name: unit-coverage
          path: coverage/

  component-tests:
    name: Component tests (RN Testing Library)
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @wfl/mobile test:component

  graphql-validate:
    name: GraphQL schema validation
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm graphql:validate
      - run: pnpm graphql:breaking-changes  # warns on breaking changes

  cdk-synth:
    name: CDK synth
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @wfl/infra cdk synth --context env=staging
      - run: pnpm --filter @wfl/infra cdk synth --context env=prod
```

### Pipeline 2 — `security.yml` (all security scans)

```yaml
name: Security
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # daily 06:00 UTC for catching drifts

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  secret-scan:
    name: Secret scan (gitleaks)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

  dependency-scan:
    name: Dependency scan (Snyk + npm audit)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Snyk (fail on HIGH+)
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --all-projects
      - run: pnpm audit --audit-level high  # fallback

  semgrep:
    name: Semgrep SAST
    runs-on: ubuntu-latest
    container: returntocorp/semgrep
    steps:
      - uses: actions/checkout@v4
      - run: |
          semgrep ci \
            --config=p/owasp-top-ten \
            --config=p/react \
            --config=p/typescript \
            --config=p/jwt \
            --config=p/nodejs \
            --config=p/aws \
            --sarif --output=semgrep.sarif
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif

  codeql:
    name: CodeQL
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended,security-and-quality
      - uses: github/codeql-action/analyze@v3

  iac-scan:
    name: IaC scan (Checkov + cfn-lint)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @wfl/infra cdk synth --context env=prod -o cdk.out
      - uses: bridgecrewio/checkov-action@master
        with:
          directory: cdk.out/
          framework: cloudformation
          soft_fail: false
          output_format: sarif
          output_file_path: checkov.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: checkov.sarif
      - run: pip install cfn-lint && cfn-lint cdk.out/*.template.json

  sbom:
    name: SBOM (CycloneDX)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx @cyclonedx/cdxgen -o sbom.json
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
          retention-days: 90

  license-check:
    name: License compliance
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;CC0-1.0;CC-BY-3.0;CC-BY-4.0;Unlicense;0BSD;Python-2.0;Apache-2.0 WITH LLVM-exception"

  mobile-security:
    name: MobSF (mobile security)
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: docker run -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest &
      - name: Build APK for scanning
        run: |
          # build a signed debug APK
          npx expo prebuild --platform android --clean
          cd android && ./gradlew assembleRelease
      - name: Upload to MobSF
        run: |
          curl -F "file=@android/app/build/outputs/apk/release/*.apk" http://localhost:8000/api/v1/upload -H "Authorization: $MOBSF_API_KEY"
```

### Pipeline 3 — `coverage.yml`

```yaml
name: Coverage
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true
      - name: Coverage gate
        run: |
          pnpm coverage:check --threshold='{"global":{"statements":80,"branches":75,"functions":80,"lines":80}}'
```

Coverage thresholds (per-package, enforced in `vitest.config.ts` / `jest.config.js`):

```
packages/shared/        100% statements, 100% branches
services/               80% statements, 75% branches
apps/mobile/services/   70% statements, 65% branches
apps/mobile/components/ 60% (covered by E2E)
apps/web/               50% (mostly static content)
```

### Pipeline 4 — `mobile-pr.yml`

```yaml
name: Mobile PR
on:
  pull_request:
    paths:
      - 'apps/mobile/**'
      - 'packages/shared/**'
      - '.github/workflows/mobile-pr.yml'

permissions:
  contents: read

jobs:
  lint-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @wfl/mobile lint
      - run: pnpm --filter @wfl/mobile lint:a11y

  build-android-debug:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: 3.2 }
      - run: pnpm install --frozen-lockfile
      - name: Setup EAS
        run: npx eas-cli@latest --version
      - name: Login EAS
        run: npx eas-cli login --token ${{ secrets.EXPO_TOKEN }}
      - name: Build Android debug
        run: npx eas-cli build --platform android --profile preview --non-interactive --no-wait
      - name: Wait for build URL
        id: build
        run: echo "url=$(npx eas-cli build:list --json --limit 1 | jq -r '.[0].artifacts.buildUrl')" >> $GITHUB_OUTPUT

  e2e-maestro:
    runs-on: ubuntu-latest
    needs: build-android-debug
    if: github.event.pull_request.head.repo.full_name == github.repository
    steps:
      - uses: actions/checkout@v4
      - name: Run Maestro Cloud
        uses: mobile-dev-inc/action-maestro-cloud@v1
        with:
          api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
          app-file: ${{ needs.build-android-debug.outputs.build-url }}
          flows: |
            apps/mobile/.maestro/flows/critical/onboarding.yaml
            apps/mobile/.maestro/flows/critical/scan-qr.yaml
            apps/mobile/.maestro/flows/critical/add-item-manual.yaml

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @wfl/mobile storybook:build
      - uses: chromaui/action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          projectToken: ${{ secrets.CHROMATIC_TOKEN }}
          storybookBuildDir: apps/mobile/storybook-static
          exitZeroOnChanges: false  # fail PR on visual changes pending review
```

### Pipeline 5 — `web-pr.yml`

```yaml
name: Web PR
on:
  pull_request:
    paths:
      - 'apps/web/**'
      - '.github/workflows/web-pr.yml'

permissions:
  contents: read

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @wfl/web build
      - uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: apps/web/dist/

  lighthouse:
    runs-on: ubuntu-latest
    needs: build-web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: web-dist
          path: apps/web/dist/
      - uses: treosh/lighthouse-ci-action@v11
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: ./apps/web/lighthouserc.json

  link-check:
    runs-on: ubuntu-latest
    needs: build-web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: web-dist, path: apps/web/dist/ }
      - run: npx broken-link-checker@latest -ro apps/web/dist/

  html-validate:
    runs-on: ubuntu-latest
    needs: build-web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: web-dist, path: apps/web/dist/ }
      - run: npx html-validate@latest 'apps/web/dist/**/*.html'

  axe-a11y:
    runs-on: ubuntu-latest
    needs: build-web
    steps:
      - uses: actions/checkout@v4
      - run: pnpm dlx @axe-core/cli http://localhost:4321 --exit
```

Lighthouse thresholds (`lighthouserc.json`):

```json
{
  "ci": {
    "collect": { "staticDistDir": "./apps/web/dist", "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 1.00 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

### Pipeline 6 — `pr-env.yml` (ephemeral preview)

```yaml
name: PR Preview Environment
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  id-token: write
  contents: read
  pull-requests: write

concurrency:
  group: pr-env-${{ github.event.number }}
  cancel-in-progress: true

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    environment: preview
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_DEV }}
          aws-region: us-east-1
      - name: Deploy backend stacks
        run: pnpm --filter @wfl/infra cdk deploy --all --context env=pr-${{ github.event.number }} --require-approval never
      - name: Build & deploy web
        run: |
          pnpm --filter @wfl/web build
          aws s3 sync apps/web/dist s3://wfl-web-pr-${{ github.event.number }} --delete
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const num = context.issue.number;
            const apiUrl = `https://api-pr-${num}.preview.whatsfresh.app`;
            const webUrl = `https://pr-${num}.preview.whatsfresh.app`;
            github.rest.issues.createComment({
              issue_number: num,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 **Preview deployed!**\n\n- Web: ${webUrl}\n- API: ${apiUrl}/graphql\n\n_Tear-down on PR close._`
            });
```

### Pipeline 7 — `pr-cleanup.yml`

```yaml
name: PR Cleanup
on:
  pull_request:
    types: [closed]

permissions:
  id-token: write
  contents: read

jobs:
  cleanup:
    runs-on: ubuntu-latest
    environment: preview
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_DEV }}
          aws-region: us-east-1
      - run: pnpm --filter @wfl/infra cdk destroy --all --context env=pr-${{ github.event.number }} --force
      - run: aws s3 rb s3://wfl-web-pr-${{ github.event.number }} --force || true
```

### Pipeline 8 — `deploy-staging.yml`

```yaml
name: Deploy Staging
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read
  deployments: write

concurrency:
  group: deploy-staging
  cancel-in-progress: false  # don't cancel in-flight deploys

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.whatsfresh.app
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_STAGING }}
          aws-region: us-east-1
      - name: Deploy backend
        run: pnpm --filter @wfl/infra cdk deploy --all --context env=staging --require-approval never
      - name: Deploy web
        run: |
          pnpm --filter @wfl/web build
          aws s3 sync apps/web/dist s3://wfl-web-staging --delete --cache-control 'max-age=31536000,public' --exclude '*.html' --exclude '.well-known/*'
          aws s3 sync apps/web/dist s3://wfl-web-staging --cache-control 'max-age=300,public' --exclude '*' --include '*.html'
          aws cloudfront create-invalidation --distribution-id ${{ vars.WEB_CF_DIST_ID_STAGING }} --paths '/*'
      - name: Smoke tests
        run: pnpm test:smoke -- --env=staging
      - name: Notify Sentry of release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: wfl-org
        with:
          environment: staging
          version: ${{ github.sha }}
      - name: Notify deploy
        if: always()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} -H 'Content-Type: application/json' \
            -d '{"text":"Staging deploy: ${{ job.status }} — ${{ github.event.head_commit.message }}"}'
```

### Pipeline 9 — `deploy-production.yml`

```yaml
name: Deploy Production
on:
  push:
    tags: ['v*']
  workflow_dispatch:

permissions:
  id-token: write
  contents: read
  deployments: write

concurrency:
  group: deploy-prod
  cancel-in-progress: false

jobs:
  pre-deploy-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_STAGING }}
          aws-region: us-east-1
      - name: Validate staging health before promoting
        run: pnpm test:smoke -- --env=staging
      - name: Check Sentry for unresolved CRITICAL
        run: |
          UNRESOLVED=$(curl -s -H "Authorization: Bearer ${{ secrets.SENTRY_AUTH_TOKEN }}" \
            "https://sentry.io/api/0/projects/wfl-org/whatsfresh/issues/?query=is:unresolved+level:critical" | jq length)
          if [ "$UNRESOLVED" -gt 0 ]; then
            echo "Critical Sentry issues unresolved; aborting prod deploy."
            exit 1
          fi

  deploy:
    needs: pre-deploy-checks
    runs-on: ubuntu-latest
    environment:
      name: production  # requires manual approval in GitHub UI
      url: https://whatsfresh.app
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_PROD }}
          aws-region: us-east-1
      - name: Deploy backend
        run: pnpm --filter @wfl/infra cdk deploy --all --context env=prod --require-approval never
      - name: Deploy web
        run: |
          pnpm --filter @wfl/web build
          aws s3 sync apps/web/dist s3://wfl-web-prod --delete --cache-control 'max-age=31536000,public' --exclude '*.html' --exclude '.well-known/*'
          aws s3 sync apps/web/dist s3://wfl-web-prod --cache-control 'max-age=300,public' --exclude '*' --include '*.html'
          aws s3 sync apps/web/dist s3://wfl-web-prod --content-type 'application/json' --cache-control 'max-age=3600' --exclude '*' --include '.well-known/*'
          aws cloudfront create-invalidation --distribution-id ${{ vars.WEB_CF_DIST_ID_PROD }} --paths '/*'
      - name: Production smoke tests
        run: pnpm test:smoke -- --env=prod
      - name: Notify Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: wfl-org
        with:
          environment: production
          version: ${{ github.ref_name }}
      - name: Tag PostHog deploy
        run: |
          curl -X POST https://app.posthog.com/api/projects/${{ secrets.POSTHOG_PROJECT_ID }}/annotations \
            -H "Authorization: Bearer ${{ secrets.POSTHOG_API_KEY }}" \
            -d '{"content": "Prod deploy ${{ github.ref_name }}"}'
```

### Pipeline 10 — `mobile-build.yml`

```yaml
name: Mobile Build
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      profile:
        description: 'EAS build profile'
        required: true
        default: 'production'
        type: choice
        options: [production, preview, development]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [ios, android]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - uses: actions/setup-java@v4
        if: matrix.platform == 'android'
        with: { distribution: temurin, java-version: 17 }
      - run: pnpm install --frozen-lockfile
      - run: npx eas-cli login --token ${{ secrets.EXPO_TOKEN }}
      - name: Build
        run: npx eas-cli build --platform ${{ matrix.platform }} --profile ${{ inputs.profile || 'production' }} --non-interactive --no-wait
      - name: Comment build URL on tag
        run: |
          BUILD_URL=$(npx eas-cli build:list --platform ${{ matrix.platform }} --json --limit 1 | jq -r '.[0].artifacts.buildUrl')
          gh release edit ${{ github.ref_name }} --notes-file - <<EOF
          ## Builds
          - ${{ matrix.platform }}: $BUILD_URL
          EOF
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
```

### Pipeline 11 — `mobile-submit.yml`

```yaml
name: Mobile Submit
on:
  workflow_dispatch:
    inputs:
      platform:
        type: choice
        options: [ios, android, both]
        default: both

permissions:
  contents: read

jobs:
  submit:
    runs-on: ubuntu-latest
    environment:
      name: app-store-submit  # requires manual approval
    steps:
      - uses: actions/checkout@v4
      - run: npx eas-cli login --token ${{ secrets.EXPO_TOKEN }}
      - if: inputs.platform != 'android'
        run: npx eas-cli submit --platform ios --latest --non-interactive
      - if: inputs.platform != 'ios'
        run: npx eas-cli submit --platform android --latest --non-interactive
```

### Pipeline 12 — `eas-update-staging.yml` (OTA to staging)

```yaml
name: EAS Update Staging
on:
  push:
    branches: [main]
    paths: ['apps/mobile/**', 'packages/shared/**']

permissions:
  contents: read

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx eas-cli login --token ${{ secrets.EXPO_TOKEN }}
      - run: npx eas-cli update --branch staging --message "auto: ${{ github.event.head_commit.message }}" --non-interactive
```

### Pipeline 13 — `eas-update-production.yml` (OTA hotfix)

```yaml
name: EAS Update Production
on:
  workflow_dispatch:
    inputs:
      message:
        description: 'Update message'
        required: true

permissions:
  contents: read

jobs:
  update:
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4
      - run: npx eas-cli login --token ${{ secrets.EXPO_TOKEN }}
      - run: npx eas-cli update --branch production --message "${{ inputs.message }}" --non-interactive
```

### Pipeline 14 — `nightly.yml`

```yaml
name: Nightly
on:
  schedule:
    - cron: '0 3 * * *'  # 03:00 UTC
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  full-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_STAGING }}
          aws-region: us-east-1
      - name: Run full Maestro suite
        uses: mobile-dev-inc/action-maestro-cloud@v1
        with:
          api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
          flows: apps/mobile/.maestro/flows/

  ai-eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_STAGING }}
          aws-region: us-east-1
      - run: pnpm install --frozen-lockfile
      - run: pnpm ai:eval --suite=full
      - uses: actions/upload-artifact@v4
        with: { name: ai-eval-results, path: ai-eval-output/ }

  perf-benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm bench
      - run: pnpm bench:compare-baseline

  drift-detection:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_PROD }}
          aws-region: us-east-1
      - run: pnpm --filter @wfl/infra cdk diff --context env=prod --strict
```

### Pipeline 15 — `dependency-update.yml`

```yaml
name: Dependency updates (Renovate-style)
on:
  schedule:
    - cron: '0 8 * * 1'  # Mondays 08:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: pnpm }
      - run: pnpm update --recursive --interactive=false --latest-patch
      - run: pnpm test
      - uses: peter-evans/create-pull-request@v6
        with:
          commit-message: 'chore: weekly patch dependency updates'
          title: 'chore: weekly patch dependency updates'
          branch: chore/weekly-deps
          labels: dependencies
```

We use **Dependabot** (GitHub-native) for security updates **plus** this for routine patch updates.

Dependabot config (`.github/dependabot.yml`):

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 10
    labels: [dependencies]
    groups:
      types:
        patterns: ['@types/*']
      aws-cdk:
        patterns: ['aws-cdk*', '@aws-cdk/*']
      expo:
        patterns: ['expo*', '@expo/*']
      tamagui:
        patterns: ['@tamagui/*', 'tamagui']
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: docker
    directory: /
    schedule: { interval: weekly }
```

## OIDC trust setup (one-time per AWS account)

```typescript
// infra/cdk/lib/stacks/security-stack.ts
const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
  this, 'GitHubOIDC',
  `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
);

// Per-environment role with least privilege
const stagingRole = new iam.Role(this, 'GitHubActionsStaging', {
  roleName: 'GitHubActionsStaging',
  assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
    StringEquals: {
      'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    },
    StringLike: {
      'token.actions.githubusercontent.com:sub': [
        'repo:wfl-org/whatsfresh:ref:refs/heads/main',
        'repo:wfl-org/whatsfresh:environment:staging',
      ],
    },
  }),
  inlinePolicies: { /* CDK + S3 + CloudFront permissions, scoped */ },
});
```

**Tighten over time**: at MVP, AdministratorAccess is OK on dev. For prod, narrow to specific resource ARNs.

## Required GitHub secrets

### Repository secrets
- `EXPO_TOKEN` — EAS Build / Submit / Update
- `MAESTRO_CLOUD_API_KEY` — E2E mobile tests
- `CHROMATIC_TOKEN` — Visual regression
- `SNYK_TOKEN` — dependency scan
- `SEMGREP_APP_TOKEN` — SAST
- `SENTRY_AUTH_TOKEN` — release tracking
- `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`
- `CODECOV_TOKEN`
- `GITLEAKS_LICENSE` (or use free version)
- `MOBSF_API_KEY`
- `SLACK_WEBHOOK` (optional)

### Environment secrets (per env: dev, staging, production)
- `AWS_OIDC_ROLE_<ENV>` — ARN of IAM role
- `WEB_CF_DIST_ID_<ENV>` — CloudFront distribution ID for invalidation

### Production-only secrets
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER_ID`
- `APPLE_API_KEY` (base64-encoded .p8 file)
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

## Pipeline performance targets

| Pipeline | Target P95 |
|---|---|
| ci.yml | < 8 min |
| security.yml | < 12 min |
| mobile-pr.yml | < 25 min |
| pr-env.yml | < 15 min |
| deploy-staging.yml | < 20 min |
| deploy-production.yml | < 25 min (incl. smoke tests) |
| nightly.yml | < 60 min |

If any pipeline exceeds target consistently, profile and optimize.

## Pipeline reliability

- Retry on flaky network errors (use `retry-step-action`)
- Concurrency limits prevent runaway costs
- Timeouts on every job (default 30 min, override where needed)
- Failed pipelines auto-create GitHub issue (via Slack webhook → manual triage)

## Artifacts retention

| Artifact | Retention |
|---|---|
| Test coverage | 30 days |
| SBOM | 90 days |
| Build artifacts (debug) | 7 days |
| Build artifacts (release) | 1 year |
| Sentry source maps | 1 year |

## Build determinism

- **Lockfiles committed**: `pnpm-lock.yaml`, `Podfile.lock`, `gradle.lockfile`
- **Versions pinned**: Node, pnpm, Java, Ruby in workflows + `.tool-versions` (mise)
- **No `latest` tags** in Docker / actions
- **Reproducible builds**: same input → same output (verified quarterly)

## Release strategy

- Semantic versioning: `vMAJOR.MINOR.PATCH`
- Conventional commits enforced via commit-lint pre-commit hook
- Release notes auto-generated from conventional commit messages
- GitHub Releases page is the source of truth
- Mobile native version in sync (`apps/mobile/app.json` `version` matches)

## Hotfix flow

```
1. Create hotfix branch from prod tag
2. Apply fix
3. Open PR; CI runs
4. Merge to main + tag v1.2.4
5. mobile-build.yml triggers
6. EAS Update via eas-update-production.yml for JS-only fixes (5 min)
7. Or: full app store submission for native fixes (24-48h Apple)
```

## Pre-commit hooks (local)

`.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

`package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml,yml}": ["prettier --write"]
  }
}
```

`.husky/commit-msg`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm commitlint --edit $1
```

`commitlint.config.js`:

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'always', 'sentence-case'],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

`.husky/pre-push`:

```bash
#!/usr/bin/env sh
gitleaks protect --staged
```

## Mobile pipeline specifics

### EAS profiles (`apps/mobile/eas.json`)

```json
{
  "cli": { "version": ">= 13.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "staging",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "production": {
      "channel": "production",
      "android": { "buildType": "app-bundle" },
      "ios": { "resourceClass": "m-medium" },
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@whatsfresh.app",
        "ascAppId": "AUTOFILLED",
        "appleTeamId": "AUTOFILLED"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  },
  "update": {
    "production": { "channel": "production" },
    "staging": { "channel": "staging" },
    "development": { "channel": "development" }
  }
}
```

### Code signing
- iOS: Apple-managed certificates via EAS
- Android: signed via Google Play App Signing (key managed by Google) + upload key via EAS

### Privacy Manifest (iOS)
File `apps/mobile/ios/PrivacyInfo.xcprivacy` declares all SDK uses:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>C617.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
  </array>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <!-- email, photos, etc. — populated -->
  </array>
</dict>
</plist>
```

## Web pipeline specifics

- Astro static build → S3 → CloudFront
- Cache-Control headers per file type (HTML short, assets immutable)
- CloudFront invalidation on every deploy

## Incident response in CI/CD

- **CI broken on main**: revert, fix-forward via PR; do NOT skip checks
- **Deploy fails mid-rollout**: CDK has rollback semantics; manually `cdk deploy` previous version
- **App Store rejected**: hotfix path; expedited review request if critical
- **Cert expired**: ACM auto-renews; if it ever fails, alarm + manual renewal

## Audit & compliance

- All deploys logged with: who, when, what version, what env, source SHA
- Audit trail via GitHub Actions logs + CloudTrail
- Quarterly access review: who has prod deploy permission

## Cross-references

- Architecture all this deploys → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- Security tooling rationale → [04_SECURITY.md](04_SECURITY.md)
- Worker assignments → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
- Testing strategy → [09_TESTING.md](09_TESTING.md)
