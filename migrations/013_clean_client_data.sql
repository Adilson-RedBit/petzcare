-- Limpa dados de clientes e agendamentos
-- Mantém: serviços, horários de trabalho, usuários, configurações do negócio

-- Limpar relação de serviços em agendamentos primeiro (foreign key)
DELETE FROM appointment_services;

-- Limpar agendamentos
DELETE FROM appointments;

-- Limpar pets
DELETE FROM pets;

-- Resetar os auto-increment IDs
DELETE FROM sqlite_sequence WHERE name IN ('appointment_services', 'appointments', 'pets');
