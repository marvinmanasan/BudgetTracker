import { withDatabase } from './database';

export type MonthlyLimit = { month: string; limitCentavos: number };

function validateMonth(month: string): void {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith('0000-')) {
    throw new Error('Choose a valid month in YYYY-MM format (years 0001–9999).');
  }
}

export async function getMonthlyLimit(month: string, name = 'bulsa.db'): Promise<number | null> {
  validateMonth(month);
  return withDatabase(name, async db => {
    const row = await db.getFirstAsync<{ limitCentavos: number }>(
      'SELECT limitCentavos FROM monthly_limits WHERE month=?', month,
    );
    return row?.limitCentavos ?? null;
  });
}

export async function setMonthlyLimit(month: string, limitCentavos: number, name = 'bulsa.db'): Promise<void> {
  validateMonth(month);
  if (!Number.isSafeInteger(limitCentavos) || limitCentavos < 0) {
    throw new Error('The monthly limit must be nonnegative safe integer centavos.');
  }
  await withDatabase(name, async db => {
    await db.runAsync(
      'INSERT INTO monthly_limits(month,limitCentavos) VALUES(?,?) ON CONFLICT(month) DO UPDATE SET limitCentavos=excluded.limitCentavos',
      month, limitCentavos,
    );
  }, true);
}

export async function getMonthlyLimits(name = 'bulsa.db'): Promise<MonthlyLimit[]> {
  return withDatabase(name, db => db.getAllAsync<MonthlyLimit>(
    'SELECT month,limitCentavos FROM monthly_limits ORDER BY month DESC',
  ));
}
