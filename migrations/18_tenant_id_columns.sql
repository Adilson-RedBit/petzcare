-- Migration 18: Add tenant_id to all data tables
-- (tenants table already exists from CB_petzcare schema)

-- Ensure the default tenant (id=1) exists with all required NOT NULL fields
INSERT OR IGNORE INTO tenants (id, name, slug, owner_name, owner_email, owner_phone, plan, trial_start, trial_end)
VALUES (1, 'PetzCare', 'petzcare', 'Admin', 'admin@petzcare.org', '11999999999', 'active',
        datetime('now'), datetime('now', '+3650 days'));

-- Add tenant_id to each table (nullable so existing rows stay valid until backfill)
ALTER TABLE professionals   ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE pets            ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE appointments    ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE services        ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE working_hours   ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE business_config ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);

-- Backfill: all existing rows belong to the default tenant
UPDATE professionals   SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE pets            SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE appointments    SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE services        SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE working_hours   SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE business_config SET tenant_id = 1 WHERE tenant_id IS NULL;
