-- Migration 15: Reset completo + schema final (auditoria 2026-05-13)
--
-- USE APENAS SE: os dados atuais são descartáveis (testes).
-- Esta migration apaga TUDO e recria com o schema final consolidado:
-- FK constraints, CHECK constraints, UNIQUE indexes, e tudo que as
-- migrations 1-14 deveriam ter resultado.
--
-- Executar com: wrangler d1 execute petcare-db --remote --file=./migrations/15_fresh_schema.sql
--
-- IMPORTANTE: D1 não aceita BEGIN TRANSACTION/COMMIT explícitos.
-- Cada statement abaixo é executado em sequência; se um falhar, o D1 retorna
-- o DB ao estado anterior automaticamente.

-- =============================================================
-- DROP de tudo (em ordem reversa de dependência)
-- =============================================================

DROP TABLE IF EXISTS appointment_services;
DROP TABLE IF EXISTS appointment_packages;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS service_pricing;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS working_hours;
DROP TABLE IF EXISTS business_config;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS professionals;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS otp_codes;

-- =============================================================
-- PROFESSIONALS (usuários autenticados)
-- =============================================================

CREATE TABLE professionals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'professional'
    CHECK (role IN ('professional','admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_professionals_email ON professionals(email);

-- =============================================================
-- USER_SESSIONS (revogação de JWT)
-- =============================================================

CREATE TABLE user_sessions (
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

CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);

-- =============================================================
-- SERVICES (catálogo)
-- =============================================================

CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 720),
  price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- SERVICE_PRICING (preço por porte)
-- =============================================================

CREATE TABLE service_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('pequeno','medio','grande')),
  base_price REAL NOT NULL CHECK (base_price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (service_id, size),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- =============================================================
-- PETS
-- =============================================================

CREATE TABLE pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  breed TEXT,
  size TEXT NOT NULL CHECK (size IN ('pequeno','medio','grande')),
  weight_kg REAL,
  age_years INTEGER,
  special_notes TEXT,
  photo_url TEXT,
  coat_condition TEXT CHECK (
    coat_condition IS NULL
    OR coat_condition IN ('excelente','bom','regular','ruim')
  ),
  coat_notes TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pets_name ON pets(name);

-- =============================================================
-- APPOINTMENTS
-- =============================================================

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL,
  service_id INTEGER,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_email TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('agendado','confirmado','em_andamento','concluido','cancelado')),
  total_price REAL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_pet ON appointments(pet_id);

-- UNIQUE parcial: impede 2 agendamentos no mesmo slot (excluindo cancelados)
CREATE UNIQUE INDEX uniq_appointment_slot
  ON appointments(appointment_date, appointment_time)
  WHERE status != 'cancelado';

-- =============================================================
-- APPOINTMENT_SERVICES (n:n)
-- =============================================================

CREATE TABLE appointment_services (
  appointment_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (appointment_id, service_id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX idx_appointment_services_appointment_id ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service_id ON appointment_services(service_id);

-- =============================================================
-- WORKING_HORAS
-- =============================================================

CREATE TABLE working_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  appointment_duration INTEGER NOT NULL DEFAULT 30 CHECK (appointment_duration > 0),
  break_start TEXT,
  break_end TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- BUSINESS_CONFIG (singleton, id=1)
-- =============================================================

CREATE TABLE business_config (
  id INTEGER PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT 'PetCare Agenda',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  description TEXT DEFAULT '',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#8B5CF6',
  business_hours_display TEXT DEFAULT '',
  professional_name TEXT DEFAULT '',
  banner_title TEXT DEFAULT 'Cuidamos do seu pet com carinho',
  banner_description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO business_config (id) VALUES (1);

-- =============================================================
-- RATE_LIMITS
-- =============================================================

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL,
  last_request_at INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limits_reset ON rate_limits(reset_at);

-- =============================================================
-- OTP_CODES (verificação temporária)
-- =============================================================

CREATE TABLE otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP
);

CREATE INDEX idx_otp_identifier ON otp_codes(identifier);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
