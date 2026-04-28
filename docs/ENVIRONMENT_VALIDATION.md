# Environment Validation — Check Your Setup

Comprehensive guide to validating your development environment is correctly configured.

---

## Quick Check (30 seconds)

```bash
pnpm validate:setup
```

This checks:

- ✅ Node.js, pnpm, Docker installed
- ✅ All packages installed
- ✅ Docker services running
- ✅ Services responding on correct ports
- ✅ Database tables exist
- ✅ Tools configured

**Expected output**: ✅ All checks pass

---

## What Gets Validated

### System Prerequisites

- Node.js v20+
- pnpm v9+
- Docker installed
- Docker daemon running

### Project Dependencies

- node_modules directory exists
- All packages installed via pnpm

### Docker Services (Running)

- DynamoDB Local (port 8000)
- DynamoDB Admin UI (port 8001)
- GraphQL API (port 4000)

### Service Connectivity

- DynamoDB responds to requests
- DynamoDB Admin UI accessible
- GraphQL API accessible

### Database Configuration

- wfl-main-dev table exists
- All GSIs created

### Tools & Features

- GraphQL code generation available
- Pre-commit hooks installed

---

## If Validation Fails

### ❌ "Node.js v20+ not found"

```bash
# Check version
node --version

# If < v20, upgrade
brew install node  # macOS
# or download from https://nodejs.org
```

### ❌ "pnpm not found"

```bash
npm install -g pnpm@9
```

### ❌ "Docker not found"

```bash
# Install Docker Desktop
# https://www.docker.com/products/docker-desktop
```

### ❌ "Docker daemon not running"

```bash
# Start Docker Desktop (GUI on macOS/Windows)
# or
docker ps  # Check if running
```

### ❌ "Services not running"

```bash
# Start services
pnpm local:setup

# Wait 10 seconds, then validate again
sleep 10
pnpm validate:setup
```

### ❌ "DynamoDB table doesn't exist"

```bash
# Create tables
pnpm local:migrate

# Verify
pnpm validate:setup
```

### ❌ "GraphQL API not responding"

```bash
# Check logs
docker compose logs mock-api

# Restart
docker compose restart mock-api

# Wait and validate
sleep 5
pnpm validate:setup
```

---

## Manual Checks (If validate:setup doesn't work)

### Check Prerequisites

```bash
node --version      # Should be v20+
pnpm --version      # Should be v9+
docker --version    # Should show Docker version
docker ps           # Should show running containers
```

### Check Services

```bash
# See all services
docker compose ps

# Expected:
# dynamodb      Up (healthy)
# dynamodb-admin  Up
# mock-api      Up (healthy)
```

### Check Connectivity

```bash
# DynamoDB
curl http://localhost:8000/

# DynamoDB Admin
curl http://localhost:8001/

# GraphQL API
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

### Check Database

```bash
# List tables
aws dynamodb list-tables \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Should show: wfl-main-dev
```

---

## Full Environment Reset

If something is misconfigured, do a clean reset:

```bash
# Stop everything
pnpm local:down

# Delete Docker volumes (clears database)
docker volume rm whatsforlunch_dynamodb-data

# Start fresh
pnpm local:reset

# Wait 10 seconds
sleep 10

# Validate
pnpm validate:setup
```

---

## Browser Checks (After validation passes)

### DynamoDB Admin UI

```
http://localhost:8001
```

Should show:

- ✅ Regions listed
- ✅ wfl-main-dev table visible
- ✅ Can browse items

### GraphQL API

```
http://localhost:4000/graphql
```

Should show:

- ✅ GraphQL IDE loads
- ✅ Can see schema
- ✅ Can write queries

### Health Check

```bash
curl http://localhost:4000/health
```

Should return:

```json
{ "status": "ok" }
```

---

## Logs & Debugging

### View All Logs

```bash
docker compose logs -f
```

### View Specific Service Logs

```bash
docker compose logs -f dynamodb
docker compose logs -f mock-api
docker compose logs -f dynamodb-admin
```

### Follow Real-Time Logs

```bash
# GraphQL API
pnpm local:api-logs

# Or manually
docker compose logs -f mock-api
```

---

## Performance Check

Services should start in:

- **DynamoDB**: 2-3 seconds
- **GraphQL API**: 3-5 seconds
- **DynamoDB Admin**: 1-2 seconds

Total startup time: ~10 seconds

If taking longer:

```bash
# Restart
docker compose down
docker compose up -d

# Monitor
docker compose logs -f
```

---

## Common Issues & Solutions

| Issue                      | Cause                    | Fix                                     |
| -------------------------- | ------------------------ | --------------------------------------- |
| Port 8000 in use           | Another service using it | `lsof -i :8000` (find), kill process    |
| Port 4000 in use           | Another app using it     | `lsof -i :4000`, kill process           |
| "Cannot connect to Docker" | Docker not running       | Start Docker Desktop                    |
| "Permission denied"        | Docker permissions       | `sudo usermod -aG docker $USER` (Linux) |
| Services stuck             | Corrupt state            | `pnpm local:reset`                      |
| Database empty             | Tables not created       | `pnpm local:migrate`                    |
| No test data               | Didn't seed              | `pnpm local:seed`                       |

---

## Automation (What validate:setup Does)

The `pnpm validate:setup` script:

1. **Checks prerequisites** (Node, pnpm, Docker)
2. **Verifies Docker daemon** is running
3. **Checks dependencies** are installed
4. **Verifies services** are running
5. **Tests connectivity** to all services
6. **Checks database** is configured
7. **Verifies tools** are available

All in ~30 seconds. Reports any issues with fixes.

---

## Post-Validation Next Steps

Once all checks pass ✅:

```bash
# 1. Start developing
pnpm dev:mobile
# or
cd apps/web && pnpm dev

# 2. Run tests
pnpm test
pnpm local:test

# 3. Check database
open http://localhost:8001

# 4. Query API
open http://localhost:4000/graphql

# 5. Start building!
```

---

## Continuous Validation

Run validation before:

- **Each morning**: `pnpm validate:setup`
- **After `git pull`**: `pnpm validate:setup`
- **After restarting**: `pnpm validate:setup`
- **If something breaks**: `pnpm validate:setup`

Takes 30 seconds. Catches issues immediately.

---

## Integration with CI/CD

Validation also runs in GitHub Actions:

```yaml
- name: Validate development environment
  run: pnpm validate:setup
```

Ensures same environment locally and in CI.

---

## Health Metrics

The validation script reports:

- ✅ Passing: All systems working
- ❌ Failing: Specific issues to fix
- ⚠️ Warnings: Non-critical issues

**Goal**: 100% passing checks

---

## Summary

| Tool               | Command                      | Purpose                  |
| ------------------ | ---------------------------- | ------------------------ |
| **validate:setup** | `pnpm validate:setup`        | Quick environment check  |
| **Docker health**  | `docker compose ps`          | Service status           |
| **Logs**           | `docker compose logs -f`     | Real-time debugging      |
| **Full reset**     | `pnpm local:reset`           | Clean slate              |
| **Manual checks**  | `curl http://localhost:PORT` | Direct connectivity test |

---

**Valid environment = confident development.** ✅

Run `pnpm validate:setup` to get started.
