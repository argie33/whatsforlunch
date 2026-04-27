import { posthog } from './posthog';

// ─── Event catalog ────────────────────────────────────────────────────────────
// All PostHog events in one place. Funnels are defined in the PostHog dashboard
// using these event names. Never use raw strings — import from here.

export const Events = {
  // Onboarding funnel: install → first item added
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_SLIDE_VIEWED: 'onboarding_slide_viewed',   // { slide: 1|2|3|4 }
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Auth funnel: landing → signed in
  SIGN_IN_STARTED: 'sign_in_started',
  SIGN_IN_MAGIC_LINK_SENT: 'sign_in_magic_link_sent',
  SIGN_IN_COMPLETED: 'sign_in_completed',               // { method: 'magic_link'|'apple'|'google' }
  SIGN_OUT: 'sign_out',

  // Core item lifecycle
  ITEM_ADD_STARTED: 'item_add_started',                 // { method: 'photo'|'barcode'|'manual'|'qr' }
  ITEM_ADD_AI_CLASSIFIED: 'item_add_ai_classified',     // { confidence: float, food_type: string }
  ITEM_ADD_COMPLETED: 'item_add_completed',             // { method, food_type, storage_location }
  ITEM_MARK_EATEN: 'item_mark_eaten',                   // { days_before_expiry: int }
  ITEM_MARK_TOSSED: 'item_mark_tossed',                 // { days_before_expiry: int, reason?: string }
  ITEM_MARK_FROZEN: 'item_mark_frozen',
  ITEM_EDITED: 'item_edited',                           // { fields_changed: string[] }
  ITEM_DELETED: 'item_deleted',

  // Container flow
  QR_SCANNED: 'qr_scanned',                            // { result: 'container_found'|'not_found' }
  CONTAINER_CLAIMED: 'container_claimed',
  CONTAINER_OPENED: 'container_opened',
  STICKER_SHEET_GENERATED: 'sticker_sheet_generated',  // { count: int }

  // AI usage
  AI_CLASSIFY_STARTED: 'ai_classify_started',
  AI_CLASSIFY_SUCCEEDED: 'ai_classify_succeeded',      // { latency_ms: int }
  AI_CLASSIFY_FAILED: 'ai_classify_failed',            // { error: string }
  AI_QUOTA_HIT: 'ai_quota_hit',                        // { tier: 'free'|'premium' }

  // Sync
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',                    // { items_synced: int, duration_ms: int }
  SYNC_FAILED: 'sync_failed',                          // { error: string }
  OFFLINE_ACTION_QUEUED: 'offline_action_queued',      // { action: string }

  // Settings & account
  SETTINGS_OPENED: 'settings_opened',
  NOTIFICATION_PERMISSION_GRANTED: 'notification_permission_granted',
  NOTIFICATION_PERMISSION_DENIED: 'notification_permission_denied',
  EXPORT_DATA_REQUESTED: 'export_data_requested',
  DELETE_ACCOUNT_STARTED: 'delete_account_started',
  DELETE_ACCOUNT_COMPLETED: 'delete_account_completed',

  // Paywall / upgrade
  PAYWALL_SHOWN: 'paywall_shown',                      // { trigger: string }
  UPGRADE_STARTED: 'upgrade_started',                  // { plan: 'premium'|'family' }
  UPGRADE_COMPLETED: 'upgrade_completed',              // { plan, revenue_usd: float }
  UPGRADE_ABANDONED: 'upgrade_abandoned',
} as const;

export type AnalyticsEvent = (typeof Events)[keyof typeof Events];

// ─── Typed track helper ───────────────────────────────────────────────────────

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  posthog.capture(event, properties);
}

// ─── Funnel helpers ───────────────────────────────────────────────────────────

export function trackOnboardingSlide(slide: 1 | 2 | 3 | 4): void {
  track(Events.ONBOARDING_SLIDE_VIEWED, { slide });
}

export function trackItemAdded(
  method: 'photo' | 'barcode' | 'manual' | 'qr',
  foodType: string,
  storageLocation: string,
): void {
  track(Events.ITEM_ADD_COMPLETED, { method, food_type: foodType, storage_location: storageLocation });
}

export function trackItemMarkedEaten(expiryAt: number): void {
  const daysBeforeExpiry = Math.ceil((expiryAt - Date.now()) / 86_400_000);
  track(Events.ITEM_MARK_EATEN, { days_before_expiry: daysBeforeExpiry });
}

export function trackItemTossed(expiryAt: number): void {
  const daysBeforeExpiry = Math.ceil((expiryAt - Date.now()) / 86_400_000);
  track(Events.ITEM_MARK_TOSSED, { days_before_expiry: daysBeforeExpiry });
}

export function trackSignIn(method: 'magic_link' | 'apple' | 'google'): void {
  track(Events.SIGN_IN_COMPLETED, { method });
}

export function trackUpgrade(plan: 'premium' | 'family', revenueUsd: number): void {
  track(Events.UPGRADE_COMPLETED, { plan, revenue_usd: revenueUsd });
}
