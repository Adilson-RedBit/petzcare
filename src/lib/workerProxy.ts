/**
 * Helper compartilhado para proxy entre Next.js e Cloudflare Worker.
 * Antes estava duplicado em ~15 route.ts (L-6 da auditoria).
 *
 * Preserva cookies, headers de autenticação e Content-Type corretamente.
 */

import { NextRequest } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://localhost:5173";

export interface ProxyOptions {
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
  forwardCookies?: boolean;
  forwardAuth?: boolean;
}

/**
 * Encaminha requisição para o worker, preservando cookies de autenticação.
 * @param request - request original do Next.js (para extrair cookies/headers)
 * @param path - caminho no worker (ex: "/api/auth/login")
 * @param options - método, body, headers
 */
export async function proxyToWorker(
  request: NextRequest | null,
  path: string,
  options: ProxyOptions = {}
): Promise<Response | null> {
  try {
    const headers: Record<string, string> = {};

    // Content-Type padrão (sobrescrito se body for FormData)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    // Repassar cookie (essencial para auth)
    if (request && options.forwardCookies !== false) {
      const cookie = request.headers.get("cookie");
      if (cookie) headers["Cookie"] = cookie;
    }

    // Repassar Authorization (caso o front use Bearer)
    if (request && options.forwardAuth !== false) {
      const auth = request.headers.get("authorization");
      if (auth) headers["Authorization"] = auth;
    }

    // Repassar IP real do cliente (para rate limiting)
    if (request) {
      const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip");
      if (ip) headers["X-Forwarded-For"] = ip;
    }

    // Merge com headers customizados
    Object.assign(headers, options.headers || {});

    const response = await fetch(`${WORKER_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });

    return response;
  } catch (error) {
    console.error(`[workerProxy] Falha ao chamar ${path}:`, error);
    return null;
  }
}

/**
 * Helper para retornar 503 padronizado quando o worker está indisponível.
 */
export function workerUnavailableResponse() {
  return Response.json(
    {
      error: "Serviço temporariamente indisponível. Tente novamente em instantes.",
    },
    { status: 503 }
  );
}
