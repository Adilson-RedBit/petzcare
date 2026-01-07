import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyJWT } from "../lib/jwt";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const cookieToken = getCookie(c, "auth_token");
  
  console.log("Auth Middleware - Cookie present:", !!cookieToken);
  console.log("Auth Middleware - Header present:", !!authHeader);

  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : cookieToken;

  if (!token) {
    console.error("Auth Middleware - No token found");
    return c.json({ error: "Unauthorized: No token provided" }, 401);
  }

  try {
    const secret = (c.env as any).JWT_SECRET || "dev-secret-key-for-local-development-only-K8j3mN9pQ2rT5vX8zA1bC4dE7fG0hI3jK6mN9pQ2rT5vX8zA1bC4dE7fG0hI";
    const payload = await verifyJWT(token, secret);
    
    if (!payload) {
      console.error("Auth Middleware - Invalid token");
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }

    c.set("jwtPayload", payload);
    await next();
  } catch (error: any) {
    console.error("Auth Middleware - Error:", error.message);
    return c.json({ error: "Unauthorized: Authentication failed", message: error.message }, 401);
  }
}
