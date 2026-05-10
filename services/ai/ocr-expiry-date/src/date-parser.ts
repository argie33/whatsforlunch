/**
 * Parse dates from OCR text results.
 * Handles common date formats used on food packaging.
 */

const DATE_PATTERNS = [
  // MM/DD/YYYY or M/D/YYYY
  { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, format: 'mdy' },
  // DD/MM/YYYY or D/M/YYYY
  { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2})/, format: 'dmy-short' },
  // YYYY-MM-DD
  { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, format: 'ymd' },
  // Month day, year (May 15, 2026)
  { regex: /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?/, format: 'mdy-text' },
];

const KEYWORDS = ['USE BY', 'SELL BY', 'BEST BY', 'BEST BEFORE', 'EXPIRES', 'EXPIRY', 'CONSUME BY', 'SBY', 'BB'];

export interface ParsedDate {
  text: string;
  date: Date;
  confidence: number;
  keywordMatch: boolean;
}

export function parseDate(text: string): ParsedDate | null {
  const cleanText = text.trim();

  // Check for keyword match (higher confidence)
  const hasKeyword = KEYWORDS.some((kw) => cleanText.toUpperCase().includes(kw));

  for (const pattern of DATE_PATTERNS) {
    const match = cleanText.match(pattern.regex);
    if (!match) continue;

    let date: Date | null = null;

    if (pattern.format === 'mdy') {
      // MM/DD/YYYY
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);

      if (isValidDate(year, month, day)) {
        date = new Date(year, month, day, 23, 59, 59);
      }
    } else if (pattern.format === 'ymd') {
      // YYYY-MM-DD
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);

      if (isValidDate(year, month, day)) {
        date = new Date(year, month, day, 23, 59, 59);
      }
    } else if (pattern.format === 'mdy-text') {
      // Month day, year
      const monthName = match[1];
      const day = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();

      const month = parseMonthName(monthName);
      if (month !== null && isValidDate(year, month, day)) {
        date = new Date(year, month, day, 23, 59, 59);
      }
    }

    if (date && isPlausibleExpiryDate(date)) {
      return {
        text: cleanText,
        date,
        confidence: hasKeyword ? 0.95 : 0.75,
        keywordMatch: hasKeyword,
      };
    }
  }

  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 0 || month > 11) return false;
  if (day < 1 || day > 31) return false;
  if (year < 2000 || year > 2050) return false;

  const date = new Date(year, month, day);
  return date.getMonth() === month && date.getDate() === day;
}

function isPlausibleExpiryDate(date: Date): boolean {
  const now = new Date();
  const minDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const maxDate = new Date(now.getTime() + 5 * 365 * 24 * 60 * 60 * 1000); // 5 years from now

  return date >= minDate && date <= maxDate;
}

function parseMonthName(name: string): number | null {
  const months: { [key: string]: number } = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };

  const key = name.toLowerCase();
  return months[key] ?? null;
}
