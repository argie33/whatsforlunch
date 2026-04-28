# Changelog

All notable changes to WhatsForLunch are documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- AI-powered food classification from photos (Bedrock Claude)
- Barcode scanning for packaged goods
- QR code container management
- Household sharing with role-based access
- Offline-first sync with WatermelonDB
- Push notifications for expiring items (24h window)
- Magic link authentication
- Apple Sign-In / Google Sign-In
- Subscription management via RevenueCat
- Data export (JSON, presigned S3 URL)
- Account deletion with 30-day retention window (GDPR)

## [0.1.0] — 2026-04-27

Initial beta build.

### Added

- Core food tracking: add, edit, mark eaten/tossed/frozen
- Expiry date tracking with food safety rules database (~150 food types)
- Household creation and membership
- Settings: display name, timezone, dietary preferences
- Local dev stack (Docker + mock GraphQL API)
- CI/CD pipeline (GitHub Actions, EAS Build, EAS Update)
- Maestro E2E test suite (14 flows)
- Sentry error monitoring
- PostHog analytics
- CloudWatch dashboards and alarms
