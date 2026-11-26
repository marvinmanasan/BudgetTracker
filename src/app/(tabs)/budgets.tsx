import { BudgetPlans } from '@/components/budget-plans';
import { useState } from 'react';
import { Text } from 'react-native';
import { BulsaScreen } from '@/components/bulsa-screen';
import { ReadState, useUI } from '@/components/bulsa-form';
import { CategoryBudgetPanel } from '@/components/category-budget-panel';
import { SavingsPreview } from '@/components/savings-preview';
import { MonthlyLimitHistory } from '@/components/monthly-limit-history';
import { MonthlyLimitNotice } from '@/components/monthly-limit-notice';
import { useLedger } from '@/hooks/use-ledger';
import { monthlyTotals } from '@/lib/ledger';
import { localDate } from '@/lib/validation';
import { MonthPicker } from '@/components/month-picker';

export default function Budgets() {
  const ui = useUI();
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const { data, loading, error, reload } = useLedger();
  return <BulsaScreen>
    <Text style={ui.title}>Budgets</Text>
    {loading || error || !data ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <BudgetPlans data={data}>
      <MonthPicker compact value={month} onChange={setMonth} />
      <MonthlyLimitNotice budgetSummary month={month} spent={monthlyTotals(data, month).expenseCentavos} />
      <CategoryBudgetPanel data={data} month={month} />
    </BudgetPlans>}
    <MonthlyLimitHistory />
    <SavingsPreview compact />
  </BulsaScreen>;
}
