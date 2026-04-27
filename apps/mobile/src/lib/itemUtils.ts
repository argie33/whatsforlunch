import type { Item } from '@/db/models/Item';
import type { Status } from '@/components/ui/StatusBadge';

const MS_1H = 60 * 60 * 1000;
const MS_1D = 24 * MS_1H;

export function getItemStatus(item: Item): Status {
  if (item.status === 'frozen') return 'frozen';
  const msLeft = item.expiryAt - Date.now();
  if (msLeft <= 0) return 'expired';
  if (msLeft <= MS_1D) return 'urgent';
  if (msLeft <= 3 * MS_1D) return 'soon';
  return 'fresh';
}

export function formatTimeLeft(expiryAt: number): string {
  const msLeft = expiryAt - Date.now();
  if (msLeft <= 0) {
    const days = Math.floor(-msLeft / MS_1D);
    if (days === 0) return 'Expired today';
    return `${days}d ago`;
  }
  const hours = msLeft / MS_1H;
  if (hours < 24) {
    const h = Math.floor(hours);
    return h <= 1 ? 'Less than 1h' : `${h}h left`;
  }
  const days = Math.floor(msLeft / MS_1D);
  if (days === 1) return 'Tomorrow';
  return `${days}d left`;
}

export type ExpiryBucket = 'expired' | 'urgent' | 'soon' | 'fresh' | 'frozen';

export function getBucket(item: Item): ExpiryBucket {
  if (item.status === 'frozen') return 'frozen';
  const msLeft = item.expiryAt - Date.now();
  if (msLeft <= 0) return 'expired';
  if (msLeft <= MS_1D) return 'urgent';
  if (msLeft <= 3 * MS_1D) return 'soon';
  return 'fresh';
}

export interface ItemSection {
  key: ExpiryBucket;
  labelKey: string;
  items: Item[];
}

const BUCKET_ORDER: ExpiryBucket[] = ['expired', 'urgent', 'soon', 'fresh', 'frozen'];

export function groupItemsIntoSections(items: Item[]): ItemSection[] {
  const buckets: Record<ExpiryBucket, Item[]> = {
    expired: [], urgent: [], soon: [], fresh: [], frozen: [],
  };
  for (const item of items) {
    buckets[getBucket(item)].push(item);
  }
  const sections: ItemSection[] = [];
  for (const key of BUCKET_ORDER) {
    if (buckets[key].length > 0) {
      sections.push({
        key,
        labelKey: `dashboard.section${key.charAt(0).toUpperCase() + key.slice(1)}`,
        items: buckets[key],
      });
    }
  }
  return sections;
}
