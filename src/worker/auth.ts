import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyJWT } from "../lib/jwt";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const cookieToken = getCookie(c, "auth_token");
  
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : cookieToken;

  if (!token) {
    return c.json({ error: "Unauthorized: No token provided" }, 401);
  }

  try {
    const secret = (c.env as any).JWT_SECRET || "dev-secret-key-for-local-development-only-K8j3mN9pQ2rT5vX8zA1bC4dE7fG0hI3jK6mN9pQ2rT5vX8zA1bC4dE7fG0hI";
    const payload = await verifyJWT(token, secret);
    if (!payload) {
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }

    // Adiciona o payload ao contexto para uso posterior se necessário
    c.set("jwtPayload", payload);
    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized: Authentication failed" }, 401);
  }
}
