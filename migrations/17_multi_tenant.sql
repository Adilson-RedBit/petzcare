-- ══════════════════════════════════════════════════════
-- Migration 17: Multi-tenant support
-- Cria tabela tenants, adiciona tenant_id nas tabelas
-- existentes e cria o tenant padrão para dados atuais.
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  slug          TEXT    NOT NULL UNIQUE,
  owner_name    TEXT,
  owner_email   TEXT,
  owner_phone   TEXT,
  plan          TEXT    NOT NULL DEFAULT 'trial',
  trial_start   TEXT    DEFAULT (datetime('now')),
  trial_end     TEXT    DEFAULT (datetime('now', '+14 days')),
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Tenant padrão para dados existentes (plano ativo por 10 anos)
INSERT OR IGNORE INTO tenants (id, name, slug, plan, trial_start, trial_end)
VALUES (1, 'PetzCare', 'petzcare', 'active',
        datetime('now'), datetime('now', '+3650 days'));

-- Adiciona tenant_id nas tabelas existentes (nullable para não quebrar)
ALTER TABLE professionals   ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE pets            ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE appointments    ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE services        ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE working_hours   ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE business_config ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);

-- Backfill: todos os registros existentes pertencem ao tenant 1
UPDATE professionals   SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE pets            SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE appointments    SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE services        SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE working_hours   SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE business_config SET tenant_id = 1 WHERE tenant_id IS NULL;
