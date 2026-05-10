# Auth Service

Cognito-based authentication with magic link flow.

## Structure

- `define-challenge/`: Lambda trigger for `DEFINE_AUTH_CHALLENGE` — initiates custom auth flow
- `create-challenge/`: Lambda trigger for `CREATE_AUTH_CHALLENGE` — generates nonce, stores to DynamoDB, sends SES email
- `verify-challenge/`: Lambda trigger for `VERIFY_AUTH_CHALLENGE_RESPONSE` — validates nonce with HMAC, enforces single-use
- `pre-signup/`: Lambda trigger for `PRE_SIGN_UP` — auto-confirms email signups
- `post-confirm/`: Lambda trigger for `POST_CONFIRMATION` — initializes user profile in DynamoDB

## Magic Link Flow

1. User enters email → `InitiateAuth(USER_PASSWORD_AUTH-stub)`
2. Cognito calls `DEFINE_AUTH_CHALLENGE` → returns `CUSTOM_CHALLENGE`
3. Cognito calls `CREATE_AUTH_CHALLENGE`:
   - Generate cryptographically random nonce
   - Store HMAC(nonce, secret) + metadata in DynamoDB
   - Send magic link email via SES
   - Return public challenge: `{ destination: "email" }`
4. User clicks link in email → app receives universal link
5. App calls `RespondToAuthChallenge` with nonce as challenge answer
6. Cognito calls `VERIFY_AUTH_CHALLENGE_RESPONSE`:
   - Lookup nonce in DynamoDB
   - Verify HMAC, IP class, user agent hash
   - Delete nonce (single-use enforcement)
   - Return success
7. Cognito issues tokens (access, ID, refresh)

## Environment Variables

- `AUTH_CHALLENGES_TABLE`: DynamoDB table name for nonce storage
- `PROFILES_TABLE`: DynamoDB table for user profiles (created by post-confirm)
- `NONCE_SECRET`: Server-side secret for HMAC (from Secrets Manager)
- `SES_FROM_EMAIL`: Sender email for magic link emails
- `LOG_LEVEL`: Logging verbosity (default: INFO)

## Security Considerations

- **Nonce TTL**: 10 minutes — prevents long-lived link interception
- **Single-use**: DynamoDB conditional delete enforces one-time use
- **IP class binding**: Stored `/16` network allows some variance for mobile networks
- **User agent hash**: Logged if changed; alerts enabled in production for account takeover detection
- **HMAC verification**: Timing-safe comparison prevents timing attacks
- **No secrets in logs**: Nonce and HMAC never logged; only metadata

## Building

```bash
pnpm install
pnpm build
```

Each Lambda will be bundled by CDK during `cdk deploy`.

## Testing

Unit tests for individual Lambdas:
```bash
pnpm test
```

End-to-end testing via `pnpm cdk deploy` to a dev environment.
