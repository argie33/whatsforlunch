export interface SearchOptions {
  threshold?: number;
  keys?: string[];
  includeScore?: boolean;
}

export interface SearchResult<T> {
  item: T;
  score: number;
  matches: string[];
}

export function searchItems<T extends Record<string, any>>(
  items: T[],
  query: string,
  options: SearchOptions = {},
): SearchResult<T>[] {
  const { threshold = 0.3, keys = [], includeScore = true } = options;

  if (!query.trim()) {
    return items.map((item) => ({ item, score: 1, matches: [] }));
  }

  const normalizedQuery = normalizeString(query);
  const results: SearchResult<T>[] = [];

  for (const item of items) {
    let bestScore = 0;
    const matches: string[] = [];

    const fieldsToSearch = keys.length > 0 ? keys : Object.keys(item);

    for (const key of fieldsToSearch) {
      const value = String(item[key] || '');
      const normalizedValue = normalizeString(value);

      const score = calculateScore(normalizedQuery, normalizedValue);

      if (score > bestScore) {
        bestScore = score;
        matches.length = 0;
      }

      if (score > threshold) {
        if (!matches.includes(key)) {
          matches.push(key);
        }
      }
    }

    if (bestScore > threshold) {
      results.push({
        item,
        score: bestScore,
        matches,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function filterItems<T extends Record<string, any>>(
  items: T[],
  filterFn: (item: T, index: number) => boolean,
): T[] {
  return items.filter(filterFn);
}

export function groupItems<T extends Record<string, any>>(
  items: T[],
  groupByKey: string,
): Record<string, T[]> {
  return items.reduce(
    (groups, item) => {
      const key = String(item[groupByKey] || 'other');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
}

export function sortItems<T extends Record<string, any>>(
  items: T[],
  sortByKey: string,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[sortByKey];
    const bVal = b[sortByKey];

    if (aVal < bVal) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return items.slice(start, end);
}

export function getPaginationInfo(totalItems: number, pageSize: number, currentPage: number) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    hasNextPage,
    hasPrevPage,
    start: (currentPage - 1) * pageSize + 1,
    end: Math.min(currentPage * pageSize, totalItems),
  };
}

export function deduplicate<T extends Record<string, any>>(items: T[], key: string): T[] {
  const seen = new Set();
  return items.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function calculateScore(query: string, text: string): number {
  if (text === query) return 1;
  if (text.startsWith(query)) return 0.9;
  if (text.includes(` ${query}`)) return 0.8;
  if (text.includes(query)) return 0.7;

  const queryWords = query.split(' ');
  const textWords = text.split(' ');
  const matches = queryWords.filter((word) => textWords.some((tw) => tw.startsWith(word)));

  return (matches.length / queryWords.length) * 0.6;
}

export function createSearchIndex<T extends Record<string, any>>(
  items: T[],
  keys: string[],
): Map<string, T[]> {
  const index = new Map<string, T[]>();

  for (const item of items) {
    for (const key of keys) {
      const value = String(item[key] || '').toLowerCase();
      const words = value.split(/\s+/);

      for (const word of words) {
        if (word.length > 0) {
          if (!index.has(word)) {
            index.set(word, []);
          }
          const existing = index.get(word)!;
          if (!existing.includes(item)) {
            existing.push(item);
          }
        }
      }
    }
  }

  return index;
}

export function searchUsingIndex<T>(query: string, index: Map<string, T[]>): T[] {
  const words = normalizeString(query).split(' ');
  const results = new Set<T>();

  for (const word of words) {
    const items = index.get(word) || [];
    for (const item of items) {
      results.add(item);
    }
  }

  return Array.from(results);
}
