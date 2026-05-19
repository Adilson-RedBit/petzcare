/**
 * Helpers de autenticação no Worker:
 * - extractToken: lê JWT do cabeçalho Authorization ou cookie auth_token
 * - createSession: gera JWT, grava hash em user_sessions
 * - invalidateSession: remove sessão (logout)
 * - validateSession: garante que JWT existe E sessão ativa no banco
 */

import { generateJWT, verifyJWT, hashToken, JWTPayload } from "./jwt";

export interface Session {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  tokenHash: string;
}

/**
 * Extrai o JWT bruto da requisição. Procura primeiro em
 * Authorization: Bearer <token>, depois em cookie auth_token.
 */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.substring(7).trim();
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const c of cookies) {
      const [name, ...rest] = c.split("=");
      if (name === "auth_token") {
        return decodeURIComponent(rest.join("="));
      }
    }
  }
  return null;
}

/**
 * Cria nova sessão: gera JWT e armazena hash no D1.
 */
export async function createSession(
  db: D1Database,
  user: { id: number; email: string; name: string; role: string },
  request: Request,
  expiresInSeconds: number = 60 * 60 * 24 * 7
): Promise<{ jwt: string; tokenHash: string }> {
  const jwt = await generateJWT(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expiresInSeconds
  );
  const tokenHash = await hashToken(jwt);
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  const ua = request.headers.get("user-agent") || "unknown";

  await db
    .prepare(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, datetime(?, 'unixepoch'), ?, ?)`
    )
    .bind(user.id, tokenHash, expiresAt, ip, ua)
    .run();

  return { jwt, tokenHash };
}

/**
 * Remove sessão do banco. Usado no logout.
 */
export async function invalidateSession(
  db: D1Database,
  tokenHash: string
): Promise<void> {
  await db
    .prepare("DELETE FROM user_sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .run();
}

/**
 * Valida JWT E confirma que existe sessão ativa não-revogada no banco.
 * Retorna payload ou null.
 */
export async function validateSession(
  db: D1Database,
  token: string
): Promise<{ payload: JWTPayload; tokenHash: string } | null> {
  const payload = await verifyJWT(token);
  if (!payload) return null;

  const tokenHash = await hashToken(token);
  const session = await db
    .prepare(
      `SELECT id, expires_at FROM user_sessions
       WHERE token_hash = ? AND datetime(expires_at) > datetime('now')`
    )
    .bind(tokenHash)
    .first();

  if (!session) return null;

  // Atualizar last_used_at (não bloquear request por causa disso)
  db.prepare(
    "UPDATE user_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = ?"
  )
    .bind(tokenHash)
    .run()
    .catch(() => {
      /* ignore */
    });

  return { payload, tokenHash };
}
