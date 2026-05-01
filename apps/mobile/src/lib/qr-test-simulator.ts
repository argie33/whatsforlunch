/**
 * QR Test Simulator
 * Provides mock QR codes for testing without physical codes
 * Use in development/demo mode
 */

export const QR_TEST_CODES = {
  // Format: qr_token_XXXXX
  container1: {
    token: 'qr_token_00001',
    number: 1001,
    name: 'Blue Tupperware',
  },
  container2: {
    token: 'qr_token_00002',
    number: 1002,
    name: 'Mason Jar Set',
  },
  container3: {
    token: 'qr_token_00003',
    number: 1003,
    name: 'Glass Baking Dish',
  },
  container4: {
    token: 'qr_token_00004',
    number: 1004,
    name: 'Plastic Container',
  },
};

export const BARCODE_TEST_CODES = {
  coca_cola: {
    barcode: '5449000000996',
    product: 'Coca-Cola 330ml',
    brand: 'The Coca-Cola Company',
  },
  milk: {
    barcode: '628021127100',
    product: '2% Reduced Fat Milk',
    brand: 'Store Brand',
  },
  bread: {
    barcode: '783663500002',
    product: 'Whole Wheat Bread',
    brand: 'Store Brand',
  },
  yogurt: {
    barcode: '070169008309',
    product: 'Greek Yogurt Plain',
    brand: 'Fage',
  },
};

export interface QRTestConfig {
  enabled: boolean;
  delayMs: number; // Simulate camera processing delay
  logScans: boolean;
}

const DEFAULT_CONFIG: QRTestConfig = {
  enabled: true,
  delayMs: 500,
  logScans: true,
};

let config = DEFAULT_CONFIG;

export const QRTestSimulator = {
  /**
   * Configure the simulator
   */
  configure(cfg: Partial<QRTestConfig>) {
    config = { ...config, ...cfg };
    console.log('[QR Simulator] Configured:', config);
  },

  /**
   * Simulate QR detection
   */
  async simulateQrScan(token: string, onDetected: (value: string) => Promise<void>): Promise<void> {
    if (!config.enabled) {
      console.warn('[QR Simulator] Simulator disabled');
      return;
    }

    if (config.logScans) {
      console.log('[QR Simulator] Simulating QR scan:', token);
    }

    // Simulate camera processing delay
    await new Promise((resolve) => setTimeout(resolve, config.delayMs));

    try {
      await onDetected(token);
      if (config.logScans) {
        console.log('[QR Simulator] Scan succeeded:', token);
      }
    } catch (err) {
      console.error('[QR Simulator] Scan failed:', err);
      throw err;
    }
  },

  /**
   * Simulate barcode detection
   */
  async simulateBarcodeScan(
    barcode: string,
    onDetected: (value: string) => Promise<void>,
  ): Promise<void> {
    if (!config.enabled) {
      console.warn('[QR Simulator] Simulator disabled');
      return;
    }

    if (config.logScans) {
      console.log('[QR Simulator] Simulating barcode scan:', barcode);
    }

    await new Promise((resolve) => setTimeout(resolve, config.delayMs));

    try {
      await onDetected(barcode);
      if (config.logScans) {
        console.log('[QR Simulator] Barcode scan succeeded:', barcode);
      }
    } catch (err) {
      console.error('[QR Simulator] Barcode scan failed:', err);
      throw err;
    }
  },

  /**
   * Get all test QR codes
   */
  getQrTestCodes() {
    return QR_TEST_CODES;
  },

  /**
   * Get all test barcodes
   */
  getBarcodeTestCodes() {
    return BARCODE_TEST_CODES;
  },

  /**
   * Get config
   */
  getConfig() {
    return config;
  },
};
