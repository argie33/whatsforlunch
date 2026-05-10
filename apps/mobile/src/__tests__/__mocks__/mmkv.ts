// In-memory MMKV mock for Jest — no native bridge needed.

const stores: Record<string, Record<string, string>> = {};

function parseBoolean(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  return raw === 'true';
}

export class MMKV {
  private readonly storeId: string;

  constructor(opts?: { id?: string }) {
    this.storeId = opts?.id ?? 'default';
    if (!stores[this.storeId]) stores[this.storeId] = {};
  }

  getString(key: string): string | undefined {
    return stores[this.storeId][key];
  }

  getBoolean(key: string): boolean | undefined {
    return parseBoolean(stores[this.storeId][key]);
  }

  set(key: string, value: string | number | boolean): void {
    stores[this.storeId][key] = String(value);
  }

  delete(key: string): void {
    delete stores[this.storeId][key];
  }

  contains(key: string): boolean {
    return key in stores[this.storeId];
  }

  getAllKeys(): string[] {
    return Object.keys(stores[this.storeId]);
  }

  clearAll(): void {
    stores[this.storeId] = {};
  }

  addOnValueChangedListener(_callback: (key: string) => void): { remove: () => void } {
    return { remove: jest.fn() };
  }
}

/** Reset all stores — call in beforeEach to guarantee test isolation. */
export function __resetAll() {
  Object.keys(stores).forEach((k) => {
    stores[k] = {};
  });
}
