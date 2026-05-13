/**
 * @deprecated Este arquivo foi substituído pela estrutura em
 *   - src/worker/lib/auth.ts          (sessão + JWT)
 *   - src/lib/password.ts             (hash PBKDF2)
 *   - src/worker/middleware/authMiddleware.ts (Hono middleware)
 *
 * Mantido como re-export para não quebrar imports antigos.
 * Pode ser deletado quando confirmar que nenhum import legacy existe.
 */

export {
  createSession,
  invalidateSession,
  validateSession,
  extractToken,
} from "./lib/auth";

export {
  hashPassword,
  verifyPassword,
  validatePasswordComplexity,
} from "../lib/password";

export { requireAuth } from "./middleware/authMiddleware";
