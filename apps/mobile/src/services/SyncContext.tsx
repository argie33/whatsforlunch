import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { SyncService } from './SyncService';
import { SyncState } from '../db/sync';
import { QueuedOp } from '../db/queue';
import { useDatabase } from '../db';

interface SyncContextValue {
  state: SyncState;
  sync: (householdId: string) => Promise<void>;
  enqueue: (op: Omit<QueuedOp, 'id' | 'retryCount' | 'enqueuedAt'>) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const INITIAL_STATE: SyncState = {
  status: 'idle',
  lastSyncedAt: null,
  pendingCount: 0,
  error: null,
};

interface SyncProviderProps {
  children: ReactNode;
  householdId: string | null;
}

export function SyncProvider({ children, householdId }: SyncProviderProps) {
  const db = useDatabase();
  const serviceRef = useRef<SyncService | null>(null);
  const [state, setState] = useState<SyncState>(INITIAL_STATE);

  useEffect(() => {
    const service = new SyncService(db);
    serviceRef.current = service;

    const unsub = service.subscribe(setState);

    if (householdId) {
      service.start(householdId);
    }

    return () => {
      unsub();
      service.stop();
      serviceRef.current = null;
    };
  }, [db, householdId]);

  const value: SyncContextValue = {
    state,
    sync: (hid) => {
      const s = serviceRef.current;
      if (!s) return Promise.resolve();
      return s.sync(hid);
    },
    enqueue: (op) => {
      serviceRef.current?.enqueue(op);
    },
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncState(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncState must be used inside SyncProvider');
  return ctx.state;
}

export function useEnqueue(): (op: Omit<QueuedOp, 'id' | 'retryCount' | 'enqueuedAt'>) => void {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useEnqueue must be used inside SyncProvider');
  return ctx.enqueue;
}

export function useSync(): (householdId: string) => Promise<void> {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx.sync;
}
