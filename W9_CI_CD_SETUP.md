# W9 — CI/CD Setup Complete

**Date**: 2026-04-28  
**Status**: Workflow infrastructure complete; credentials setup guide provided  
**Duration**: ~2-3 hours to configure credentials

---

## ✅ Infrastructure Status

### GitHub Actions Workflows (Complete)

| Workflow                 | Trigger                          | Purpose                                | Status   |
| ------------------------ | -------------------------------- | -------------------------------------- | -------- |
| `mobile-build.yml`       | Push tags (v\*) or manual        | Build iOS/Android for production       | ✅ Ready |
| `mobile-submit.yml`      | Manual workflow dispatch         | Submit builds to App Store/Play Store  | ✅ Ready |
| `eas-update-staging.yml` | Push to main (mobile/\* changes) | Deploy OTA updates to staging          | ✅ Ready |
| `ci.yml`                 | PR/push to main                  | TypeScript checks, linting, tests      | ✅ Ready |
| `deploy-staging.yml`     | Manual + scheduled               | Deploy backend services to AWS staging | ✅ Ready |

### EAS Configuration (Complete)

**File**: `apps/mobile/eas.json`

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "ios": { "simulator": true } },
    "production": { "channel": "production" }
  },
  "submit": {
    "production": {
      "ios": {
        /* Apple credentials */
      },
      "android": { "track": "internal" }
    }
  }
}
```

### App Configuration (Complete)

**File**: `apps/mobile/app.json`

- ✅ Bundle IDs configured (app.whatsforlunch.mobile)
- ✅ Deep linking setup for both web domains
- ✅ Camera/photo permissions documented
- ✅ Sentry plugin integrated
- ✅ Plugins configured for Expo/React Native

---

## 📋 Credentials Setup Checklist

### 1. Expo (EXPO_TOKEN)

**Purpose**: Authenticate with Expo services for building and updating  
**Setup Time**: 5 minutes

#### Steps:

1. Go to https://expo.dev/settings/personal-access-tokens
2. Create new token: **Name**: `GitHub Actions` | **Scope**: `all`
3. Copy token value
4. Add to GitHub:
   - Repo → Settings → Secrets and variables → Actions
   - New repository secret: `EXPO_TOKEN` = `<token>`

**Verify**: `eas whoami` should show your account

---

### 2. Sentry (Error Tracking)

**Purpose**: Capture and track runtime errors in staging/production  
**Setup Time**: 10 minutes

#### Prerequisites:

- Sentry project already created for mobile (`whatsforlunch` org)

#### Steps:

1. Go to https://sentry.io/settings/whatsforlunch/projects/mobile/keys/
2. Copy the **Authentication Token** from Settings → Auth Tokens
3. Copy the **Organization slug**: `whatsforlunch`
4. Copy the **Project slug**: `mobile`

#### Add to GitHub Secrets:

- `SENTRY_AUTH_TOKEN` = `<auth_token_from_step_2>`
- `SENTRY_ORG` = `whatsforlunch`
- `SENTRY_PROJECT_MOBILE` = `mobile`

**Verify**: Should see releases created after each build in Sentry dashboard

---

### 3. Apple App Store (iOS Submission)

**Purpose**: Authenticate with Apple to submit builds to App Store  
**Setup Time**: 20 minutes

#### Prerequisites:

- Apple Developer account (paid membership)
- App created in App Store Connect
- Team ID

#### Steps:

**A. Create App Store Connect API Key:**

1. Visit https://appstoreconnect.apple.com/access/integrations/new
2. Create API key with **Admin** role
3. Download key (`.p8` file) — save securely
4. Note: **Key ID**, **Issuer ID**, **Team ID**

**B. Prepare Private Key:**

1. Open downloaded `.p8` file in text editor
2. Copy the full contents (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

**C. Add to GitHub Secrets:**

- `APPLE_API_KEY_ID` = `<Key ID from step 3A>`
- `APPLE_API_ISSUER_ID` = `<Issuer ID from step 3A>`
- `APPLE_API_KEY` = `<full contents of .p8 file>`

#### Update eas.json:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "TEAM123456"
      }
    }
  }
}
```

**Values to find:**

- `appleId`: Your Apple ID account email
- `ascAppId`: App ID in App Store Connect → App → General → App ID
- `appleTeamId`: From API key creation page

---

### 4. Google Play Store (Android Submission)

