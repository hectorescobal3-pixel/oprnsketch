import Redis from 'ioredis';

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  totalRequests: number;
  remaining: number;
  resetSeconds: number;
}

export class DistributedRateLimiter {
  constructor(private readonly redis: Redis) {}

  /**
   * Redis Sliding Window rate limiter using Sorted Sets (ZSET).
   * Key pattern: rl:{prefix}:{identifier}
   */
  public async consume(
    prefix: string,
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `rl:${prefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    const pipeline = this.redis.pipeline();
    // 1. Remove timestamps older than the sliding window
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    // 2. Count requests in the current window
    pipeline.zcard(key);
    // 3. Add the current timestamp as score and member
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    // 4. Set TTL to keep Redis memory bounded
    pipeline.expire(key, config.windowSeconds * 2);

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('REDIS_PIPELINE_ERROR: Failed to execute rate limit pipeline.');
    }

    const currentCount = (results[1][1] as number) || 0;
    const allowed = currentCount < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount - (allowed ? 1 : 0));

    return {
      allowed,
      totalRequests: currentCount + 1,
      remaining,
      resetSeconds: config.windowSeconds,
    };
  }

  // Pre-configured rate limits as per specification
  public static readonly AUTH_LIMIT: RateLimitConfig = { windowSeconds: 60, maxRequests: 5 }; // 5 req/min
  public static readonly OCR_LIMIT: RateLimitConfig = { windowSeconds: 60, maxRequests: 15 };  // 15 req/min
  public static readonly API_LIMIT: RateLimitConfig = { windowSeconds: 60, maxRequests: 120 }; // 120 req/min
}
