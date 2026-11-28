import type { BudgetPeriod } from '../storage/budget-periods';
import type { Ledger } from '../types/wallet';
import { validateDate } from './validation';

export type { BudgetPeriod } from '../storage/budget-periods';

export const PLAN_NAME_MAX_LENGTH = 80;

// Keep legacy records readable and editable; bound only new or changed names.
export function validatePlanName(title: string, previousTitle?: string): void {
  if (typeof title !== 'string' || !title.trim()) throw new Error('Enter a plan name.');
  if (title.length > PLAN_NAME_MAX_LENGTH && title !== previousTitle) throw new Error(`Use ${PLAN_NAME_MAX_LENGTH} characters or fewer for the plan name.`);
}

export function validateBudgetPeriod(period: BudgetPeriod): void {
  if (!period || typeof period.id !== 'string' || !period.id.trim() || typeof period.title !== 'string' || !period.title.trim()) throw new Error('Enter a plan name.');
  validateDate(period.startDate);
  validateDate(period.endDate);
  if (period.endDate < period.startDate) throw new Error('End date must be on or after start date.');
  if (!Number.isSafeInteger(period.limitCentavos) || period.limitCentavos < 0) throw new Error('Enter a limit of zero or more.');
}

export function periodSpending(data: Ledger, period: BudgetPeriod): number {
  validateBudgetPeriod(period);
  let total = 0n;
  for (const record of data.transactions) {
    if (record.type === 'expense' && record.date >= period.startDate && record.date <= period.endDate) {
      if (!Number.isSafeInteger(record.amountCentavos) || record.amountCentavos <= 0) throw new Error('Invalid expense amount.');
      total += BigInt(record.amountCentavos);
    }
  }
  const result = Number(total);
  if (!Number.isSafeInteger(result)) throw new Error('Spending exceeds the supported money range.');
  return result;
}

export function activeBudgetPeriod(periods: BudgetPeriod[], today: string): BudgetPeriod | undefined {
  validateDate(today);
  return periods.find(period => period.startDate <= today && period.endDate >= today);
}
