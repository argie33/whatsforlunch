import React, { createContext, useContext, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from 'tamagui';

// Web version: mock database interface that doesn't require native modules
// TODO: Implement proper web database (IndexedDB, SQLite.js, etc.) in future

const mockDatabase = {
  collections: {},
};

export async function getDatabase() {
  return mockDatabase;
}

const DatabaseContext = createContext<any>(mockDatabase);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = React.useState(mockDatabase);

  React.useEffect(() => {
    setDb(mockDatabase);
  }, []);

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be called within DatabaseProvider');
  }
  return db;
}

export { schema as mockSchema } from './schema';
