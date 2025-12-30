/**
 * Funções de sanitização de inputs para prevenir SQL injection
 * e XSS
 */

/**
 * Remove caracteres perigosos de strings
 * Não substitui prepared statements, mas adiciona camada extra de segurança
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remover caracteres de controle
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limitar tamanho (prevenir DoS)
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  // Trim espaços
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitiza número, garantindo que é um número válido
 */
export function sanitizeNumber(input: unknown): number | null {
  if (typeof input === 'number') {
    return isNaN(input) || !isFinite(input) ? null : input;
  }
  
  if (typeof input === 'string') {
    const num = parseFloat(input);
    return isNaN(num) || !isFinite(num) ? null : num;
  }
  
  return null;
}

/**
 * Sanitiza email
 */
export function sanitizeEmail(input: string): string {
  const sanitized = sanitizeString(input);
  // Validar formato básico de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized.toLowerCase() : '';
}

/**
 * Sanitiza telefone (remove caracteres não numéricos, exceto +)
 */
export function sanitizePhone(input: string): string {
  const sanitized = sanitizeString(input);
  // Manter apenas números, espaços, parênteses, hífens e +
  return sanitized.replace(/[^\d\s()\-+]/g, '');
}

/**
 * Sanitiza data (formato YYYY-MM-DD)
 */
export function sanitizeDate(input: string): string {
  const sanitized = sanitizeString(input);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(sanitized)) {
    return '';
  }
  
  // Verificar se é uma data válida
  const date = new Date(sanitized);
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return sanitized;
}

/**
 * Sanitiza hora (formato HH:MM)
 */
export function sanitizeTime(input: string): string {
  const sanitized = sanitizeString(input);
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitiza texto longo (para campos como notes, description)
 */
export function sanitizeText(input: string, maxLength: number = 5000): string {
  let sanitized = sanitizeString(input);
  
  // Limitar tamanho
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}





















