export type DieValue = -1 | 0 | 1;

export const INITIAL_DICE: DieValue[] = [0, 0, 0, 0];
export const DIE_LABELS: Record<DieValue, string> = {[-1]: '−', 0: '0', 1: '+'};

export function rollDie(): DieValue {
  const values: DieValue[] = [-1, 0, 1];
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);
  return values[randomValue[0] % values.length];
}

export function rollFourDice(): DieValue[] {
  return Array.from({length: 4}, rollDie);
}

export function getTotal(dice: DieValue[]): number {
  return dice.reduce<number>((sum, die) => sum + die, 0);
}

export function formatTotal(total: number): string {
  return total > 0 ? `+${total}` : String(total);
}
