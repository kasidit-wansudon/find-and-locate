import { Context, Next } from 'hono';
import type { Env } from '../../types/env';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple rate limiter using KV
 * 60 requests per minute per IP
 */
export function rateLimiter(limit = 60, windowMs = 60_000) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const key = `rl:${ip}`;

    try {
      const stored = await c.env.CACHE.get(key, 'json') as RateLimitEntry | null;
      const now = Date.now();

      if (stored && now < stored.resetAt) {
        if (stored.count >= limit) {
          c.header('X-RateLimit-Limit', String(limit));
          c.header('X-RateLimit-Remaining', '0');
          c.header('Retry-After', String(Math.ceil((stored.resetAt - now) / 1000)));
          return c.json({ success: false, error: 'Too many requests' }, 429);
        }
        await c.env.CACHE.put(key, JSON.stringify({
          count: stored.count + 1,
          resetAt: stored.resetAt,
        }), { expirationTtl: Math.ceil(windowMs / 1000) });
      } else {
        await c.env.CACHE.put(key, JSON.stringify({
          count: 1,
          resetAt: now + windowMs,
        }), { expirationTtl: Math.ceil(windowMs / 1000) });
      }
    } catch {
      // If KV fails, allow request through
    }

    await next();
  };
}
