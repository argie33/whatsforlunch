#!/bin/bash
# Setup local DynamoDB for WhatsForLunch testing
# Run this after starting DynamoDB Local

set -e

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-west-2

echo "Setting up local DynamoDB..."
echo "Ensuring DynamoDB Local is running on http://localhost:8000"

TABLE_NAME="WFL-Main-dev"
ENDPOINT="http://localhost:8000"

# Check if table already exists
if aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --endpoint-url $ENDPOINT \
  2>/dev/null; then
  echo "✓ Table $TABLE_NAME already exists"
else
  echo "Creating table $TABLE_NAME..."

  aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
      AttributeName=GSI1PK,AttributeType=S \
      AttributeName=GSI1SK,AttributeType=S \
      AttributeName=GSI2PK,AttributeType=S \
      AttributeName=GSI2SK,AttributeType=S \
      AttributeName=GSI3PK,AttributeType=S \
      AttributeName=GSI3SK,AttributeType=S \
      AttributeName=GSI4PK,AttributeType=S \
      AttributeName=GSI4SK,AttributeType=S \
    --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
    --global-secondary-indexes \
      '[
        {
          "IndexName": "GSI1",
          "KeySchema": [
            {"AttributeName": "GSI1PK", "KeyType": "HASH"},
            {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
          ],
          "Projection": {"ProjectionType": "ALL"},
          "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
          "IndexName": "GSI2",
          "KeySchema": [
            {"AttributeName": "GSI2PK", "KeyType": "HASH"},
            {"AttributeName": "GSI2SK", "KeyType": "RANGE"}
          ],
          "Projection": {"ProjectionType": "ALL"},
          "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
          "IndexName": "GSI3",
          "KeySchema": [
            {"AttributeName": "GSI3PK", "KeyType": "HASH"},
            {"AttributeName": "GSI3SK", "KeyType": "RANGE"}
          ],
          "Projection": {"ProjectionType": "ALL"},
          "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
          "IndexName": "GSI4",
          "KeySchema": [
            {"AttributeName": "GSI4PK", "KeyType": "HASH"},
            {"AttributeName": "GSI4SK", "KeyType": "RANGE"}
          ],
          "Projection": {"ProjectionType": "ALL"},
          "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }
      ]' \
    --billing-mode PROVISIONED \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT

  echo "✓ Table created successfully"
fi

echo ""
echo "DynamoDB Local setup complete!"
echo "Table name: $TABLE_NAME"
echo "Endpoint: $ENDPOINT"
echo ""
echo "To view the database, install and run:"
echo "  npm install -g dynamodb-admin"
echo "  export DYNAMODB_ENDPOINT=http://localhost:8000"
echo "  dynamodb-admin"
