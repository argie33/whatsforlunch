# Local Quickstart — No AWS Required

Run the full app stack on your machine in under 5 minutes.

## Prerequisites

- **Docker Desktop** running
- **Node.js 20+** and **pnpm 9+** installed
- **Expo Go** app on your phone (or iOS/Android simulator)

---

## Step 1 — Install dependencies

```bash
pnpm install
```

---

## Step 2 — Set up local environment

```bash
cp apps/mobile/.env.local.example apps/mobile/.env.local
```

Edit `apps/mobile/.env.local` if needed:
- **iOS Simulator**: leave `EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql` (default)
- **Android Emulator**: change to `http://10.0.2.2:4000/graphql`
- **Physical phone (same WiFi)**: change to `http://192.168.x.x:4000/graphql` (your machine's LAN IP)

---

## Step 3 — Start local services

```bash
pnpm local:setup
```

This starts (in Docker):
- **DynamoDB Local** → `localhost:8000`
- **Mock GraphQL API** → `localhost:4000/graphql` (replaces AppSync + Cognito)
- **DynamoDB Admin UI** → `http://localhost:8001` (visual table browser)

---

## Step 4 — Seed sample data (optional)

```bash
pnpm local:seed
```

Adds 10 sample food items, a "Dev Kitchen" household, and a `dev@example.com` user.

---

## Step 5 — Start the mobile app

```bash
pnpm --filter @wfl/mobile dev
```

Then:
- **iOS Simulator**: press `i`
- **Android Emulator**: press `a`
- **Physical device**: scan the QR code with Expo Go

---

## Step 6 — Sign in locally

In the app, sign in with any email address (e.g. `you@example.com`).
No email is sent — the mock server creates the account instantly and returns a JWT.

You'll see in the mock API logs:
```
[local-mock] Created new user: you@example.com (id: abc-123)
```

---

## One-liner (all at once)

```bash
pnpm local:dev
```

Starts Docker services + runs table migration + starts Expo dev server.

---

## Watch API logs

```bash
pnpm local:mock-logs
```

---

## Reset everything (start fresh)

```bash
pnpm local:reset
```

Destroys Docker volumes (wipes all local data), recreates services, re-runs migrations and seed data.

---

## Explore your local data

Open `http://localhost:8001` in your browser → DynamoDB Admin UI.
Browse all tables, query items, see the raw records your app is creating.

---

## Explore the API in GraphiQL

Open `http://localhost:4000/graphql` in your browser.

To make authenticated requests, first get a token:
```graphql
mutation {
  signIn(email: "you@example.com") {
    token
    userId
  }
}
```

Then add the header in GraphiQL: `Authorization: Bearer <token>`

---

## What the mock API supports

| Feature | Status |
|---|---|
| Sign in (any email → JWT) | ✅ |
| Get / update profile | ✅ |
| List / create / update / delete items | ✅ |
| Mark eaten / tossed / frozen / partial | ✅ |
| List households | ✅ |
| Create household | ✅ |
| AI classification (returns random mock food) | ✅ |
| Delta sync | ✅ |
| Containers | 🔜 Phase B |
| Real-time subscriptions | 🔜 Phase B |
| Barcode lookup | 🔜 Phase B |
| Notifications | 🔜 (device only, no server) |

---

## When you're ready for AWS

See `docs/14_LOCAL_DEV.md` for deploying to a personal AWS dev stack.
Change `EXPO_PUBLIC_AUTH_MODE=cognito` and fill in the real Cognito + AppSync values from CDK outputs.
