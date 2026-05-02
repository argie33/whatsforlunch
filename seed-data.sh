#!/bin/bash

# Seed real backend with sample data
API="http://localhost:4000/graphql"

# Sign in first
echo "Signing in..."
TOKEN_RESPONSE=$(curl -s -X POST "$API" \
  -H 'Content-Type: application/json' \
  -d '{"query": "mutation { signIn(email: \"demo@whatsforlunch.app\") { token userId } }"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$TOKEN_RESPONSE" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."
echo "User ID: $USER_ID"

# Get household ID
PROFILE=$(curl -s -X POST "$API" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "query { getProfile { defaultHouseholdId } }"}')

HOUSEHOLD=$(echo "$PROFILE" | grep -o '"defaultHouseholdId":"[^"]*"' | cut -d'"' -f4)
echo "Household ID: $HOUSEHOLD"

# Create sample items
echo "Creating sample items..."

createItem() {
  local name=$1
  local type=$2
  local category=$3
  local location=$4
  local daysLeft=$5

  local expiryDate=$(date -d "+$daysLeft days" -u +"%Y-%m-%dT00:00:00Z")

  curl -s -X POST "$API" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"query\": \"mutation { createItem(input: {householdId: \\\"$HOUSEHOLD\\\", foodName: \\\"$name\\\", foodType: \\\"$type\\\", category: $category, storageLocation: $location, expiryAt: \\\"$expiryDate\\\", expirySource: user}) { id foodName } }\"}" | grep -o '"id":"[^"]*"' | head -1
}

createItem "Greek yogurt" "dairy" "dairy" "fridge" 2
createItem "Spinach" "produce" "produce" "fridge" 0
createItem "Chicken breast" "protein" "protein" "freezer" 30
createItem "Sourdough bread" "grain" "grain" "pantry" 5
createItem "Avocados" "produce" "produce" "counter" 1
createItem "Pasta sauce" "sauce" "sauce" "fridge" 7
createItem "Eggs" "protein" "protein" "fridge" 14
createItem "Cheddar cheese" "dairy" "dairy" "fridge" 21
createItem "Salmon fillet" "protein" "protein" "fridge" 1
createItem "Strawberries" "produce" "produce" "fridge" 3

echo "Creating shopping list items..."

# Create shopping list items
curl -s -X POST "$API" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\": \"mutation { addShoppingListItem(input: {householdId: \\\"$HOUSEHOLD\\\", name: \\\"Whole milk\\\", category: \\\"dairy\\\"}) { id name } }\"}" > /dev/null

curl -s -X POST "$API" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\": \"mutation { addShoppingListItem(input: {householdId: \\\"$HOUSEHOLD\\\", name: \\\"Spinach\\\", category: \\\"produce\\\"}) { id name } }\"}" > /dev/null

curl -s -X POST "$API" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\": \"mutation { addShoppingListItem(input: {householdId: \\\"$HOUSEHOLD\\\", name: \\\"Chicken breast\\\", category: \\\"protein\\\"}) { id name } }\"}" > /dev/null

echo "✓ Sample data created!"
echo "Open app.html and sign in with demo@whatsforlunch.app to see real data"
