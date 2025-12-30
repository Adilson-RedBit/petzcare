/**
 * Sistema de Rate Limiting usando Cloudflare D1
 * Armazena contadores de requisições por IP/endpoint
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

/**
 * Gera chave única para rate limiting baseada em IP e endpoint
 */
function generateRateLimitKey(ip: string, endpoint: string, prefix: string): string {
  return `${prefix}:${endpoint}:${ip}`;
}

/**
 * Verifica e atualiza rate limit no banco de dados
 * @param db - Instância do banco D1
 * @param ip - IP do cliente
 * @param config - Configuração do rate limit
 * @returns Resultado do rate limit check
 */
export async function checkRateLimit(
  db: D1Database,
  ip: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = generateRateLimitKey(ip, config.keyPrefix, 'ratelimit');
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + config.windowSeconds;

  try {
    // Buscar registro existente
    const existing = await db.prepare(
      `SELECT requests, reset_at FROM rate_limits 
       WHERE key = ? AND reset_at > ?`
    ).bind(key, now).first();

    if (existing) {
      const requests = (existing.requests as number) || 0;
      
      if (requests >= config.maxRequests) {
        // Limite excedido
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.reset_at as number,
        };
      }

      // Incrementar contador
      await db.prepare(
        `UPDATE rate_limits 
         SET requests = requests + 1, last_request_at = ?
         WHERE key = ?`
      ).bind(now, key).run();

      return {
        allowed: true,
        remaining: config.maxRequests - requests - 1,
        resetAt: existing.reset_at as number,
      };
    } else {
      // Criar novo registro ou resetar expirado
      await db.prepare(
        `INSERT INTO rate_limits (key, requests, reset_at, last_request_at)
         VALUES (?, 1, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           requests = 1,
           reset_at = ?,
           last_request_at = ?`
      ).bind(key, resetAt, now, resetAt, now).run();

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }
  } catch (error) {
    console.error('Erro ao verificar rate limit:', error);
    // Em caso de erro, permitir requisição (fail-open para não bloquear usuários legítimos)
    // Mas logar o erro para investigação
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }
}

/**
 * Limpa registros expirados de rate limit
 * Deve ser executado periodicamente (ex: a cada hora)
 */
export async function cleanupRateLimits(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  try {
    await db.prepare(
      `DELETE FROM rate_limits WHERE reset_at < ?`
    ).bind(now).run();
  } catch (error) {
    console.error('Erro ao limpar rate limits expirados:', error);
  }
}

/**
 * Configurações padrão de rate limiting
 */
export const RATE_LIMIT_CONFIGS = {
  login: {
    maxRequests: 5,
    windowSeconds: 60, // 1 minuto
    keyPrefix: 'login',
  },
  register: {
    maxRequests: 3,
    windowSeconds: 300, // 5 minutos
    keyPrefix: 'register',
  },
  appointment: {
    maxRequests: 10,
    windowSeconds: 60, // 1 minuto
    keyPrefix: 'appointment',
  },
  general: {
    maxRequests: 100,
    windowSeconds: 60, // 1 minuto
    keyPrefix: 'general',
  },
} as const;





















