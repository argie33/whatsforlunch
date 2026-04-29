import { useState, useEffect, useCallback } from 'react';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { subscriptionService } from '@/services/SubscriptionService';

type Status = 'loading' | 'idle' | 'purchasing' | 'restoring' | 'error';

interface SubscriptionState {
  isPremium: boolean;
  renewalDate: Date | null;
  managementUrl: string | null;
  offering: PurchasesOffering | null;
  status: Status;
  error: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    renewalDate: null,
    managementUrl: null,
    offering: null,
    status: 'loading',
    error: null,
  });

  useEffect(() => {
    Promise.all([subscriptionService.getCustomerInfo(), subscriptionService.getOffering()])
      .then(([info, offering]) => {
        setState((s) => ({
          ...s,
          isPremium: subscriptionService.isPremium(info),
          renewalDate: subscriptionService.renewalDate(info),
          managementUrl: subscriptionService.managementUrl(info),
          offering,
          status: 'idle',
        }));
      })
      .catch(() => {
        setState((s) => ({ ...s, status: 'error', error: 'Failed to load plans' }));
      });
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    setState((s) => ({ ...s, status: 'purchasing', error: null }));
    try {
      const info = await subscriptionService.purchasePackage(pkg);
      setState((s) => ({
        ...s,
        isPremium: subscriptionService.isPremium(info),
        renewalDate: subscriptionService.renewalDate(info),
        managementUrl: subscriptionService.managementUrl(info),
        status: 'idle',
      }));
    } catch (e: unknown) {
      if ((e as { userCancelled?: boolean }).userCancelled) {
        setState((s) => ({ ...s, status: 'idle' }));
        return;
      }
      setState((s) => ({
        ...s,
        status: 'error',
        error: (e as Error).message ?? 'Purchase failed',
      }));
    }
  }, []);

  const restore = useCallback(async () => {
    setState((s) => ({ ...s, status: 'restoring', error: null }));
    try {
      const info = await subscriptionService.restorePurchases();
      setState((s) => ({
        ...s,
        isPremium: subscriptionService.isPremium(info),
        renewalDate: subscriptionService.renewalDate(info),
        managementUrl: subscriptionService.managementUrl(info),
        status: 'idle',
      }));
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: (e as Error).message ?? 'Restore failed',
      }));
    }
  }, []);

  return { ...state, purchase, restore };
}
