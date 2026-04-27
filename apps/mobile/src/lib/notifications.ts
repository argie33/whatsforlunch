import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import type { Item } from '@/db/models/Item';
import { t } from '@/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiry-alerts', {
      name: 'Expiry Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#FF9500',
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const storage = new MMKV({ id: 'wfl.notifications' });

const MS_1D = 24 * 60 * 60 * 1000;
const MS_2H = 2 * 60 * 60 * 1000;

function notifIdKey(itemId: string) {
  return `notif_id_${itemId}`;
}

function getStoredNotifId(itemId: string): string | undefined {
  return storage.getString(notifIdKey(itemId));
}

function storeNotifId(itemId: string, notifId: string) {
  storage.set(notifIdKey(itemId), notifId);
}

function clearStoredNotifId(itemId: string) {
  storage.delete(notifIdKey(itemId));
}

export async function scheduleExpiryNotification(item: Item): Promise<void> {
  // Cancel any existing notification for this item
  await cancelExpiryNotification(item.id);

  const msLeft = item.expiryAt - Date.now();
  if (msLeft <= 0) return; // already expired

  // Notify 1 day before expiry, or 2h before if expiring within 24h
  let triggerMs: number;
  if (msLeft <= MS_2H) return; // too close, don't bother
  if (msLeft <= MS_1D) {
    triggerMs = msLeft - MS_2H;
  } else {
    triggerMs = msLeft - MS_1D;
  }

  const isUrgent = msLeft <= MS_1D;
  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: isUrgent
          ? t('notifications.localExpiry.urgentTitle')
          : t('notifications.localExpiry.title'),
        body: isUrgent
          ? t('notifications.localExpiry.urgentBody', { name: item.foodName })
          : t('notifications.localExpiry.body', { name: item.foodName }),
        data: { itemId: item.id },
      },
      trigger: { seconds: Math.floor(triggerMs / 1000), repeats: false },
    });
    storeNotifId(item.id, notifId);
  } catch {
    // Notification permission not granted — silent fail
  }
}

export async function cancelExpiryNotification(itemId: string): Promise<void> {
  const existing = getStoredNotifId(itemId);
  if (existing) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing);
    } catch {
      // Already fired or never registered
    }
    clearStoredNotifId(itemId);
  }
}

export async function rescheduleAllNotifications(items: Item[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  storage.clearAll();
  for (const item of items) {
    if (item.status === 'active' || item.status === 'partial') {
      await scheduleExpiryNotification(item);
    }
  }
}
