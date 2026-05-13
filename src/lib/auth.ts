import { cookies } from "next/headers";
import { verifyJWT } from "./jwt";

/**
 * Helpers de sessão usados pelas rotas Next.js.
 * Hashing de senha agora vive em src/lib/password.ts (PBKDF2 Web Crypto)
 * e a criação de sessão é feita pelo worker (A-7).
 */

export interface User {
  id: number;
  email: string;
  name: string;
  role: "professional" | "admin";
  created_at: string;
}

/**
 * Seta o cookie httpOnly com o JWT já emitido pelo worker.
 */
export async function setSessionCookie(jwt: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("user_email");
}

/**
 * Recupera usuário da sessão validando o JWT armazenado no cookie.
 * NÃO valida sessão no banco (isso é feito pelo worker em cada request real).
 * Para autenticação real de API, use o worker.
 */
export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  if (!token) return null;

  try {
    const payload = await verifyJWT(token.value);
    if (!payload) return null;
    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name || "",
      role: payload.role as "professional" | "admin",
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value ?? null;
}