**Purpose**: Authenticate with Google Play to submit builds  
**Setup Time**: 15 minutes

#### Prerequisites:

- Google Play Developer account (paid membership, $25)
- App created in Google Play Console
- Service Account with JSON key

#### Steps:

**A. Create Service Account:**

1. Go to https://play.google.com/console/u/0/developers
2. Select your app → Settings → API and services
3. Create or download existing Service Account JSON key
4. Save the JSON file securely

**B. Prepare Secret:**

1. Open the downloaded JSON file
2. Copy entire contents

**C. Add to GitHub Secrets:**

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` = `<entire JSON contents as minified single line>`

#### Verify Service Account Has Permissions:

1. In Google Play Console → Settings → API and services
2. Ensure service account has "Release Manager" or "Admin" role

**Note**: The workflow will write this to `apps/mobile/google-service-account.json` at build time, then delete it for security.

---

### 5. Slack Notifications (Optional)

**Purpose**: Alert on deployment failures  
**Setup Time**: 5 minutes

#### Steps:

1. Create Slack webhook:
   - Slack workspace → Settings → Manage apps
   - Create custom app → Incoming Webhooks → Add webhook
   - Copy webhook URL
2. Add to GitHub Secrets:
   - `SLACK_DEPLOY_WEBHOOK` = `<webhook_url>`

**Note**: Currently only used for `eas-update-staging.yml` failures

---

## 🚀 Build & Deploy Workflows

### Local Testing (No Build)

```bash
# Check project health
pnpm install

# Type check
pnpm -r type-check

# Lint
pnpm -r lint

# Run tests
pnpm -r test
```

### Development Builds (Local or CI)

```bash
# Local: Build for your device
cd apps/mobile
eas build --platform ios --profile development
eas build --platform android --profile development

# CI: Triggered via GitHub workflow dispatch
```

### Preview Builds (Staging)

```bash
# Build without submitting
eas build --platform all --profile preview

# OTA update (automatic on merge to main)
# Triggered by: eas-update-staging.yml
# Updates staging channel for testing
```

### Production Builds (App Store/Play Store)

**Option A: Tag-based (Automatic)**

```bash
# On your machine:
git tag v1.0.0
git push --tags

