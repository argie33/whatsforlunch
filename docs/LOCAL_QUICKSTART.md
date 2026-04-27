# Local Quickstart — No AWS Required

Run the full app stack on your machine in under 5 minutes.

## Prerequisites

- **Docker Desktop** running
- **Node.js 20+** and **pnpm 9+**
- **Expo Go** on your phone, or an iOS/Android simulator

---

## One-liner (everything at once)

```bash
pnpm install
cp apps/mobile/.env.local.example apps/mobile/.env.local
pnpm local:dev
```

`pnpm local:dev` starts Docker services, runs DB migration, then starts the API server and Expo dev server concurrently.

Press `i` (iOS sim) or `a` (Android emu) in the Expo terminal.

---

## Step-by-step

### 1 — Install dependencies

```bash
pnpm install
```

### 2 — Set up local environment

```bash
cp apps/mobile/.env.local.example apps/mobile/.env.local
```

Adjust `EXPO_PUBLIC_APPSYNC_URL` in `.env.local` if needed:
- **iOS Simulator**: `http://localhost:4000/graphql` (default)
- **Android Emulator**: `http://10.0.2.2:4000/graphql`
- **Physical phone (same WiFi)**: `http://<your-LAN-IP>:4000/graphql`

### 3 — Start infrastructure (Docker)

```bash
pnpm local:setup
```

Starts in Docker:
- **DynamoDB Local** → `localhost:8000`
- **DynamoDB Admin UI** → `http://localhost:8001`

### 4 — Start the local API server

```bash
pnpm local:api
```

Starts a local GraphQL server at `http://localhost:4000/graphql`.
This replaces AppSync + Cognito for local dev — no AWS needed.

### 5 — Start the mobile app (separate terminal)

```bash
pnpm dev:mobile
```

---

## Sign in locally

Open the app → type any email → press **Sign In**.

No email is sent. The local API creates the user instantly and returns a JWT.

---

## Validate the stack works

```bash
# Run comprehensive integration tests
# This validates DynamoDB + GraphQL API work end-to-end
./run-local-tests.sh    # macOS/Linux
# or
run-local-tests.bat     # Windows

# Expected output: ✅ All 23 tests pass
# Tests cover: auth, profiles, households, items, AI, persistence, error handling
```

## Seed sample data

```bash
pnpm local:seed
```

Adds a "Dev Kitchen" household and 10 sample food items.

---

## Useful commands

| Command | What it does |
|---|---|
| `pnpm local:setup` | Start Docker + create DB tables |
| `pnpm local:api` | Start GraphQL API server (port 4000) |
| `pnpm dev:mobile` | Start Expo dev server |
| `pnpm local:seed` | Seed 10 sample food items |
| `pnpm local:reset` | Wipe everything and start fresh |
| `pnpm local:down` | Stop Docker services |

---

## Explore your data

Open `http://localhost:8001` → DynamoDB Admin UI.

---

## Explore the API (GraphiQL)

Open `http://localhost:4000/graphql` in your browser.

Sign in first to get a token:
```graphql
mutation {
  signIn(email: "you@example.com") {
    token
    userId
  }
}
```

Then add header: `Authorization: Bearer <token>`

---

## What the local API supports

| Feature | Status |
|---|---|
| Sign in (any email → JWT) | ✅ |
| View / create / update items | ✅ |
| Mark eaten / tossed / frozen | ✅ |
| AI mock (returns random food) | ✅ |
| Delta sync | ✅ |
| Profile + households | ✅ |
| Containers | Phase B |
| Real-time subscriptions | Phase B |

---

## When you're ready for AWS

Set `EXPO_PUBLIC_AUTH_MODE=cognito` and fill in real Cognito + AppSync values from CDK outputs.
See `docs/14_LOCAL_DEV.md` for the full AWS setup guide.
