import type { Ledger } from '../types/wallet';
import type { CategoryAllocation } from '../storage/categories';

export function categoryBudgetSummary(data: Ledger, month: string, limitCentavos: number, allocations: CategoryAllocation[]) {
  const exact = (value: number) => { if (!Number.isSafeInteger(value) || value < 0) throw new Error('Use safe nonnegative centavos.'); return BigInt(value); };
  const cap = exact(limitCentavos);
  let allocated = 0n, total = 0n;
  const names = new Set<string>(), spending = new Map<string, bigint>();
  for (const allocation of allocations) {
    if (names.has(allocation.category)) throw new Error('Duplicate category allocation.');
    names.add(allocation.category); allocated += exact(allocation.limitCentavos);
  }
  if (allocated > cap) throw new Error('Category allocations exceed the monthly limit.');
  let other = 0n;
  for (const record of data.transactions) {
    if (record.type !== 'expense' || !record.date.startsWith(month + '-')) continue;
    const amount = exact(record.amountCentavos); total += amount;
    if (names.has(record.category)) spending.set(record.category, (spending.get(record.category) ?? 0n) + amount);
    else other += amount;
  }
  if (!Number.isSafeInteger(Number(total))) throw new Error('Monthly spending exceeds the safe range.');
  const bucket = (category: string, limit: bigint, spent: bigint, automatic: boolean) => ({
    category, limitCentavos: Number(limit), spentCentavos: Number(spent), remainingCentavos: Number(limit - spent), automatic,
    progress: limit === 0n ? (spent > 0n ? 1 : 0) : Math.min(1, Number(spent) / Number(limit)),
    status: spent > limit ? 'over' : spent > 0n && spent * 5n >= limit * 4n ? 'near' : 'within',
  });
  return { totalSpentCentavos: Number(total), buckets: [
    ...allocations.map(a => bucket(a.category, BigInt(a.limitCentavos), spending.get(a.category) ?? 0n, false)),
    bucket('Everything Else', cap - allocated, other, true),
  ] };
}