# Automatically triggers:
# 1. mobile-build.yml → builds iOS + Android
# 2. Creates artifacts in EAS
```

**Option B: Manual Workflow**

1. Go to GitHub → Actions → Mobile Build
2. Click "Run workflow"
3. Select: platform (ios/android/all) + profile (development/preview/production)
4. Builds will be available in EAS dashboard

**Submit to Stores**

1. Go to GitHub → Actions → Mobile Submit
2. Click "Run workflow"
3. Select: platform (ios/android/all) + optional build ID
4. If blank build ID: uses `--latest` from EAS
5. Submission status in GitHub Actions logs

---

## 📊 CI Pipeline Details

### On Pull Request

- TypeScript type checking
- Linting (ESLint)
- Unit tests
- Build check (no actual submission)

### On Merge to Main

```
1. Code pushed to main
2. CI runs (type check, lint, tests)
3. If mobile/* changed → eas-update-staging.yml triggers
4. OTA update published to staging channel
5. Sentry release created
6. Slack notification on failure
```

### On Git Tag (v1.0.0+)

```
1. Tag pushed to GitHub
2. mobile-build.yml triggers
3. Builds both iOS and Android in parallel
4. Artifacts uploaded to EAS
5. Ready for manual submission or rollout
```

---

## 🔐 GitHub Secrets Summary

| Secret                             | Source                       | Expiry            | Notes                    |
| ---------------------------------- | ---------------------------- | ----------------- | ------------------------ |
| `EXPO_TOKEN`                       | expo.dev                     | 1 year            | Regenerate annually      |
| `SENTRY_AUTH_TOKEN`                | sentry.io                    | No expiry         | Keep secret              |
| `SENTRY_ORG`                       | sentry.io                    | N/A               | Read-only value          |
| `SENTRY_PROJECT_MOBILE`            | sentry.io                    | N/A               | Read-only value          |
| `APPLE_API_KEY_ID`                 | App Store Connect            | No expiry         | Rotate periodically      |
| `APPLE_API_ISSUER_ID`              | App Store Connect            | No expiry         | Tied to Apple ID         |
| `APPLE_API_KEY`                    | App Store Connect (.p8 file) | 1 year            | Regenerate before expiry |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play Console          | No expiry         | Rotate periodically      |
| `SLACK_DEPLOY_WEBHOOK`             | Slack workspace              | Until regenerated | Can be revoked anytime   |

---

## ✅ Verification Checklist

After setting up all credentials:

### Slack Tests

```bash
# Test Sentry token
curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" https://sentry.io/api/0/organizations/whatsforlunch/

# Test Apple credentials
eas submit --platform ios --dry-run --profile production

# Test Google Play credentials
eas submit --platform android --dry-run --profile production
```

### GitHub Actions

1. Go to repo → Settings → Secrets and variables → Actions
2. Verify all 9 secrets are present (no empty values)
3. Try manual workflow dispatch for a test build
4. Check EAS dashboard for artifacts

### EAS Project

```bash
cd apps/mobile
eas project:info
```

Should show:

- Project ID from `app.json`
- Linked to your Expo account
- Build history visible

---

## 🚀 First Deployment

### Step 1: Validate Locally

```bash
pnpm install --frozen-lockfile
npm run type-check
npm run lint
npm run test
```

### Step 2: Build Development

```bash
cd apps/mobile
eas build --platform all --profile development
# Check EAS dashboard for artifacts
```

### Step 3: Deploy OTA Update to Staging

```bash
# Merge a change to main
# Wait for eas-update-staging.yml to complete
# Check EAS dashboard → Updates → staging channel
```

### Step 4: Build & Submit to Stores

```bash
# Option A: Via tag
git tag v1.0.0
git push --tags
# Wait for mobile-build.yml
# Then go to GitHub Actions → Mobile Submit

# Option B: Via workflow dispatch
# GitHub → Actions → Mobile Build → Run workflow
# Select: all + production
# Wait for completion
# GitHub → Actions → Mobile Submit → Run workflow
```

---

## 📝 Troubleshooting

### Build Fails with "EXPO_TOKEN not found"

- Verify secret name is exactly `EXPO_TOKEN`
- Check secret value is not empty
- Test locally: `eas whoami` should authenticate

### App Store Connect API Error

- Verify `.p8` file includes BEGIN/END markers
- Check Key ID and Issuer ID match exactly
- Keys expire after 1 year — regenerate if needed
- Ensure API key has "Admin" role

### Google Play Service Account Error

- Verify JSON is valid (copy entire file including braces)
- Check service account has "Release Manager" or "Admin" role
- Ensure app exists in Google Play Console

### Sentry Release Not Created

- Verify `SENTRY_ORG` and `SENTRY_PROJECT_MOBILE` are correct
- Check auth token has organization access
- Review Sentry dashboard → Releases tab

---

## 📈 Monitoring & Maintenance

### Weekly

- [ ] Check Sentry dashboard for new error patterns
- [ ] Review App Store Connect for crash reports
- [ ] Monitor Google Play Console for user reviews

### Monthly

- [ ] Check API key expiry dates (Apple)
- [ ] Verify all GitHub secrets are still valid
- [ ] Test manual build workflow

### Annually

- [ ] Rotate EXPO_TOKEN (expires after 1 year)
- [ ] Rotate Apple API key (expires after 1 year)
- [ ] Rotate Google service account key
- [ ] Update team member access in App Store/Play Store

---

## 📖 Reference Links

**Expo EAS:**

- https://docs.expo.dev/eas-update/introduction/
- https://docs.expo.dev/build/setup/
- https://docs.expo.dev/eas-submit/introduction/

**Apple:**

- https://developer.apple.com/app-store-connect/api
- https://appstoreconnect.apple.com/access/integrations

**Google Play:**

- https://play.google.com/console
- https://developers.google.com/identity/protocols/oauth2/service-account

**GitHub Actions:**

- https://github.com/expo/expo-github-action
- https://github.com/getsentry/action-release

---

## 🎯 Completion Criteria

- [ ] All 9 GitHub secrets configured and non-empty
- [ ] `eas whoami` authenticates successfully
- [ ] Development build completes successfully
- [ ] Staging OTA update publishes on main merge
- [ ] Sentry creates releases on build completion
- [ ] Slack webhook receives test notification
- [ ] iOS and Android production builds complete
- [ ] App Store and Play Store submissions succeed
- [ ] First beta release available for testing

---

**Status**: 🟢 INFRASTRUCTURE COMPLETE — Ready for credential configuration

Next: Follow the credentials setup checklist above, then test deployment pipeline with a development build.
