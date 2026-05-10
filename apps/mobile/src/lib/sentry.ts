import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const appEnv = (Constants.expoConfig?.extra?.APP_ENV as string) ?? 'development';
const isDev = appEnv === 'development';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !isDev,
  environment: appEnv,
  release: `app.whatsfresh@${Constants.expoConfig?.version ?? '0.0.0'}`,
  dist: String(
    Constants.expoConfig?.ios?.buildNumber ??
      Constants.expoConfig?.android?.versionCode ??
      '0',
  ),
  tracesSampleRate: isDev ? 0 : 0.2,
  profilesSampleRate: isDev ? 0 : 0.1,
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  attachViewHierarchy: true,
  enableCaptureFailedRequests: true,
});

export { Sentry };
export const captureException = Sentry.captureException;
export const addBreadcrumb = Sentry.addBreadcrumb;
export const setUser = (id: string | null) =>
  Sentry.setUser(id ? { id } : null);
