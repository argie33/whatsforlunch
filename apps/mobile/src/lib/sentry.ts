import * as Sentry from '@sentry/react-native';
import { IS_DEV } from './env';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !IS_DEV,
  tracesSampleRate: 0.2,
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  environment: __DEV__ ? 'development' : 'production',
});

export { Sentry };
export const captureException = Sentry.captureException;
