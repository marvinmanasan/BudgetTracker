import type { Ledger } from '../types/wallet';
import { validateDate, validateCentavos } from './validation';

export type SpendingPeriod = 'day' | 'week' | 'month' | 'year';
function calendar(iso: string) {
  validateDate(iso);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return date;
}
function iso(date: Date) { return date.toISOString().slice(0, 10); }
function checkPeriod(period: SpendingPeriod) {
  if (!['day', 'week', 'month', 'year'].includes(period)) throw new Error('Choose a spending period.');
}
export function spendingRange(anchor: string, period: SpendingPeriod) {
  checkPeriod(period);
  const start = calendar(anchor), end = calendar(anchor);
  if (period === 'week') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate() + 6);
  } else if (period === 'month') {
    start.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else if (period === 'year') {
    start.setUTCMonth(0, 1); end.setUTCMonth(11, 31);
  }
  return { start: start.getUTCFullYear() < 1 ? '0001-01-01' : iso(start), end: end.getUTCFullYear() > 9999 ? '9999-12-31' : iso(end) };
}
export function shiftSpendingDate(anchor: string, period: SpendingPeriod, direction: -1 | 1): string | null {
  checkPeriod(period);
  const date = calendar(anchor), day = date.getUTCDate();
  if (period === 'day' || period === 'week') date.setUTCDate(day + direction * (period === 'week' ? 7 : 1));
  else {
    date.setUTCDate(1);
    if (period === 'month') date.setUTCMonth(date.getUTCMonth() + direction);
    else date.setUTCFullYear(date.getUTCFullYear() + direction);
    const last = new Date(date.getTime()); last.setUTCMonth(last.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(day, last.getUTCDate()));
  }
  return date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 ? null : iso(date);
}
export function spendingStatistics(data: Ledger, anchor: string, period: SpendingPeriod) {
  const range = spendingRange(anchor, period);
  let total = 0n, income = 0n, count = 0;
  const categories = new Map<string, bigint>();
  for (const row of data.transactions) {
    if (row.date < range.start || row.date > range.end) continue;
    validateCentavos(row.amountCentavos, true);
    if (row.type === 'income') { income += BigInt(row.amountCentavos); continue; }
    total += BigInt(row.amountCentavos); count++;
    categories.set(row.category, (categories.get(row.category) ?? 0n) + BigInt(row.amountCentavos));
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || income > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Totals exceed the safe money range.');
  return { ...range, totalCentavos: Number(total), incomeCentavos: Number(income), count, categories: Array.from(categories, ([category, amount]) => ({ category, amountCentavos: Number(amount) })).sort((a, b) => b.amountCentavos - a.amountCentavos || a.category.localeCompare(b.category)) };
}
