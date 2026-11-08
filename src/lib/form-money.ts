import { parseAmountToCentavos } from './money';

export function parseBalance(input: string): number | null {
  const value = input.trim();
  if (/^-?0+(\.0{1,2})?$/.test(value)) return 0;
  const negative = value.startsWith('-');
  const amount = parseAmountToCentavos(negative ? value.slice(1) : value);
  return amount === null ? null : negative ? -amount : amount;
}

export function newRecordId(prefix: string) {
  // Opaque local ID, not a credential. Database uniqueness rejects collisions.
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
