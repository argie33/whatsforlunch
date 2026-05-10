// Jest mock for react-native-purchases (RevenueCat) — no native bridge needed.

export type CustomerInfo = any;
export type PurchasesOffering = any;
export type PurchasesPackage = any;

const mockCustomerInfo: CustomerInfo = {
  entitlements: { active: {} },
  managementURL: null,
};

const Purchases = {
  configure: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue(mockCustomerInfo),
  getOfferings: jest.fn().mockResolvedValue({ current: null }),
  purchasePackage: jest.fn().mockResolvedValue({ customerInfo: mockCustomerInfo }),
  restorePurchases: jest.fn().mockResolvedValue(mockCustomerInfo),
};

export default Purchases;
