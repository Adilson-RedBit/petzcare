import { Context } from "hono";

export async function rateLimit(c: Context, key: string, limit: number, windowSeconds: number) {
  const db = (c.env as any).DB;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  // Limpar registros antigos
  await db.prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(windowStart).run();

  // Contar requisições recentes
  const result = await db.prepare(
    "SELECT count FROM rate_limits WHERE identifier = ? AND reset_at > ?"
  ).bind(key, windowStart).first() as { count: number } | null;

  const count = result ? result.count : 0;

  if (count >= limit) {
    return false;
  }

  // Atualizar ou inserir contador
  if (result) {
    await db.prepare(
      "UPDATE rate_limits SET count = count + 1 WHERE identifier = ? AND reset_at > ?"
    ).bind(key, windowStart).run();
  } else {
    await db.prepare(
      "INSERT INTO rate_limits (identifier, count, reset_at) VALUES (?, 1, ?)"
    ).bind(key, now + windowSeconds).run();
  }

  return true;
}
