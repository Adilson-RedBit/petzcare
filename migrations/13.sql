-- Migration 13: Tabela de OTP persistente + UNIQUE constraint em agendamentos
-- Resolve C-4 (OTP em memória não funciona em Workers stateless)
-- Resolve A-2 (race condition em booking)

-- 1) Tabela para armazenar códigos OTP no D1 (em vez de Map em memória)
CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_codes(identifier);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- 2) UNIQUE parcial para impedir 2 agendamentos no mesmo horário (ativos)
-- SQLite suporta índice único parcial via WHERE clause
CREATE UNIQUE INDEX IF NOT EXISTS uniq_appointment_slot
  ON appointments(appointment_date, appointment_time)
  WHERE status != 'cancelado';

-- 3) Índice extra para rate limit cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
