-- Adiciona professional_id para vincular clientes a profissionais específicos

-- Adicionar coluna professional_id na tabela pets
ALTER TABLE pets ADD COLUMN professional_id INTEGER;

-- Adicionar coluna professional_id na tabela appointments  
ALTER TABLE appointments ADD COLUMN professional_id INTEGER;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pets_professional ON pets(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);

-- Criar tabela para links de referência dos profissionais
CREATE TABLE IF NOT EXISTS professional_referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id INTEGER NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_referral_code ON professional_referrals(referral_code);
