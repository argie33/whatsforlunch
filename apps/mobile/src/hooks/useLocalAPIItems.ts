import { useEffect, useState } from 'react';
import { getItemsFromAPI } from '@/lib/local-api-client';

export interface APIItem {
  id: string;
  foodName: string;
  storageLocation: string;
  expiryAt: string;
  category: string;
}

export function useLocalAPIItems(householdId: string | null) {
  const [items, setItems] = useState<APIItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const result = await getItemsFromAPI(householdId);
      if (Array.isArray(result)) {
        setItems(result);
        setError(null);
      } else {
        setError('Failed to fetch items');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [householdId]);

  return { items, loading, error, refresh: fetchItems };
}
