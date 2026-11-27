import { withDatabase } from './database';
import { validateBudgetPeriod } from '../lib/budget-periods';

export type BudgetPeriod = { id: string; title: string; startDate: string; endDate: string; limitCentavos: number };

export async function deleteBudgetPeriod(expected: BudgetPeriod, name = 'bulsa.db'): Promise<void> {
  const { id, title, startDate, endDate, limitCentavos } = expected;
  await withDatabase(name, async db => {
    const result = await db.runAsync(
      'DELETE FROM budget_periods WHERE id=? AND title=? AND startDate=? AND endDate=? AND limitCentavos=?',
      id, title, startDate, endDate, limitCentavos,
    );
    if (!result.changes) throw new Error('This plan changed or was already deleted. Reopen Budgets to check it.');
  }, true);
}

export function getBudgetPeriods(name = 'bulsa.db'): Promise<BudgetPeriod[]> {
  return withDatabase(name, db => db.getAllAsync<BudgetPeriod>('SELECT id,title,startDate,endDate,limitCentavos FROM budget_periods ORDER BY startDate DESC,id'));
}

export async function saveBudgetPeriod(period: BudgetPeriod, expected?: BudgetPeriod, name = 'bulsa.db'): Promise<void> {
  period = { ...period };
  expected = expected ? { ...expected } : undefined;
  validateBudgetPeriod(period);
  if (expected && expected.id !== period.id) throw new Error('Keep the same plan when editing.');
  await withDatabase(name, async db => {
    const current = await db.getFirstAsync<BudgetPeriod>('SELECT id,title,startDate,endDate,limitCentavos FROM budget_periods WHERE id=?', period.id);
    const same = (a: BudgetPeriod, b: BudgetPeriod) => a.id === b.id && a.title === b.title && a.startDate === b.startDate && a.endDate === b.endDate && a.limitCentavos === b.limitCentavos;
    if (current && same(current, period)) return;
    if (expected ? !current || !same(current, expected) : !!current) throw new Error('This plan changed. Reopen it before saving.');
    const overlap = await db.getFirstAsync<BudgetPeriod>('SELECT id,title,startDate,endDate,limitCentavos FROM budget_periods WHERE id<>? AND startDate<=? AND endDate>=? LIMIT 1', period.id, period.endDate, period.startDate);
    if (overlap) throw new Error(`These dates overlap ${overlap.title} (${overlap.startDate} to ${overlap.endDate}). Choose different dates.`);
    await db.runAsync('INSERT INTO budget_periods(id,title,startDate,endDate,limitCentavos) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,startDate=excluded.startDate,endDate=excluded.endDate,limitCentavos=excluded.limitCentavos', period.id, period.title, period.startDate, period.endDate, period.limitCentavos);
  }, true);
}
