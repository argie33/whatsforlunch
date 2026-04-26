# Apple & Google Sign-In Setup

This document covers the configuration steps for federated identity providers in Cognito.

## Prerequisites

- Apple Developer Program enrollment ($99/year) — **required for iOS app with Google Sign-In**
- Google Cloud Console project with OAuth 2.0 credentials
- Cognito User Pool configured with custom auth flow (Phase A)

## Apple Sign-In (iOS)

### 1. Create a Services ID

1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Click **+** to create a new identifier
4. Select **Services IDs** and click **Continue**
5. Fill in:
   - **Description**: "WhatsForLunch Sign In"
   - **Identifier**: `com.whatsforlunch.signin` (must be unique)
6. Click **Continue** and **Register**

### 2. Configure Return URLs

1. Select the newly created Services ID
2. Enable **Sign In with Apple**
3. Click **Configure**
4. Add return URLs:
   ```
   https://wfl.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   https://wfl.dev.auth.us-east-1.amazoncognito.com/oauth2/idpresponse (for dev)
   ```
5. Click **Save**

### 3. Generate Private Key

1. In **Certificates, Identifiers & Profiles** → **Keys**
2. Click **+** to create a new key
3. Select **Sign in with Apple**
4. Provide a key name, e.g., "WhatsForLunch"
5. Click **Configure** and select your Services ID
6. Click **Save**
7. **Download the key file** — keep it secure!
8. Record the **Key ID** (10 characters)

### 4. Add to AWS Secrets Manager

Store your Apple signing key in Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name whatsforlunch/apple-key \
  --secret-string '{"private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}' \
  --region us-east-1
```

### 5. Update CDK

Uncomment the Apple provider in `infra/cdk/lib/stacks/auth-stack.ts`:

```typescript
const appleProvider = new cognito.UserPoolIdentityProviderApple(this, 'AppleProvider', {
  clientId: 'com.whatsforlunch.signin', // Services ID
  teamId: 'XXXXXXXXXX', // 10-char Team ID (visible in Apple Developer account)
  keyId: 'XXXXXXXXXX', // From step 3
  privateKey: cdk.SecretValue.secretsManager('whatsforlunch/apple-key', {
    jsonField: 'private_key',
  }),
  scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID],
  userPool: this.userPool,
});

// Configure custom attributes for Apple Sign-In
this.userPool.registerIdentityProvider(appleProvider);
```

## Google Sign-In (Android & iOS)

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Enable the **Google+ API**
4. Navigate to **APIs & Services** → **Credentials**
5. Click **+ Create Credentials** → **OAuth 2.0 Client ID**
6. Choose **iOS** (for native app) or **Android**
7. Fill in your app's bundle ID / package name and signing certificate SHA-1
8. Click **Create**
9. Note the **Client ID** (ends with `.apps.googleusercontent.com`)

### 2. Create Web Application Credentials (for Cognito)

1. In **Credentials**, click **+ Create Credentials** → **OAuth 2.0 Client ID**
2. Choose **Web application**
3. Add Authorized redirect URIs:
   ```
   https://wfl.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   https://wfl.dev.auth.us-east-1.amazoncognito.com/oauth2/idpresponse (for dev)
   ```
4. Click **Create**
5. Note the **Client ID** and **Client Secret**

### 3. Add to AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name whatsforlunch/google-client-id \
  --secret-string 'YOUR_CLIENT_ID.apps.googleusercontent.com' \
  --region us-east-1

aws secretsmanager create-secret \
  --name whatsforlunch/google-client-secret \
  --secret-string 'YOUR_CLIENT_SECRET' \
  --region us-east-1
```

### 4. Update CDK

Uncomment the Google provider in `infra/cdk/lib/stacks/auth-stack.ts`:

```typescript
const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
  clientId: cdk.SecretValue.secretsManager('whatsforlunch/google-client-id'),
  clientSecret: cdk.SecretValue.secretsManager('whatsforlunch/google-client-secret'),
  scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
  userPool: this.userPool,
});

this.userPool.registerIdentityProvider(googleProvider);
```

## Mobile App Configuration

### iOS

Add to `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.whatsforlunch</string>
    </array>
  </dict>
</array>
```

### Android

Add to `AndroidManifest.xml`:
```xml
<activity android:name="com.google.android.gms.auth.api.signin.internal.SignInHubActivity" />
```

## Token Exchange Flow

1. **Mobile app** calls native Apple Sign-In / Google Sign-In
2. **Backend** returns identity token (JWT)
3. **Mobile app** sends token to Cognito via `signIn()` with provider
4. **Cognito** validates token with Apple / Google
5. **Cognito** creates or links user account
6. **Mobile app** receives Cognito tokens (access, ID, refresh)

## Testing

### Manual Testing

1. Deploy stack: `pnpm cdk deploy AuthStack`
2. Open mobile app on real device
3. Tap "Sign in with Apple" or "Sign in with Google"
4. Verify user is created in Cognito User Pool
5. Verify tokens are issued

### Automated Testing

(To be implemented in Phase C)

## Troubleshooting

- **"Invalid client ID"**: Verify Services ID matches `com.whatsforlunch.signin`
- **"Unauthorized redirect"**: Ensure OAuth redirect URI is in Cognito User Pool settings
- **"Token expired"**: Apple invalidates tokens after 60 days — mobile app must re-auth gracefully
- **"Invalid signature"**: Apple signing key in Secrets Manager may be malformed — check JSON format

## References

- [AWS Cognito Apple Sign-In](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-sign-in-with-apple.html)
- [AWS Cognito Google Sign-In](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-sign-in-with-google.html)
- [Apple Sign in for Apps and Websites](https://developer.apple.com/sign-in-with-apple/)
- [Google Sign-In for Mobile Apps](https://developers.google.com/identity/sign-in/android)
