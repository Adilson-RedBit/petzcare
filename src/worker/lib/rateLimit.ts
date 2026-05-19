/**
 * Rate limiting persistido no D1 (tabela `rate_limits`).
 * Fail-open: se houver erro de DB, permite a requisição mas loga.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function generateRateLimitKey(ip: string, endpoint: string, prefix: string): string {
  return `${prefix}:${endpoint}:${ip}`;
}

export async function checkRateLimit(
  db: D1Database,
  ip: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = generateRateLimitKey(ip, config.keyPrefix, 'ratelimit');
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + config.windowSeconds;

  try {
    const existing = await db
      .prepare('SELECT requests, reset_at FROM rate_limits WHERE key = ? AND reset_at > ?')
      .bind(key, now)
      .first<{ requests: number; reset_at: number }>();

    if (existing) {
      const requests = existing.requests || 0;
      if (requests >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: existing.reset_at };
      }
      await db
        .prepare(
          'UPDATE rate_limits SET requests = requests + 1, last_request_at = ? WHERE key = ?',
        )
        .bind(now, key)
        .run();
      return {
        allowed: true,
        remaining: config.maxRequests - requests - 1,
        resetAt: existing.reset_at,
      };
    }

    await db
      .prepare(
        `INSERT INTO rate_limits (key, requests, reset_at, last_request_at)
         VALUES (?, 1, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           requests = 1, reset_at = ?, last_request_at = ?`,
      )
      .bind(key, resetAt, now, resetAt, now)
      .run();

    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  } catch (error) {
    console.error('Erro ao verificar rate limit:', error);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }
}

export async function cleanupRateLimits(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  try {
    await db.prepare('DELETE FROM rate_limits WHERE reset_at < ?').bind(now).run();
  } catch (error) {
    console.error('Erro ao limpar rate limits:', error);
  }
}

export const RATE_LIMIT_CONFIGS = {
  login: { maxRequests: 5, windowSeconds: 60, keyPrefix: 'login' },
  register: { maxRequests: 3, windowSeconds: 300, keyPrefix: 'register' },
  appointment: { maxRequests: 10, windowSeconds: 60, keyPrefix: 'appointment' },
  general: { maxRequests: 100, windowSeconds: 60, keyPrefix: 'general' },
} as const;
