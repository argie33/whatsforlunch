# Runbook: Mobile OTA Rollback (EAS Update)

**When to use**: A JS-only release (no native changes) is causing crashes or regressions. No App Store re-submission needed.

## 1. Identify the bad update

Check Sentry for the crash signature. Note the EAS update ID from the release tag.

```bash
# List recent updates on the affected channel
npx eas-cli update:list --branch production --limit 10
```

## 2. Roll back via channel re-point

EAS Update lets you re-point a channel to any previous update:

```bash
# Find the last good update ID from the list above
GOOD_UPDATE_ID="<uuid-of-last-good-update>"

# Re-publish the good update to the channel
npx eas-cli update --branch production --message "rollback to $GOOD_UPDATE_ID" \
  --update-id $GOOD_UPDATE_ID
```

Clients receive the rollback OTA within ~2 minutes on next app foreground.

## 3. Verify

- Watch Sentry crash rate drop in real time (give it ~10 minutes for users to pick up the update)
- CloudWatch Lambda error rates should remain unaffected (OTA is JS-only)

## 4. Native regression (requires store submission)

If the regression is in native code, OTA cannot fix it:

1. Pull the build from Apple / Google review pipeline if not yet public
2. Force EAS Update to a version compatible with the previous native binary
3. Submit an expedited fix build to App Store Connect (use "bug fix" category for faster review)

## SLA

JS-only: < 2 minutes to rollback delivered to users.
Native: 24-48h (App Store review).
