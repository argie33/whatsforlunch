/**
 * Application Store Links Configuration
 * Update these values when app IDs are available after submission
 */

export const APP_LINKS = {
  // iOS App Store
  // Update with real app ID after submission (e.g., 'id1234567890')
  appStore: process.env.PUBLIC_APP_STORE_URL || 'https://apps.apple.com/app/id1737839284',

  // Google Play Store
  // Update with real app ID after submission
  playStore:
    process.env.PUBLIC_PLAY_STORE_URL ||
    'https://play.google.com/store/apps/details?id=app.whatsfresh.mobile',

  // Web app
  website: 'https://whatsfresh.app',

  // Support & legal
  privacy: '/privacy',
  terms: '/terms',
  support: '/support',
  pressKit: '/press',

  // Deep links
  deepLinkScheme: 'whatsfresh://',
};

export default APP_LINKS;
