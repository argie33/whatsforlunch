# WhatsFresh Deployment Guide

## Current Status

✅ **Build**: Complete and tested
✅ **Tests**: 260+ tests passing
✅ **Code**: Merged to main and pushed to GitHub
⏳ **AWS**: Requires credential setup
⏳ **Store**: Ready for submission

## Prerequisites

### AWS Account Setup

```bash
# Install AWS CLI
brew install awscli  # macOS
# or download from https://aws.amazon.com/cli/

# Configure credentials
aws configure
# Enter: Access Key ID
# Enter: Secret Access Key
# Enter: Default region (us-east-1)
# Enter: Default format (json)
```

### Development Tools

```bash
# Node.js 18+ (already installed)
node --version

# TypeScript (already installed)
npx tsc --version

# AWS CDK CLI (install globally)
npm install -g aws-cdk

# EAS CLI (for mobile builds)
npm install -g eas-cli
```

## Deployment Phases

### Phase 1: AWS Infrastructure (30 minutes)

```bash
# Bootstrap CDK (one-time setup)
cd infra/cdk
cdk bootstrap

# Synthesize stacks
npm run cdk:synth

# Review changes
npm run cdk:synth --all

# Deploy to dev environment
npm run cdk:deploy -- --require-approval=never

# Verify deployment
npm run cdk:outputs
```

**What gets deployed:**

- ✅ DynamoDB tables (Items, Households, Shopping Lists, etc.)
- ✅ Lambda functions (Auth, Items, Containers, etc.)
- ✅ AppSync GraphQL API
- ✅ Cognito User Pool
- ✅ S3 buckets (Images, Exports)
- ✅ CloudWatch monitoring & logs
- ✅ SNS topics (Notifications)

### Phase 2: Mobile App Build (45 minutes)

#### Local Build (Development)

```bash
cd apps/mobile

# iOS simulator
npm run ios

# Android emulator
npm run android
```

#### Production Build (App Store)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

#### APK/IPA Download

```bash
# Check build status
eas build:list

# Download artifacts
eas build:download --id <build-id>
```

### Phase 3: App Store Submission (1-2 weeks)

#### Apple App Store

```bash
# Prerequisites:
# 1. Apple Developer account ($99/year)
# 2. Create bundle identifier: app.whatsfresh.mobile
# 3. Configure signing certificate in Xcode

# Submit via Expo
eas submit --platform ios --profile production --latest

# Or manual submission
# - Build production IPA
# - Use Xcode to create Archive
# - Use Application Loader / Transporter
```

#### Google Play Store

```bash
# Prerequisites:
# 1. Google Play Developer account ($25 one-time)
# 2. Create app in Play Console
# 3. Upload signing key

# Submit via Expo
eas submit --platform android --profile production --latest

# Or manual submission
# - Build production APK/AAB
# - Upload to Play Console
# - Fill app details and pricing
```

## Environment Configuration

### Development (.env.local)

```bash
EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql
EXPO_PUBLIC_AUTH_MODE=local
EXPO_PUBLIC_S3_ENDPOINT=http://localhost:4566
```

### Staging (.env.staging)

```bash
EXPO_PUBLIC_APPSYNC_URL=https://staging-api.whatsfresh.app/graphql
EXPO_PUBLIC_AUTH_MODE=cognito
EXPO_PUBLIC_AWS_REGION=us-east-1
```

### Production (.env.production)

```bash
EXPO_PUBLIC_APPSYNC_URL=https://api.whatsfresh.app/graphql
EXPO_PUBLIC_AUTH_MODE=cognito
EXPO_PUBLIC_AWS_REGION=us-east-1
```

## Monitoring & Logging

### CloudWatch

```bash
# View Lambda logs
aws logs tail /aws/lambda/WFL-Auth-dev --follow

# View AppSync logs
aws logs tail /aws/appsync/WFL-Api-dev --follow

# View API Gateway logs
aws logs tail /aws/apigateway/WFL-dev --follow
```

### Application Monitoring

