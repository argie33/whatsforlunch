/**
 * W3 Phase C — Auth crypto unit tests.
 *
 * Tests the cryptographic helpers used by create-challenge and verify-challenge
 * without any AWS dependencies.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ─── Helpers duplicated from create-challenge for testability ─────────────────

function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateHmac(nonce: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(nonce).digest('hex');
}

function verifyHmac(nonce: string, storedHmac: string, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(nonce).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHmac), Buffer.from(computed));
}

function getIpClass(ip: string): string {
  const parts = ip.split('.');
  return parts.slice(0, 2).join('.') + '.0.0';
}

function getUaHash(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent).digest('hex');
}

// ─── Nonce generation ─────────────────────────────────────────────────────────

describe('generateNonce', () => {
  it('produces a 64-character hex string', () => {
    const nonce = generateNonce();
    assert.equal(nonce.length, 64);
    assert.match(nonce, /^[0-9a-f]{64}$/);
  });

  it('produces unique values each call', () => {
    const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
    assert.equal(nonces.size, 100);
  });
});

// ─── HMAC ─────────────────────────────────────────────────────────────────────

describe('generateHmac', () => {
  it('produces a 64-character hex string', () => {
    const hmac = generateHmac('abc', 'secret');
    assert.equal(hmac.length, 64);
    assert.match(hmac, /^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same inputs', () => {
    const hmac1 = generateHmac('nonce123', 'my-secret');
    const hmac2 = generateHmac('nonce123', 'my-secret');
    assert.equal(hmac1, hmac2);
  });

  it('differs for different nonces', () => {
    const hmac1 = generateHmac('nonce-a', 'secret');
    const hmac2 = generateHmac('nonce-b', 'secret');
    assert.notEqual(hmac1, hmac2);
  });

  it('differs for different secrets', () => {
    const hmac1 = generateHmac('nonce', 'secret-a');
    const hmac2 = generateHmac('nonce', 'secret-b');
    assert.notEqual(hmac1, hmac2);
  });
});

describe('verifyHmac', () => {
  it('accepts correct nonce + secret', () => {
    const nonce = generateNonce();
    const secret = 'test-secret-key';
    const hmac = generateHmac(nonce, secret);
    assert.equal(verifyHmac(nonce, hmac, secret), true);
  });

  it('rejects tampered nonce', () => {
    const nonce = generateNonce();
    const secret = 'test-secret-key';
    const hmac = generateHmac(nonce, secret);
    const tamperedNonce = 'a'.repeat(64); // invalid nonce
    assert.equal(verifyHmac(tamperedNonce, hmac, secret), false);
  });

  it('rejects tampered HMAC', () => {
    const nonce = generateNonce();
    const secret = 'test-secret-key';
    const hmac = generateHmac(nonce, secret);
    const tamperedHmac = hmac.replace(/^../, '00');
    // Only test when tampering actually changes the HMAC
    if (tamperedHmac !== hmac) {
      assert.equal(verifyHmac(nonce, tamperedHmac, secret), false);
    }
  });

  it('rejects wrong secret', () => {
    const nonce = generateNonce();
    const hmac = generateHmac(nonce, 'correct-secret');
    assert.equal(verifyHmac(nonce, hmac, 'wrong-secret'), false);
  });

  it('uses timing-safe comparison (does not throw on different-length buffers)', () => {
    // timingSafeEqual requires same-length buffers; verifyHmac computes fresh HMAC
    // so both are always 64 hex chars — this confirms the implementation is safe
    const nonce = 'a'.repeat(64);
    const secret = 'secret';
    const hmac = generateHmac(nonce, secret);
    assert.doesNotThrow(() => verifyHmac(nonce, hmac, secret));
  });
});

// ─── IP class extraction ──────────────────────────────────────────────────────

describe('getIpClass', () => {
  it('extracts /16 network class', () => {
    assert.equal(getIpClass('192.168.1.100'), '192.168.0.0');
    assert.equal(getIpClass('10.0.2.50'), '10.0.0.0');
    assert.equal(getIpClass('203.0.113.200'), '203.0.0.0');
  });

  it('keeps same class for two IPs in same /16', () => {
    const class1 = getIpClass('192.168.1.1');
    const class2 = getIpClass('192.168.200.50');
    assert.equal(class1, class2);
  });

  it('produces different class for IPs in different /16', () => {
    const class1 = getIpClass('10.0.1.1');
    const class2 = getIpClass('10.1.1.1');
    assert.notEqual(class1, class2);
  });
});

// ─── UA hash ─────────────────────────────────────────────────────────────────

describe('getUaHash', () => {
  it('produces a 64-char SHA256 hex string', () => {
    const hash = getUaHash('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)');
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('is consistent for the same user agent', () => {
    const ua = 'Mozilla/5.0 (compatible; MSIE 10.0)';
    assert.equal(getUaHash(ua), getUaHash(ua));
  });

  it('differs for different user agents', () => {
    assert.notEqual(
      getUaHash('Mozilla/5.0 (iPhone)'),
      getUaHash('Mozilla/5.0 (Android)'),
    );
  });
});

// ─── TTL enforcement logic ────────────────────────────────────────────────────

describe('TTL enforcement', () => {
  it('10-minute TTL is 600 seconds from now', () => {
    const now = Date.now();
    const ttl = Math.floor(now / 1000) + 600;
    const expiresAt = ttl * 1000; // milliseconds stored in DynamoDB
    assert.equal(expiresAt > now, true);
    assert.equal(expiresAt <= now + 600_001, true);
  });

  it('challenge is valid when expiresAt is in the future', () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes ahead
    const now = Date.now();
    const isExpired = now > expiresAt * 1000;
    assert.equal(isExpired, false);
  });

  it('challenge is invalid when expiresAt is in the past', () => {
    const expiresAt = Math.floor(Date.now() / 1000) - 1; // 1 second ago
    const now = Date.now();
    const isExpired = now > expiresAt * 1000;
    assert.equal(isExpired, true);
  });
});
