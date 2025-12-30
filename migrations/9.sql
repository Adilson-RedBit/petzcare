-- Remover serviços duplicados, mantendo apenas o mais recente
DELETE FROM services 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM services 
  GROUP BY name
);



























