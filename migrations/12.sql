-- Migration 12: Adicionar tabela de rate limiting
-- Esta migration adiciona suporte para rate limiting de requisições

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL,
  last_request_at INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para limpeza de registros expirados
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

-- Limpar registros expirados periodicamente (executar manualmente ou via cron)
-- DELETE FROM rate_limits WHERE reset_at < unixepoch('now');





