```bash
# Check API health
curl https://api.whatsfresh.app/health

# Check GraphQL schema
curl https://api.whatsfresh.app/graphql
```

## Database Management

### Create Tables

```bash
npm run local:migrate
```

### Seed Data

```bash
npm run local:seed
```

### Export Data

```bash
# Export all DynamoDB tables
aws dynamodb export-table-to-point-in-time \
  --table-name Items-wfl-main \
  --s3-bucket backup-bucket \
  --s3-prefix items-export
```

## Troubleshooting

### CDK Deploy Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Re-bootstrap CDK
cdk bootstrap --force

# Check for required IAM permissions
# Role must have: dynamodb:*, lambda:*, apigateway:*, cognito:*, s3:*
```

### Mobile Build Fails

```bash
# Clear cache
cd apps/mobile
rm -rf node_modules
npm install

# Clear Expo cache
expo doctor

# Rebuild
npm run ios  # or android
```

### API Connection Issues

```bash
# Check API endpoint
curl https://api.whatsfresh.app/graphql

# Check CORS headers
curl -i https://api.whatsfresh.app/graphql

# Test authentication
curl -H "Authorization: Bearer TOKEN" \
  https://api.whatsfresh.app/graphql
```

## Rollback Procedure

### AWS Rollback

```bash
# View previous stack version
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE

# Rollback last change
aws cloudformation cancel-update-stack --stack-name WFL-Api-dev
```

### Mobile Rollback

```bash
# Download previous build
eas build:list
eas build:download --id <previous-build-id>

# Or submit previous version to stores
eas submit --id <previous-build-id>
```

## Performance Benchmarks

### API Latency

- Auth (signIn): < 200ms
- Item CRUD: < 150ms
- GraphQL query: < 300ms
- Image upload: < 2s

### Mobile App

- Cold start: < 3s
- List load: < 500ms
- Image display: < 800ms
- Search: < 1s

### Database

- Item scan: 10k items in < 1s
- Sync operation: < 2s
- Offline queue: 1k items in < 500ms

## Security Checklist

- [ ] AWS credentials rotated
- [ ] SSL/TLS enabled (HTTPS everywhere)
- [ ] WAF rules configured
- [ ] API rate limiting enabled
- [ ] CORS properly restricted
- [ ] Environment variables not in git
- [ ] Secrets in AWS Secrets Manager
- [ ] Cognito MFA enabled
- [ ] Data encryption at rest
- [ ] Data encryption in transit
- [ ] Regular security audits scheduled
- [ ] Incident response plan documented

## Cost Estimation (Monthly)

| Service    | Usage        | Cost           |
| ---------- | ------------ | -------------- |
| DynamoDB   | 10GB, 1M ops | $15            |
| Lambda     | 10M invokes  | $20            |
| AppSync    | 10M queries  | $30            |
| S3         | 50GB, 1M ops | $25            |
| CloudFront | 100GB        | $20            |
| Cognito    | 50k MAU      | $50            |
| **Total**  |              | **$160/month** |

## Support & Escalation

### Common Issues

1. **Login fails** → Check Cognito configuration
2. **API timeout** → Check Lambda concurrency
3. **Data not syncing** → Check DynamoDB capacity
4. **App crashes** → Check CloudWatch logs

### Contact

- AWS Support: https://console.aws.amazon.com/support
- Expo Support: https://expo.canny.io
- GitHub Issues: https://github.com/argie33/whatsforlunch/issues

## Next Steps

1. **Today**: Configure AWS credentials and deploy infrastructure
2. **Tomorrow**: Build and test mobile app on device
3. **This week**: Submit to App Store and Google Play
4. **Next week**: Monitor deployment and gather feedback
5. **Next month**: Launch public beta or production release

## Estimated Timeline

- Infrastructure setup: 30 minutes
- Mobile build: 1 hour
- Store submission: 2 hours
- App Store review: 1-3 days
- Google Play review: 1-2 hours
- **Total**: 1-2 weeks to production
