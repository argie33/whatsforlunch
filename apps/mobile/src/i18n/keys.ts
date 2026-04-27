/**
 * Type-safe i18n key paths derived from en.json.
 * Import TranslationKey and use instead of plain string in t() calls.
 *
 * Usage:
 *   import { t } from '@/i18n';
 *   import type { TranslationKey } from '@/i18n/keys';
 *
 *   const key: TranslationKey = 'dashboard.title';   // ✅
 *   const bad: TranslationKey = 'dashboard.typo';    // ❌ compile error
 */

import type en from './en.json';

type Leaves<T, Prefix extends string = ''> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: Leaves<
        T[K],
        Prefix extends '' ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string]
  : Prefix;

export type TranslationKey = Leaves<typeof en>;

/**
 * Type-checked wrapper for t(). Use in components to catch key typos at build time.
 *
 * import { tk } from '@/i18n/keys';
 * t(tk('dashboard.title'))        // type-safe
 */
export function tk(key: TranslationKey): TranslationKey {
  return key;
}
