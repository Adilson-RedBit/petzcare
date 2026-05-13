-- Migration 14: Foreign keys e CHECK constraints (A-5 da auditoria 2026-05-13)
--
-- SQLite/D1 não suporta ALTER TABLE ADD CONSTRAINT diretamente. A estratégia é:
--  1) Criar tabela nova com as constraints corretas
--  2) Copiar dados
--  3) Dropar tabela antiga
--  4) Renomear nova
--  5) Recriar índices
--
-- IMPORTANTE: executar com PRAGMA foreign_keys=ON na sessão.
-- Em D1 use: wrangler d1 execute petcare-db --file=./migrations/14.sql

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- =============================================================
-- APPOINTMENTS — adicionar FK e CHECK constraints
-- =============================================================

CREATE TABLE appointments_new (
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

INSERT INTO appointments_new (id, pet_id, service_id, owner_name, owner_phone, owner_email,
  appointment_date, appointment_time, status, total_price, notes, created_at, updated_at)
SELECT id, pet_id, service_id, owner_name, owner_phone, owner_email,
  appointment_date, appointment_time, status, total_price, notes, created_at, updated_at
FROM appointments;

DROP TABLE appointments;
ALTER TABLE appointments_new RENAME TO appointments;

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_pet ON appointments(pet_id);
-- Recriar UNIQUE parcial (já criado na migration 13, recriamos por segurança)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_appointment_slot
  ON appointments(appointment_date, appointment_time)
  WHERE status != 'cancelado';

-- =============================================================
-- APPOINTMENT_SERVICES — FK para appointments e services
-- =============================================================

CREATE TABLE appointment_services_new (
  appointment_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (appointment_id, service_id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

INSERT INTO appointment_services_new (appointment_id, service_id, created_at)
SELECT appointment_id, service_id,
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM appointment_services;

DROP TABLE appointment_services;
ALTER TABLE appointment_services_new RENAME TO appointment_services;

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_id
  ON appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id
  ON appointment_services(service_id);

-- =============================================================
-- SERVICE_PRICING — FK para services
-- =============================================================

CREATE TABLE service_pricing_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('pequeno','medio','grande')),
  base_price REAL NOT NULL CHECK (base_price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (service_id, size),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

INSERT INTO service_pricing_new (id, service_id, size, base_price, created_at, updated_at)
SELECT id, service_id, size, base_price, created_at, updated_at FROM service_pricing;

DROP TABLE service_pricing;
ALTER TABLE service_pricing_new RENAME TO service_pricing;

-- =============================================================
-- PETS — CHECK em size e coat_condition
-- =============================================================

CREATE TABLE pets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  breed TEXT,
  size TEXT NOT NULL CHECK (size IN ('pequeno','medio','grande')),
  weight_kg REAL,
  age_years INTEGER,
  special_notes TEXT,
  photo_url TEXT,
  coat_condition TEXT CHECK (coat_condition IS NULL
    OR coat_condition IN ('excelente','bom','regular','ruim')),
  coat_notes TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pets_new SELECT * FROM pets;
DROP TABLE pets;
ALTER TABLE pets_new RENAME TO pets;
CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name);

COMMIT;

PRAGMA foreign_keys=ON;
