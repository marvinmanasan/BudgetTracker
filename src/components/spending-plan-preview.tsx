import { useBudgetPeriods } from '../hooks/use-budget-periods';
import { activeBudgetPeriod } from '../lib/budget-periods';
import { useCurrentDate } from '../hooks/use-current-date';
import type { Ledger } from '../types/wallet';
import { BudgetPeriodCard } from './budget-period-card';
import { MonthlyLimitNotice } from './monthly-limit-notice';
import { ReadState } from './bulsa-form';

export function SpendingPlanPreview({ data, month, spent }: { data: Ledger; month: string; spent: number }) {
  const today = useCurrentDate();
  const { periods, loading, error, reload } = useBudgetPeriods();
  if (loading || error) return <ReadState loading={loading} error={error} retry={() => void reload()} />;
  const active = activeBudgetPeriod(periods, today);
  return active ? <BudgetPeriodCard compact period={active} data={data} /> : <MonthlyLimitNotice compact month={month} spent={spent} />;
}
