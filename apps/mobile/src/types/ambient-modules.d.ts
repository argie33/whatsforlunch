declare module 'rxjs' {
  export interface Observer<T> {
    next?: (value: T) => void;
    error?: (err: unknown) => void;
    complete?: () => void;
  }
  export interface Subscription {
    unsubscribe(): void;
  }
  export interface Observable<T> {
    subscribe(observer: Observer<T>): Subscription;
    subscribe(callback: (value: T) => void, errorCallback?: (err: unknown) => void): Subscription;
    pipe(...operators: unknown[]): Observable<T>;
  }
}

declare module '@react-navigation/native' {
  export function useRoute(): { name: string; params?: Record<string, unknown> };
  export function useNavigation<T = unknown>(): T;
  export type NavigationContainerRef<T extends Record<string, object | undefined>> = {
    navigate: (name: keyof T, params?: T[keyof T]) => void;
    reset: (state: unknown) => void;
    goBack: () => void;
    getCurrentRoute: () => { name: string } | undefined;
  };
}

declare module '@aws-amplify/core' {
  export const Hub: {
    listen: (
      channel: string,
      callback: (data: { payload: { event: string; [key: string]: unknown } }) => void,
    ) => () => void;
    dispatch: (channel: string, payload: { event: string; [key: string]: unknown }) => void;
  };
}

declare module 'aws-amplify/api' {
  type GraphQLResult<T> = { data: T; errors?: { message: string }[] };
  type GraphQLClient = {
    graphql<T = unknown>(options: {
      query: string;
      variables?: Record<string, unknown>;
      authMode?: string;
    }): Promise<GraphQLResult<T>>;
  };
  export function generateClient(): GraphQLClient;
}

declare module 'aws-amplify/storage' {
  type UploadTask = { result: Promise<{ key: string }> };
  export function uploadData(options: {
    key: string;
    data: string | Blob | { base64: string };
    options?: { contentType?: string; accessLevel?: string };
  }): UploadTask;
  export function getUrl(options: {
    key: string;
    options?: { accessLevel?: string; expiresIn?: number };
  }): Promise<{ url: URL }>;
  export function deleteObject(options: { key: string }): Promise<void>;
  export function remove(options: { key: string }): Promise<void>;
}

declare module 'expo-file-system' {
  export const EncodingType: { Base64: 'base64'; UTF8: 'utf8' };
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;
  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: 'base64' | 'utf8' },
  ): Promise<string>;
  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: 'base64' | 'utf8' },
  ): Promise<void>;
  export function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
  export function getInfoAsync(fileUri: string): Promise<{
    exists: boolean;
    isDirectory: boolean;
    size?: number;
    modificationTime?: number;
    uri: string;
  }>;
}

declare module '@tamagui/font-inter' {
  export function createInterFont(options?: Record<string, unknown>): unknown;
}

declare module '@tamagui/shorthands' {
  export const shorthands: Record<string, string>;
}
