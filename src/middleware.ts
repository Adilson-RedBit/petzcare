import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt";

/**
 * Middleware Next.js — resolve C-3 da auditoria.
 * Antes: apenas verificava se o cookie EXISTIA (qualquer string passava).
 * Agora: valida a assinatura JWT real.
 *
 * Importante: este middleware roda em Edge Runtime, então JWT_SECRET
 * precisa estar configurado nas env vars do projeto Next.js (Cloudflare
 * Pages: Settings → Environment Variables).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("auth_token");

  let isValid = false;
  if (tokenCookie?.value) {
    try {
      const payload = await verifyJWT(tokenCookie.value);
      isValid = payload !== null;
    } catch {
      isValid = false;
    }
  }

  // Proteger área profissional
  if (pathname.startsWith("/professional")) {
    if (!isValid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      // Se token estava presente mas inválido, limpa o cookie
      if (tokenCookie) response.cookies.delete("auth_token");
      return response;
    }
  }

  // Já autenticado? Não faz sentido ir pra /login
  if (pathname === "/login" && isValid) {
    return NextResponse.redirect(new URL("/professional", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/professional/:path*", "/login"],
};
