import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useMonthlyLimit } from '../hooks/use-monthly-limit';
import { formatCentavos, spendingLimitStatus } from '../lib/money';
import { monthName } from '../lib/display-date';
import { BulsaButton } from './bulsa-button';
import { useUI } from './bulsa-form';

export function MonthlyLimitNotice({ month, spent, projected, disabled = false, compact = false, budgetSummary = false }: { month: string; spent: number; projected?: number; disabled?: boolean; compact?: boolean; budgetSummary?: boolean }) {
  const [summaryHeight, setSummaryHeight] = useState(240);
  const router = useRouter();
  const ui = useUI();
  const { value, loading, error, reload } = useMonthlyLimit(month);
  if (compact) return <View style={ui.card}>
    {loading ? <Text style={ui.caption}>Reading monthly limit…</Text> : error ? <><Text style={ui.error}>{error}</Text><BulsaButton secondary disabled={disabled} title="Try Again" onPress={() => void reload()} /></> : <Pressable
      accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      accessibilityLabel={value === null ? 'No Monthly Limit Set. Open Budgets.' : `Monthly Spending Limit ${formatCentavos(value)}. ${spendingLimitStatus(value - spent)}. Open Budgets.`}
      onPress={() => router.push('/budgets')} style={{ minHeight: 48, justifyContent: 'center', gap: 6 }}>
      <Text style={ui.caption}>{value === null ? 'No Monthly Limit Set' : `Monthly Spending Limit ${formatCentavos(value)}`}</Text>
      <Text style={ui.heading}>{value === null ? 'View Budgets ›' : `${spendingLimitStatus(value - spent)}`}</Text>
    </Pressable>}
  </View>;
  if (budgetSummary) return <View onLayout={event => { if (!loading) setSummaryHeight(event.nativeEvent.layout.height); }} style={[ui.card, { minHeight: loading ? summaryHeight : 240 }]} accessibilityState={{ busy: loading }}>
    {loading ? <Text style={ui.caption}>Reading monthly limit…</Text> : error ? <>
      <Text style={ui.error}>{error}</Text>
      <BulsaButton secondary title="Try Again" onPress={() => void reload()} />
    </> : <>
      <Text style={ui.caption}>Monthly Spending Plan · {monthName(month)}</Text>
      {value === null ? <>
        <Text style={ui.heading}>How much do you want to spend this month?</Text>
        <Text style={ui.body}>{formatCentavos(spent)} spent so far</Text>
        <Text style={ui.caption}>A spending limit helps you track what you spend. Your wallet balance stays the same.</Text>
        <Text style={ui.caption}>You can also set limits for individual categories.</Text>
      </> : <>
        <Text accessibilityLiveRegion="polite" style={ui.title}>{value > spent ? `${formatCentavos(value - spent)} left in your monthly plan` : spendingLimitStatus(value - spent)}</Text>
        <Text style={ui.body}>{formatCentavos(spent)} spent of {formatCentavos(value)}</Text>
      </>}
      <BulsaButton secondary={value !== null} disabled={disabled} title={value === null ? 'Set Monthly Limit' : 'Edit Monthly Limit'} onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} />
    </>}
  </View>;
  return <View style={ui.card}>
    {loading ? <Text style={ui.caption}>Reading monthly limit…</Text> : error ? <><Text style={ui.error}>{error}</Text><BulsaButton secondary disabled={disabled} title="Try Again" onPress={() => void reload()} /></> : value === null ?
      <><Text style={ui.body}>No Monthly Limit Set</Text><Text style={ui.caption}>Your spending is still recorded. Total Budget is your money; this limit is a separate spending plan.</Text></> :
      <><Text style={ui.body}>Monthly Spending Limit · {monthName(month)}</Text><Text style={ui.heading}>{formatCentavos(value)}</Text><Text style={ui.body}>Spent: {formatCentavos(spent)}</Text><Text style={ui.body}>{projected !== undefined ? 'After Saving · ' : ''}{spendingLimitStatus(value - (projected ?? spent))}</Text></>}
    {!loading && !error && <BulsaButton secondary disabled={disabled} title={value === null ? 'Set Monthly Limit' : 'Edit Monthly Limit'} onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} />}
  </View>;
}
