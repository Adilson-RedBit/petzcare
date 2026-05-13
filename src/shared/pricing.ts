/**
 * Lógica de precificação compartilhada entre front e worker.
 * Antes estava duplicada em src/worker/index.ts (linhas 43-48 e 228-233).
 * Resolve A-6 da auditoria.
 */

export type CoatCondition = 'excelente' | 'bom' | 'regular' | 'ruim';

export const COAT_MULTIPLIERS: Record<CoatCondition, number> = {
  excelente: 1.0,
  bom: 1.1,
  regular: 1.2,
  ruim: 1.3,
} as const;

/**
 * Calcula o preço final de um serviço considerando a condição do pelo.
 * Sempre arredonda para 2 casas decimais.
 */
export function calculatePrice(basePrice: number, coatCondition?: CoatCondition | null): number {
  const safeBase = Number(basePrice) || 0;
  const multiplier = coatCondition ? (COAT_MULTIPLIERS[coatCondition] ?? 1.0) : 1.0;
  return Math.round(safeBase * multiplier * 100) / 100;
}

/**
 * Soma preços de uma lista de serviços já calculados.
 */
export function sumPrices(prices: number[]): number {
  const total = prices.reduce((sum, p) => sum + (Number(p) || 0), 0);
  return Math.round(total * 100) / 100;
}
