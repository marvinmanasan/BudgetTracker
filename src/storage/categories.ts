import type { SQLiteDatabase } from 'expo-sqlite';
import { validateMonth } from './budgets';
import { withDatabase } from './database';

export type CategoryAllocation = { category: string; limitCentavos: number };
export type CategoryPlan = { limitCentavos: number | null; allocations: CategoryAllocation[]; signature: string };

async function readPlan(db: SQLiteDatabase, month: string): Promise<CategoryPlan> {
  const limit = await db.getFirstAsync<{ limitCentavos: number }>('SELECT limitCentavos FROM monthly_limits WHERE month=?', month);
  const allocations = await db.getAllAsync<CategoryAllocation>('SELECT category,limitCentavos FROM category_allocations WHERE month=? ORDER BY category COLLATE BINARY', month);
  const limitCentavos = limit?.limitCentavos ?? null;
  return { limitCentavos, allocations, signature: JSON.stringify([limitCentavos, allocations]) };
}

export async function getCategoryPlan(month: string, name = 'bulsa.db'): Promise<CategoryPlan> {
  validateMonth(month);
  return withDatabase(name, db => readPlan(db, month));
}

export async function saveCategoryAllocations(month: string, allocations: CategoryAllocation[], name = 'bulsa.db', expectedSignature?: string): Promise<void> {
  validateMonth(month);
  if (!Array.isArray(allocations)) throw new Error('Choose valid category allocations.');
  allocations = allocations.map(allocation => ({ ...allocation }));
  const categories = new Set<string>();
  let total = 0;
  for (const allocation of allocations) {
    if (typeof allocation.category !== 'string' || !allocation.category.trim()) throw new Error('A category name is required.');
    if (allocation.category.trim().toLowerCase() === 'everything else') throw new Error('Everything Else is calculated automatically.');
    if (categories.has(allocation.category)) throw new Error('Each exact category may only have one allocation.');
    categories.add(allocation.category);
    if (!Number.isSafeInteger(allocation.limitCentavos) || allocation.limitCentavos < 0) throw new Error('Category limits must be nonnegative safe integer centavos.');
    total += allocation.limitCentavos;
    if (!Number.isSafeInteger(total)) throw new Error('Category allocations exceed safe integer centavos.');
  }
  await withDatabase(name, async db => {
    const current = await readPlan(db, month);
    if (expectedSignature !== undefined && current.signature !== expectedSignature) throw new Error('This category plan changed. Reopen it before saving.');
    if (current.limitCentavos === null) throw new Error('Set a monthly limit before saving category allocations.');
    if (total > current.limitCentavos) throw new Error('Category allocations cannot exceed the monthly limit.');
    await db.runAsync('DELETE FROM category_allocations WHERE month=?', month);
    for (const allocation of allocations) {
      await db.runAsync('INSERT INTO category_allocations(month,category,limitCentavos) VALUES(?,?,?)', month, allocation.category, allocation.limitCentavos);
    }
  }, true);
}
