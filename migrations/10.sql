-- Add banner customization fields to business_config
ALTER TABLE business_config ADD COLUMN professional_name TEXT;
ALTER TABLE business_config ADD COLUMN banner_title TEXT;
ALTER TABLE business_config ADD COLUMN banner_description TEXT;

-- Set default values
UPDATE business_config SET 
  professional_name = 'Profissional',
  banner_title = 'Cuidamos do seu pet com carinho',
  banner_description = 'Serviços profissionais de banho e tosa para deixar seu pet sempre limpo, cheiroso e lindinho. Agende agora mesmo!'
WHERE id = 1;



























