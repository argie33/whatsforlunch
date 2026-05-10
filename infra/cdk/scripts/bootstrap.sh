#!/bin/bash
set -euo pipefail

# Bootstrap script for AWS CDK
# Usage: ./scripts/bootstrap.sh <account-id> <region> <profile>

ACCOUNT_ID=${1:-$(aws sts get-caller-identity --query 'Account' --output text)}
REGION=${2:-us-east-1}
PROFILE=${3:-wfl-dev}

echo "🚀 Bootstrapping CDK for account $ACCOUNT_ID in region $REGION (profile: $PROFILE)"

export AWS_PROFILE=$PROFILE
export AWS_REGION=$REGION

# Bootstrap each environment
for ENV in dev staging prod; do
  echo ""
  echo "📦 Bootstrapping $ENV environment..."
  npx cdk bootstrap aws://$ACCOUNT_ID/$REGION --context env=$ENV --force
done

echo ""
echo "✅ CDK bootstrap complete!"
echo "You can now deploy infrastructure with:"
echo "  pnpm cdk:deploy --all --context env=dev"
