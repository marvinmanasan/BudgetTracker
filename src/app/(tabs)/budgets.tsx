import { useState } from 'react';
import { Text } from 'react-native';
import { BulsaScreen } from '@/components/bulsa-screen';
import { BulsaButton } from '@/components/bulsa-button';
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
  const [history, setHistory] = useState(false);
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const { data, loading, error, reload } = useLedger();
  return <BulsaScreen>
    <Text style={ui.title}>Budgets</Text><Text style={ui.caption}>Plan your spending separately from your recorded money.</Text>
    <MonthPicker value={month} onChange={setMonth} />
    {loading || error || !data ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : month && <MonthlyLimitNotice month={month} spent={monthlyTotals(data, month).expenseCentavos} />}

    <BulsaButton secondary title={history ? "Hide Monthly History" : "Monthly Limit History"} onPress={() => setHistory(value => !value)} />
    {history && <MonthlyLimitHistory />}
    {data && month && !loading && !error && <CategoryBudgetPanel data={data} month={month} />}
    <SavingsPreview />
  </BulsaScreen>;
}
