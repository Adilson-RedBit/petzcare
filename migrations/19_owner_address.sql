-- Migration 19: adiciona endereço do dono no cadastro do pet
ALTER TABLE pets ADD COLUMN owner_address TEXT;
