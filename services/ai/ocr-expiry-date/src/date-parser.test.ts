import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseDate } from './date-parser';

describe('Date Parser', () => {
  it('should parse MM/DD/YYYY format', () => {
    const result = parseDate('05/15/2026');
    assert.ok(result, 'Should parse date');
    assert.equal(result!.date.getFullYear(), 2026);
    assert.equal(result!.date.getMonth(), 4); // May is month 4 (0-indexed)
    assert.equal(result!.date.getDate(), 15);
  });

  it('should parse YYYY-MM-DD format', () => {
    const result = parseDate('2026-05-15');
    assert.ok(result, 'Should parse ISO date');
    assert.equal(result!.date.getFullYear(), 2026);
    assert.equal(result!.date.getMonth(), 4);
    assert.equal(result!.date.getDate(), 15);
  });

  it('should parse "USE BY" keyword', () => {
    const result = parseDate('USE BY 05/15/26');
    assert.ok(result, 'Should parse USE BY date');
    assert.ok(result!.keywordMatch, 'Should detect keyword');
    assert.equal(result!.confidence, 0.95, 'Should have high confidence with keyword');
  });

  it('should parse month names', () => {
    const result = parseDate('May 15, 2026');
    assert.ok(result, 'Should parse month name');
    assert.equal(result!.date.getMonth(), 4);
    assert.equal(result!.date.getDate(), 15);
  });

  it('should parse abbreviated month names', () => {
    const result = parseDate('May 15');
    assert.ok(result, 'Should parse abbreviated format');
    assert.equal(result!.date.getMonth(), 4);
  });

  it('should reject invalid dates', () => {
    const result = parseDate('13/32/2026'); // Month 13, day 32
    assert.equal(result, null, 'Should reject invalid date');
  });

  it('should reject dates too far in the past', () => {
    const result = parseDate('01/01/1990');
    assert.equal(result, null, 'Should reject dates > 1 year in past');
  });

  it('should reject dates too far in the future', () => {
    const result = parseDate('12/31/2050');
    assert.equal(result, null, 'Should reject dates > 5 years in future');
  });

  it('should handle multiple date formats in same text', () => {
    const text = 'Manufactured 04/10/2026, Best By 05/15/2026';
    const result = parseDate(text);
    assert.ok(result, 'Should find a date in mixed text');
  });

  it('should prioritize keyword matches for confidence', () => {
    const withKeyword = parseDate('BEST BY 05/15/2026');
    const withoutKeyword = parseDate('05/15/2026');

    assert.ok(withKeyword && withoutKeyword);
    assert.equal(withKeyword.confidence, 0.95);
    assert.equal(withoutKeyword.confidence, 0.75);
  });

  it('should handle single digit dates', () => {
    const result = parseDate('5/1/2026');
    assert.ok(result);
    assert.equal(result!.date.getMonth(), 4);
    assert.equal(result!.date.getDate(), 1);
  });

  it('should handle 2-digit year with century inference', () => {
    const result = parseDate('05/15/26');
    assert.ok(result);
    assert.equal(result!.date.getFullYear(), 2026);
  });

  it('should return lowercase month for comparison', () => {
    const text1 = parseDate('DECEMBER 25, 2026');
    const text2 = parseDate('december 25, 2026');
    assert.ok(text1 && text2, 'Both should parse regardless of case');
    assert.equal(text1.date.getTime(), text2.date.getTime());
  });

  it('should handle "SELL BY" keyword', () => {
    const result = parseDate('SELL BY 06/20/2026');
    assert.ok(result);
    assert.ok(result!.keywordMatch);
  });

  it('should handle "EXPIRES" keyword', () => {
    const result = parseDate('EXPIRES 07/10/2026');
    assert.ok(result);
    assert.ok(result!.keywordMatch);
  });
});
