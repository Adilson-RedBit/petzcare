/**
 * Middleware Hono para autenticação JWT.
 * Resolve C-1: o worker não tinha NENHUMA autenticação.
 *
 * Uso:
 *   app.use("/api/admin/*", requireAuth());
 *   app.use("/api/appointments/:id/*", requireAuth());
 *
 * Disponibiliza `c.get("user")` nas rotas protegidas.
 */

import type { Context, MiddlewareHandler } from "hono";
import { extractToken, validateSession } from "../lib/auth";
import type { JWTPayload } from "../lib/jwt";

declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload;
    tokenHash: string;
  }
}

export function requireAuth(options?: {
  requiredRole?: "admin" | "professional";
}): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const token = extractToken(c.req.raw);
    if (!token) {
      return c.json({ error: "Não autenticado" }, 401);
    }

    const result = await validateSession(c.env.DB, token, c.env.JWT_SECRET);
    if (!result) {
      return c.json({ error: "Sessão inválida ou expirada" }, 401);
    }

    if (options?.requiredRole && result.payload.role !== options.requiredRole) {
      // admin pode acessar tudo de profissional, mas não o contrário
      if (
        !(options.requiredRole === "professional" && result.payload.role === "admin")
      ) {
        return c.json({ error: "Permissão insuficiente" }, 403);
      }
    }

    c.set("user", result.payload);
    c.set("tokenHash", result.tokenHash);
    await next();
  };
}

/**
 * Helper para uso em rotas que NÃO usam o middleware mas precisam saber
 * se o usuário está autenticado (rotas mistas público/privado).
 */
export async function getOptionalUser(
  c: Context<{ Bindings: Env }>
): Promise<JWTPayload | null> {
  const token = extractToken(c.req.raw);
  if (!token) return null;
  const result = await validateSession(c.env.DB, token, c.env.JWT_SECRET);
  return result?.payload ?? null;
}
