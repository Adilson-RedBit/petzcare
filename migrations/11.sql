-- Migration 11: Adicionar tabela de sessões de usuário para autenticação segura
-- Esta migration adiciona suporte para armazenar tokens JWT no banco de dados

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
-- Índice para limpeza de sessões expiradas
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
-- Índice para buscar sessões de um usuário
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Adicionar constraint UNIQUE em professionals.email se não existir
-- (Verificar se já existe antes de adicionar)
-- SQLite não suporta ALTER TABLE ADD CONSTRAINT, então vamos criar uma nova tabela se necessário

-- Adicionar constraint CHECK em appointments.status
-- SQLite não suporta ALTER TABLE ADD CONSTRAINT diretamente
-- Isso será feito em uma migration futura se necessário





















