import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEY =
  Platform.OS === 'ios'
    ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '')
    : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '');

const PREMIUM_ENTITLEMENT = 'premium';

export class SubscriptionService {
  configure(userId: string): void {
    if (!API_KEY) return;
    Purchases.configure({ apiKey: API_KEY, appUserID: userId });
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    return Purchases.getCustomerInfo();
  }

  async getOffering(): Promise<PurchasesOffering | null> {
    const { current } = await Purchases.getOfferings();
    return current;
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  async restorePurchases(): Promise<CustomerInfo> {
    return Purchases.restorePurchases();
  }

  isPremium(info: CustomerInfo): boolean {
    return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
  }

  renewalDate(info: CustomerInfo): Date | null {
    const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT];
    if (!entitlement?.expirationDate) return null;
    return new Date(entitlement.expirationDate);
  }

  managementUrl(info: CustomerInfo): string | null {
    return info.managementURL ?? null;
  }
}

export const subscriptionService = new SubscriptionService();
