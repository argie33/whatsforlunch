# 🔔 Push Notifications Setup Guide

**Status**: Code ready ✅ | Credentials needed ⏳  
**Timeline**: 2-3 hours (most time is waiting for Apple review)

## What's Already Done

✅ Expo app configured with `expo-notifications` plugin  
✅ Android has POST_NOTIFICATIONS permission  
✅ iOS has remote-notification background mode enabled  
✅ Local notification scheduling works (expiry alerts)  
✅ Backend Lambda exists at `services/notify-expiring/`  

## What You Need To Do

### 1. **Firebase Cloud Messaging (FCM) for Android** — 30 min

Firebase provides free push notification service for Android.

```bash
# Step 1: Create Firebase Project
# Go to: https://console.firebase.google.com
# Click "Create a project"
# Name it: "WhatsFresh"
# Enable Google Analytics (optional)

# Step 2: Register Android app
# In Firebase console → Add app → Android
# Package name: app.whatsfresh.mobile
# Download google-services.json

# Step 3: Add to your project
cp google-services.json apps/mobile/

# Step 4: Get FCM credentials
# Firebase console → Project settings → Cloud Messaging
# Copy Server API Key (paste into environment)
```

### 2. **Apple Push Notification Service (APNS) for iOS** — 1-2 hours

APNS is Apple's push notification service. Requires Apple Developer Account.

```bash
# Step 1: Generate APNS Certificate
# Go to: https://developer.apple.com/account
# Certificates, IDs & Profiles → Certificates
# Create new certificate type "Apple Push Notification service SSL (Production)"
# Select your app ID: app.whatsfresh.mobile
# Download the .cer file

# Step 2: Convert to format Expo needs
openssl x509 -in aps_production.cer -inform der -out aps_production.pem

# Step 3: Configure in Expo
# Go to: https://expo.dev/accounts/YOUR_USERNAME/projects/WhatsFresh
# Build settings → iOS → Push Notifications
# Upload the aps_production.pem file
```

### 3. **Wire Push Token to Backend** — 30 min

The app needs to send its push token to the backend so the Lambda can send notifications.

**File**: `apps/mobile/src/lib/notifications.ts`

Add this after `requestNotificationPermission()`:

```typescript
export async function getPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (err) {
    console.error('[Notifications] Failed to get push token:', err);
    return null;
  }
}

export async function registerPushToken(userId: string, householdId: string): Promise<void> {
  const token = await getPushToken();
  if (!token) return;

  // TODO: Send to backend GraphQL mutation
  // mutation RegisterPushToken($userId: ID!, $householdId: ID!, $token: String!) {
  //   registerPushToken(userId: $userId, householdId: $householdId, token: $token) {
  //     success
  //   }
  // }
}
```

**File**: `apps/mobile/app/_layout.tsx`

Call registration on app startup:

```typescript
import { registerPushToken } from '@/lib/notifications';

export default function RootLayout() {
  const { userId, householdId } = useAuthIds();

  useEffect(() => {
    if (userId && householdId) {
      registerPushToken(userId, householdId).catch(console.error);
    }
  }, [userId, householdId]);

  // ... rest of layout
}
```

### 4. **Backend: Store Push Tokens** — 1 hour

**File**: `services/local-mock/src/resolvers.ts`

Add resolver:

```typescript
export async function registerPushToken(
  user: LocalUser,
  householdId: string,
  token: string,
) {
  const item = {
    PK: `USER#${user.email}`,
    SK: `PUSH_TOKEN#${token}`,
    userId: user.id,
    householdId,
    token,
    platform: 'expo', // Expo handles FCM + APNS
    registeredAt: now(),
  };
  await put(item);
  return { success: true };
}
```

### 5. **Backend: Send Notifications** — 1 hour

**File**: `services/notify-expiring/index.ts`

Connect Lambda to push service:

```typescript
import { sendPushNotification } from '@/lib/expo-notifications';

async function notifyExpiringItems(householdId: string) {
  const items = await listExpiringItems(householdId);

  for (const item of items) {
    // Get push tokens for household members
    const tokens = await getPushTokensForHousehold(householdId);

    for (const token of tokens) {
      await sendPushNotification(token, {
        title: 'Food Expiring Soon!',
        body: `${item.foodName} expires in ${item.hoursUntilExpiry} hours`,
        data: { itemId: item.id },
      });
    }
  }
}
```

---

## Testing Locally

Before production, test with Expo's push notification service:

```bash
# Terminal 1: Start app
pnpm dev

# Terminal 2: Send test notification
curl --request POST \
  --url https://exp.host/--/api/v2/push/send \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "ExponentPushToken[YOUR_EXPO_PUSH_TOKEN]",
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

---

## Environment Variables

Add to `.env.local`:

```bash
# Firebase/FCM (Android)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVER_API_KEY=your-server-api-key

# APNS (iOS) — configured in Expo dashboard, not env vars
# See step 3 above
```

---

## Deployment Checklist

- [ ] Firebase project created with FCM credentials
- [ ] APNS certificate generated and uploaded to Expo
- [ ] Push token registration GraphQL mutation added
- [ ] Backend stores push tokens in DynamoDB
- [ ] Lambda can retrieve and send notifications
- [ ] Test notifications work end-to-end
- [ ] Production build tested on iOS TestFlight & Android beta

---

## References

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification service (APNs)](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
- [Expo Push Service](https://docs.expo.dev/push-notifications/overview/)

