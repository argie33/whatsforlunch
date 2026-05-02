import React, { createContext, useContext, ReactNode } from 'react';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import {
  Profile,
  Household,
  HouseholdMember,
  Container,
  Item,
  FoodRule,
  ItemEvent,
  ShoppingListItem,
  MealPlanEntry,
} from './models';
import { secureGet, secureSet } from '@/lib/secure-store';

const DB_KEY = 'wfl_db_encryption_key';

async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await secureGet(DB_KEY);
  if (!key) {
    // Use Web Crypto API (available in RN 0.73+ via Hermes/JSC, no Node.js crypto needed)
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    key = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await secureSet(DB_KEY, key);
  }
  return key;
}

let database: Database | null = null;

async function initializeDatabase(): Promise<Database> {
  if (database) return database;

  const encryptionKey = await getOrCreateEncryptionKey();

  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'wfl',
    // encryptionKey passed via platform-specific extension when supported
    ...(encryptionKey && { encryptionKey }),
  } as ConstructorParameters<typeof SQLiteAdapter>[0]);

  database = new Database({
    adapter,
    modelClasses: [
      Profile,
      Household,
      HouseholdMember,
      Container,
      Item,
      FoodRule,
      ItemEvent,
      ShoppingListItem,
      MealPlanEntry,
    ],
  });

  return database;
}

export async function getDatabase(): Promise<Database> {
  if (!database) {
    database = await initializeDatabase();
  }
  return database;
}

const DatabaseContext = createContext<Database | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = React.useState<Database | null>(null);

  React.useEffect(() => {
    let mounted = true;
    initializeDatabase().then((database) => {
      if (mounted) setDb(database);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!db) {
    return null;
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be called within DatabaseProvider');
  }
  return db;
}

export { schema };
