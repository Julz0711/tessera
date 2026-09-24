import { describe, expect, it } from 'vitest';
import { sanitizeChat, sanitizeName } from '@/shared/text';
import { normalizeCode } from '../rooms';
import { RateLimiter } from '../rateLimit';

process.env.AUTH_SECRET = 'unit-test-secret';

describe('guest tokens', async () => {
  const { signGuestId, verifyGuestToken, newGuestId, parseCookies } = await import('../identity');

  it('round-trips and rejects tampering', () => {
    const id = newGuestId();
    const token = signGuestId(id);
    expect(verifyGuestToken(token)).toBe(id);
    expect(verifyGuestToken(token.slice(0, -2) + 'xx')).toBeNull();
    expect(verifyGuestToken(`${newGuestId()}.${token.split('.')[1]}`)).toBeNull();
    expect(verifyGuestToken('not-a-uuid.abc')).toBeNull();
    expect(verifyGuestToken(undefined)).toBeNull();
  });

  it('parses cookie headers', () => {
    expect(parseCookies('a=1; guest_session=x%2Ey; b')).toEqual({ a: '1', guest_session: 'x.y' });
  });
});

describe('rate limiter', () => {
  it('allows bursts up to capacity and refills over time', () => {
    let now = 0;
    const rl = new RateLimiter(3, 1, () => now);
    expect([rl.take('k'), rl.take('k'), rl.take('k'), rl.take('k')]).toEqual([true, true, true, false]);
    expect(rl.take('other')).toBe(true);
    now = 1500;
    expect(rl.take('k')).toBe(true);
    expect(rl.take('k')).toBe(false);
  });
});

describe('input sanitising', () => {
  it('cleans names, chat and room codes', () => {
    expect(sanitizeName('  Al\u0000ex‮  the   Great, Destroyer of Worlds ')).toBe('Alex the Great, Dest');
    expect(sanitizeName('   ')).toBe('Player');
    expect(sanitizeChat('hi\nthere​')).toBe('hi there');
    expect(normalizeCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(normalizeCode('ABCDEFG0')).toBeNull();
    expect(normalizeCode(42)).toBeNull();
  });
});
