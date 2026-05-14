/**
 * Cliente HTTP centralizado para a SPA.
 *
 * - `credentials: 'include'` faz o navegador enviar o cookie httpOnly `auth_token`
 *   automaticamente em chamadas same-origin, sem expor o JWT pra JS.
 * - Trata 401 globalmente disparando um evento que o useAuth escuta pra fazer logout.
 * - Trata 429 (rate limit) e 503 (worker indisponível) com mensagens amigáveis.
 */

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export const apiEvents = {
  unauthorized: new EventTarget(),
};

async function request<T>(
  path: string,
  options: RequestInit & { skipJson?: boolean } = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch (err) {
    throw new ApiError(0, "Sem conexão com o servidor.", { cause: err });
  }

  if (response.status === 401) {
    // Dispara para qualquer listener (useAuth) limpar o estado e redirecionar
    apiEvents.unauthorized.dispatchEvent(new Event("unauthorized"));
    throw new ApiError(401, "Sessão expirada. Faça login novamente.", null);
  }

  if (options.skipJson) {
    return undefined as unknown as T;
  }

  // Algumas rotas retornam 204
  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data as any).error) ||
      `Erro ${response.status}`;
    throw new ApiError(response.status, message, data);
  }
  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
