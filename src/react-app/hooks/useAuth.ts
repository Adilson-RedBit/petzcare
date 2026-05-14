import { useCallback, useEffect, useState } from "react";
import { api, ApiError, apiEvents } from "@/react-app/lib/apiClient";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "professional" | "admin";
}

interface MeResponse {
  user: AuthUser;
}
interface LoginResponse {
  success: boolean;
  user: AuthUser;
  jwt?: string;
}

/**
 * Hook de autenticação real (substitui o esquema legado client-side com
 * senha no localStorage). O JWT vive em cookie httpOnly setado pelo worker,
 * inacessível ao JS. A SPA não armazena senha nem token.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<MeResponse>("/auth/me");
      setUser(data.user);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        setUser(null);
        setError(err instanceof Error ? err.message : "Erro ao validar sessão");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega usuário ao montar e escuta evento de "unauthorized" do apiClient
  useEffect(() => {
    refresh();
    const handler = () => setUser(null);
    apiEvents.unauthorized.addEventListener("unauthorized", handler);
    return () =>
      apiEvents.unauthorized.removeEventListener("unauthorized", handler);
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const data = await api.post<LoginResponse>("/auth/login", {
          email,
          password,
        });
        setUser(data.user);
        return data.user;
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Erro ao fazer login";
        setError(msg);
        throw err;
      }
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      setError(null);
      try {
        const data = await api.post<LoginResponse>("/auth/register", {
          email,
          password,
          name,
        });
        setUser(data.user);
        return data.user;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Erro ao criar conta";
        setError(msg);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* mesmo se falhar, limpar o estado */
    }
    setUser(null);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    refresh,
  };
}
