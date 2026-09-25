/** Token-bucket rate limiter keyed by an arbitrary string (identity, IP, socket id…). */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {}

  take(key: string, cost = 1): boolean {
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, at: t };
    b.tokens = Math.min(this.capacity, b.tokens + ((t - b.at) / 1000) * this.refillPerSecond);
    b.at = t;
    if (b.tokens < cost) {
      this.buckets.set(key, b);
      return false;
    }
    b.tokens -= cost;
    this.buckets.set(key, b);
    if (this.buckets.size > 10_000) this.sweep();
    return true;
  }

  /** Drops buckets that have fully refilled. */
  sweep(): void {
    const t = this.now();
    for (const [key, b] of this.buckets) {
      if (b.tokens + ((t - b.at) / 1000) * this.refillPerSecond >= this.capacity) this.buckets.delete(key);
    }
  }
}

export const limits = {
  guestCreate: new RateLimiter(20, 1 / 30),
  faceUpload: new RateLimiter(8, 1 / 20),
  roomCreate: new RateLimiter(10, 1 / 60),
  roomJoin: new RateLimiter(20, 0.5),
  action: new RateLimiter(25, 12),
  // A short burst, then about one message every 2.5 s.
  chat: new RateLimiter(4, 0.4),
  // Two in a row, then one every 3 s.
  reaction: new RateLimiter(2, 1 / 3),
  lobby: new RateLimiter(20, 2),
};
