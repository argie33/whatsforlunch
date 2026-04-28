# Code Quality — Automated Enforcement

Automatic checks run before every commit to keep code clean, type-safe, and tested.

---

## What Gets Checked Automatically

When you run `git commit`, these checks run automatically:

### 1. Formatting (Prettier)

```
📝 Running prettier + eslint on staged files...
```

**What it does**:

- Fixes formatting automatically
- Checks for linting errors
- Runs on all TypeScript/JavaScript files

**If it fails**:

```bash
pnpm format
git add .
git commit  # Try again
```

---

### 2. Type Checking (TypeScript)

```
🔷 Running TypeScript type check...
```

**What it does**:

- Ensures all TypeScript is correct
- Finds undefined variables
- Validates type safety

**If it fails**:

- Fix the TypeScript error (IDE will show it)
- Commit again

---

### 3. Unit Tests

```
🧪 Running tests...
```

**What it does**:

- Runs all unit tests
- Fails if any test breaks
- Quick feedback before pushing

**If it fails**:

```bash
pnpm test
# Fix failing tests
git add .
git commit  # Try again
```

---

### 4. GraphQL Schema (if schema changed)

```
📡 GraphQL schema changed, validating...
🔄 Regenerating types from schema...
```

**What it does**:

- Validates GraphQL schema syntax
- Auto-generates types
- Stages generated files automatically

**Automatic**: No action needed, types are regenerated for you.

---

### 5. Integration Tests (if API code changed)

```
🧬 API code changed, running integration tests...
```

**What it does**:

- Runs 23 end-to-end tests
- Validates DynamoDB + GraphQL API
- Tests complete flows

**If it fails**:

```bash
pnpm local:setup  # Start services if needed
pnpm local:test
# Fix the issue
git commit  # Try again
```

---

## The Workflow

### You Make Changes

```typescript
// apps/mobile/src/screens/ProfileScreen.tsx
export function ProfileScreen() {
  // ... your code ...
}
```

### You Commit

```bash
git add .
git commit -m "feat: add profile screen"
```

### Hooks Run Automatically

```
🔍 Running pre-commit checks...

📝 Running prettier + eslint on staged files...
✅ Formatting passed

🔷 Running TypeScript type check...
✅ Type check passed

🧪 Running tests...
✅ Tests passed

✅ All pre-commit checks passed!
   • Code formatted ✓
   • No lint errors ✓
   • Types are correct ✓
   • Tests passing ✓

Ready to commit! 🚀
```

### If Something Fails

Hook stops the commit and tells you what to fix:

```
❌ Type check failed
   Fix TypeScript errors and try again
```

You fix it, then:

```bash
git add .
git commit -m "feat: add profile screen"  # Try again
```

---

## What Each Team Gets

### Mobile Team (W5-W7)

Your commits are checked for:

- ✅ React component syntax
- ✅ Type safety in UI logic
- ✅ Tests for screens/features
- ✅ Formatting consistency

**Result**: No TypeScript surprises at runtime. Clean, tested code.

### Backend Team (W2)

Your commits are checked for:

- ✅ Resolver logic correctness
- ✅ DynamoDB operations are sound
- ✅ Integration tests pass
- ✅ GraphQL schema is valid

**Result**: API changes are validated before pushing.

### AI Team (W4)

Your commits are checked for:

- ✅ Lambda functions compile
- ✅ Type safety in AI models
- ✅ Bedrock integration is sound
- ✅ Tests for classification logic

**Result**: No runtime errors in production.

---

## Bypassing Hooks (When Necessary)

Sometimes you need to bypass hooks temporarily (rarely):

```bash
# Skip ALL hooks (not recommended)
git commit --no-verify -m "..."

# But you'll still need CI to pass before merge
```

**Better approach**: Fix the issue instead. Hooks exist to prevent bugs.

---

## Customizing Hooks

### Add a New Hook

Edit `.husky/pre-commit` to add checks.

