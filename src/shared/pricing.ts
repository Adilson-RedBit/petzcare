/**
 * Lógica de precificação compartilhada entre front e worker.
 * Resolve A-6 da auditoria (antes estava duplicada em src/worker/index.ts).
 */

export type CoatCondition = 'excelente' | 'bom' | 'regular' | 'ruim';

export const COAT_MULTIPLIERS: Record<CoatCondition, number> = {
  excelente: 1.0,
  bom: 1.1,
  regular: 1.2,
  ruim: 1.3,
} as const;

/**
 * Aplica o multiplicador da condição da pelagem ao preço base.
 * Arredonda para 2 casas decimais.
 */
export function applyCoatMultiplier(
  basePrice: number,
  coatCondition?: CoatCondition | string | null,
): number {
  const safeBase = Number(basePrice) || 0;
  const mult =
    coatCondition && coatCondition in COAT_MULTIPLIERS
      ? COAT_MULTIPLIERS[coatCondition as CoatCondition]
      : 1.0;
  return Math.round(safeBase * mult * 100) / 100;
}

/**
 * Soma o preço total de vários serviços para o mesmo coat condition.
 */
export function calculateTotalPrice(
  serviceBasePrices: number[],
  coatCondition?: CoatCondition | string | null,
): number {
  const total = serviceBasePrices.reduce(
    (sum, base) => sum + applyCoatMultiplier(base, coatCondition),
    0,
  );
  return Math.round(total * 100) / 100;
}

// ---- Aliases legados (compatibilidade) -------------------------------------
export const calculatePrice = applyCoatMultiplier;
export const sumPrices = (prices: number[]): number => {
  const total = prices.reduce((sum, p) => sum + (Number(p) || 0), 0);
  return Math.round(total * 100) / 100;
};
