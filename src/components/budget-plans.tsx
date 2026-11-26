import { useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useBudgetPeriods } from '../hooks/use-budget-periods';
import { activeBudgetPeriod } from '../lib/budget-periods';
import { useCurrentDate } from '../hooks/use-current-date';
import { displayDate } from '../lib/display-date';
import type { Ledger } from '../types/wallet';
import { BudgetPeriodCard } from './budget-period-card';
import { BulsaButton } from './bulsa-button';
import { ReadState, useUI } from './bulsa-form';

export function BudgetPlans({ data, children }: { data: Ledger; children: ReactNode }) {
  const { periods, loading, error, reload } = useBudgetPeriods();
  const { period } = useLocalSearchParams<{ period?: string }>();
  const selection = period ?? 'auto';
  const [history, setHistory] = useState(false);
  const router = useRouter();
  const ui = useUI();
  const today = useCurrentDate();
  const selected = selection === 'auto' ? activeBudgetPeriod(periods, today) : periods.find(row => row.id === selection);
  if (loading || error) return <ReadState loading={loading} error={error} retry={() => void reload()} />;
  return <View style={{ gap: 16 }}>
    {!!periods.length && <>
      <View style={ui.row}>
        <BulsaButton secondary title={history ? 'Close Plan List' : 'Switch Plan'} onPress={() => setHistory(value => !value)} />
        {selected && <BulsaButton secondary title="New Plan" onPress={() => router.push('/budget-period')} />}
      </View>
      {history && <>
        <BulsaButton secondary selected={!selected} title="Monthly Plan" onPress={() => { router.setParams({ period: 'monthly' }); setHistory(false); }} />
        {periods.map(row => <BulsaButton key={row.id} secondary selected={selected?.id === row.id}
          title={row.title + ' · ' + displayDate(row.startDate) + ' – ' + displayDate(row.endDate) + (row.endDate < today ? ' · Ended' : row.startDate > today ? ' · Upcoming' : ' · Current')}
          onPress={() => { router.setParams({ period: row.id }); setHistory(false); }} />)}
      </>}
    </>}
    {selection !== 'auto' && selection !== 'monthly' && !selected && <Text style={ui.caption}>This spending plan is no longer available. Your monthly plan is shown below.</Text>}
    {selected ? <BudgetPeriodCard period={selected} data={data} /> : children}
    {!selected && <BulsaButton secondary title="Start a Plan for Other Dates" onPress={() => router.push('/budget-period')} />}
  </View>;
}