### Disable a Hook

Remove the check from `.husky/pre-commit`.

### Skip a Specific Check

```bash
# Skip tests (not recommended)
HUSKY_SKIP_HOOKS=1 git commit -m "..."
```

---

## CI/CD Integration

### Local (Pre-Commit Hooks)

- Quick feedback (30 seconds)
- Catches obvious errors
- Type safety
- Formatting

### GitHub Actions (CI)

- Comprehensive checks
- Slower but thorough (2-3 minutes)
- Security scanning
- Full test suite
- All platforms (Mac/Linux/Windows)

**Result**: Local hooks catch 80% of issues instantly. CI catches edge cases.

---

## Best Practices

### 1. Don't Bypass Hooks

❌ Bad:

```bash
git commit --no-verify  # Skips quality checks
```

✅ Good:

```bash
# Fix the issue
pnpm format
pnpm test
git commit  # Now it passes
```

### 2. Commit Frequently

❌ Bad:

```bash
# Accumulate 100 changes
git commit --no-verify  # Can't fix them all
```

✅ Good:

```bash
# After each feature
git add .
git commit -m "feat: specific feature"  # Hooks catch issues immediately
```

### 3. Keep Tests Passing

❌ Bad:

```typescript
// Add code but don't write tests
export function newFeature() { ... }
```

✅ Good:

```typescript
// Add code AND tests
export function newFeature() { ... }

describe('newFeature', () => {
  it('should do X', () => {
    expect(newFeature()).toBe(...)
  })
})
```

### 4. Fix Formatting Issues

Don't fight the formatter:

```bash
pnpm format  # Auto-fixes formatting
git add .
git commit
```

---

## Troubleshooting

### "Hook is not executable"

```bash
chmod +x .husky/pre-commit
git commit
```

### "pnpm: command not found in hook"

Make sure pnpm is installed:

```bash
npm install -g pnpm@9
```

### "Tests taking too long"

Run tests in parallel:

```bash
# In package.json
"test": "jest --maxWorkers=4"
```

### "Local tests fail but CI passes"

Services might not be running:

```bash
pnpm local:setup
pnpm local:test
```

---

## What Gets Skipped

Some checks are skipped intentionally:

- ❌ End-to-end tests (too slow, CI handles)
- ❌ Security scanning (too slow, CI handles)
- ❌ Performance tests (environment-specific, CI handles)

**Why**: Pre-commit hooks should be <30 seconds. Detailed checks happen in CI.

---

## The Philosophy

```
Pre-commit hooks:
  • Fast feedback (you're still in your editor)
  • Catch 80% of issues immediately
  • Prevent broken commits

GitHub Actions (CI):
  • Comprehensive (every edge case)
  • Thorough security scanning
  • All platforms tested
  • Catches what hooks missed
```

**Result**: High confidence when code reaches production.

---

## Summary

| Check         | Runs Where     | Time | Catches              |
| ------------- | -------------- | ---- | -------------------- |
| Format + Lint | Pre-commit     | 5s   | Style issues         |
| Type Check    | Pre-commit     | 10s  | Type errors          |
| Unit Tests    | Pre-commit     | 15s  | Logic errors         |
| GraphQL       | Pre-commit     | 5s   | Schema issues        |
| Integration   | Pre-commit     | 30s  | API errors           |
| Full CI       | GitHub Actions | 3m   | Security, edge cases |

**Total pre-commit time**: ~30 seconds
**Total CI time**: ~3 minutes

---

## Next Time You Commit

```bash
# Write code
vim apps/mobile/src/screens/NewScreen.tsx

# Commit
git add .
git commit -m "feat: add new screen"

# Hooks run automatically:
# • Format ✓
# • Lint ✓
# • Types ✓
# • Tests ✓
# Success! 🚀
```

All quality checks, zero extra work.

---

**Code quality enforced. Every commit validated. Production ready.** ✅
