-- Remove todas as entradas da tabela working_hours
DELETE FROM working_hours;

-- Insere horários corretos e únicos para cada dia da semana
-- Segunda a Sexta: 08:00 às 18:00 com intervalo 12:00-13:00
-- Sábado: 08:00 às 18:00 com intervalo 12:00-13:00
-- Domingo: Fechado

INSERT INTO working_hours (day_of_week, start_time, end_time, is_active, break_start, break_end) VALUES
  (0, '08:00', '18:00', 0, '12:00', '13:00'), -- Domingo (fechado)
  (1, '08:00', '18:00', 1, '12:00', '13:00'), -- Segunda
  (2, '08:00', '18:00', 1, '12:00', '13:00'), -- Terça
  (3, '08:00', '18:00', 1, '12:00', '13:00'), -- Quarta
  (4, '08:00', '18:00', 1, '12:00', '13:00'), -- Quinta
  (5, '08:00', '18:00', 1, '12:00', '13:00'), -- Sexta
  (6, '08:00', '18:00', 1, '12:00', '13:00'); -- Sábado
