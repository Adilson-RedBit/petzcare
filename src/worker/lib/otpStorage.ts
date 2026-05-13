/**
 * Armazenamento de códigos OTP em D1 (não em memória).
 * Resolve C-4 da auditoria: o Map em src/lib/otp.ts não persiste
 * entre invocações do Worker (que é stateless).
 *
 * Tabela `otp_codes` definida em migrations/13.sql.
 *
 * Segurança:
 * - O código é armazenado como HASH (SHA-256), nunca em claro.
 * - Limite de 5 tentativas por código antes de invalidar.
 * - Expiração default: 5 minutos.
 */

const MAX_ATTEMPTS = 5;
const DEFAULT_TTL_SECONDS = 300;

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function generateAndStoreOtp(
  db: D1Database,
  identifier: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string> {
  // Gerar código de 6 dígitos seguro
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const code = (buf[0] % 1_000_000).toString().padStart(6, "0");
  const codeHash = await sha256Hex(code);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

  // Invalidar códigos anteriores não utilizados para o mesmo identifier
  await db
    .prepare(
      "UPDATE otp_codes SET used_at = CURRENT_TIMESTAMP WHERE identifier = ? AND used_at IS NULL"
    )
    .bind(identifier)
    .run();

  await db
    .prepare(
      `INSERT INTO otp_codes (identifier, code_hash, attempts, expires_at)
       VALUES (?, ?, 0, ?)`
    )
    .bind(identifier, codeHash, expiresAt)
    .run();

  return code;
}

export async function verifyOtp(
  db: D1Database,
  identifier: string,
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT id, code_hash, attempts, expires_at
       FROM otp_codes
       WHERE identifier = ? AND used_at IS NULL
       ORDER BY id DESC
       LIMIT 1`
    )
    .bind(identifier)
    .first<{ id: number; code_hash: string; attempts: number; expires_at: number }>();

  if (!row) {
    return { valid: false, reason: "Código não encontrado ou já utilizado" };
  }
  if (row.expires_at < now) {
    return { valid: false, reason: "Código expirado" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await db
      .prepare("UPDATE otp_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(row.id)
      .run();
    return { valid: false, reason: "Muitas tentativas. Solicite um novo código." };
  }

  const candidateHash = await sha256Hex(code);
  if (candidateHash !== row.code_hash) {
    await db
      .prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?")
      .bind(row.id)
      .run();
    return { valid: false, reason: "Código incorreto" };
  }

  // Sucesso — marcar como usado
  await db
    .prepare("UPDATE otp_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(row.id)
    .run();
  return { valid: true };
}

/**
 * Limpa códigos OTP expirados. Executar periodicamente (ex: cron).
 */
export async function cleanupExpiredOtps(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("DELETE FROM otp_codes WHERE expires_at < ?").bind(now).run();
}
