import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { Ledger } from '../types/wallet';
import { spendingRange, spendingStatistics, shiftSpendingDate, type SpendingPeriod } from '../lib/spending-statistics';
import { readableDateRange } from '../lib/display-date';
import { formatCentavos } from '../lib/money';
import { useCurrentDate } from '../hooks/use-current-date';
import { useUI } from './bulsa-form';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { SummaryCard } from './summary-card';
import { BulsaButton } from './bulsa-button';

export function PeriodSummary({ data }: { data: Ledger }) {
  const today = useCurrentDate(), ui = useUI();
  const { colors } = useBulsaTheme();
  const { width, fontScale } = useWindowDimensions();
  const [details, setDetails] = useState(false);
  const [period, setPeriod] = useState<SpendingPeriod>('day');
  // null follows today across midnight/resume; historical navigation stays anchored.
  const [chosen, setChosen] = useState<string | null>(null);
  const anchor = chosen ?? today;
  const result = useMemo(() => {
    try { return { value: spendingStatistics(data, anchor, period), error: '' }; }
    catch (cause) { return { value: null, error: cause instanceof Error ? cause.message : 'Could not calculate spending.' }; }
  }, [data, anchor, period]);
  const range = spendingRange(anchor, period), current = spendingRange(today, period);
  const previous = shiftSpendingDate(anchor, period, -1), next = shiftSpendingDate(anchor, period, 1);
  const heading = range.start === current.start ? { day: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' }[period] : { day: 'Daily Summary', week: 'Weekly Summary', month: 'Monthly Summary', year: 'Yearly Summary' }[period];
  const periodName = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' }[period];
  const dateLabel = readableDateRange(range.start, range.end);
  return <View style={{ gap: 12 }}>
    <View style={[ui.row, { justifyContent: 'space-between' }]}>
      <Text accessibilityRole="header" style={ui.heading}>{heading}</Text>
      {range.start !== current.start && <Pressable accessibilityRole="button" accessibilityLabel="Back to Today" onPress={() => setChosen(null)} style={ui.back}><Text style={ui.backLabel}>Back to Today</Text></Pressable>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, padding: 4, gap: 4, borderRadius: 16, backgroundColor: colors.soft }}>
      {(['day', 'week', 'month', 'year'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={{ day: 'Day', week: 'Week', month: 'Month', year: 'Year' }[value]} accessibilityState={{ checked: period === value }}
        onPress={() => { setPeriod(value); setChosen(null); }}
        style={({ pressed }) => ({ flexGrow: 1, minWidth: 64, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: period === value ? colors.accent : 'transparent', opacity: pressed ? 0.75 : 1 })}>
        <Text style={{ color: period === value ? colors.onAccent : colors.text, fontWeight: '600', fontSize: 16 }}>{value === 'day' ? 'Day' : value === 'week' ? 'Week' : value === 'month' ? 'Month' : 'Year'}</Text>
      </Pressable>)}
    </ScrollView>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Previous ${periodName}`} accessibilityState={{ disabled: !previous }} disabled={!previous} onPress={() => setChosen(previous)} style={[ui.choice, { minWidth: 48, alignItems: 'center', opacity: previous ? 1 : 0.4 }]}><Text accessible={false} style={ui.heading}>‹</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={[ui.body, { flex: 1, textAlign: 'center', fontWeight: '500' }]}>{dateLabel}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Next ${periodName}`} accessibilityState={{ disabled: !next }} disabled={!next} onPress={() => setChosen(next)} style={[ui.choice, { minWidth: 48, alignItems: 'center', opacity: next ? 1 : 0.4 }]}><Text accessible={false} style={ui.heading}>›</Text></Pressable>
    </View>
    {result.value ? <>
      <View style={{ flexDirection: fontScale > 1.3 || width < 350 ? 'column' : 'row', gap: 12 }}>
        <SummaryCard label="Income" tone="income" amountCentavos={result.value.incomeCentavos} />
        <SummaryCard label="Expenses" tone="expense" amountCentavos={result.value.totalCentavos} />
      </View>
      <BulsaButton secondary title={details ? 'Hide Category Breakdown' : 'Spending by Category'} onPress={() => setDetails(value => !value)} />
      {details && <View style={ui.card}>
        {!result.value.count && <Text style={ui.caption}>No expenses in these dates</Text>}
        {result.value.categories.map(row => <View key={row.category} style={[ui.row, { justifyContent: 'space-between' }]}><Text style={[ui.body, { flexShrink: 1 }]}>{row.category}</Text><Text style={ui.body}>{formatCentavos(row.amountCentavos)}</Text></View>)}
        <Text style={ui.caption}>All wallets and unassigned entries. Transfers and balance corrections are excluded. Weeks run Monday–Sunday.</Text>
      </View>}
    </> : <Text style={ui.error}>{result.error}</Text>}
  </View>;
}
