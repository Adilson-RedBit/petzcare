-- Ativa todos os horários de trabalho (Segunda a Sábado)
-- Mantém Domingo desativado

UPDATE working_hours 
SET is_active = 1, 
    updated_at = CURRENT_TIMESTAMP
WHERE day_of_week BETWEEN 1 AND 6;

-- Garante que domingo está desativado
UPDATE working_hours 
SET is_active = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE day_of_week = 0;
