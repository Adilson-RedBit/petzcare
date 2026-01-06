import { Context, Next } from "hono";
import { verifyJWT } from "../lib/jwt";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const cookieToken = c.req.cookie("auth_token");
  
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : cookieToken;

  if (!token) {
    return c.json({ error: "Unauthorized: No token provided" }, 401);
  }

  try {
    const payload = await verifyJWT(token);
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
