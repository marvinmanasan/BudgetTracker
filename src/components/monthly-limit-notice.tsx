import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useMonthlyLimit } from '../hooks/use-monthly-limit';
import { formatCentavos } from '../lib/money';
import { monthName } from '../lib/display-date';
import { BulsaButton } from './bulsa-button';
import { useUI } from './bulsa-form';

export function MonthlyLimitNotice({ month, spent, projected, disabled = false, compact = false }: { month: string; spent: number; projected?: number; disabled?: boolean; compact?: boolean }) {
  const ui = useUI();
  const { value, loading, error, reload } = useMonthlyLimit(month);
  if (compact) return <View style={ui.card}>
    {loading ? <Text style={ui.caption}>Reading monthly limit…</Text> : error ? <><Text style={ui.error}>{error}</Text><BulsaButton secondary disabled={disabled} title="Try Again" onPress={() => void reload()} /></> : <Pressable
      accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      accessibilityLabel={value === null ? 'No Monthly Limit Set. Open Budgets.' : `Monthly Spending Limit ${formatCentavos(value)}. ${formatCentavos(value - spent)} remaining. Open Budgets.`}
      onPress={() => router.push('/budgets')} style={{ minHeight: 48, justifyContent: 'center', gap: 6 }}>
      <Text style={ui.caption}>{value === null ? 'No Monthly Limit Set' : `Monthly Spending Limit ${formatCentavos(value)}`}</Text>
      <Text style={ui.heading}>{value === null ? 'View Budgets ›' : `${formatCentavos(value - spent)} remaining`}</Text>
    </Pressable>}
  </View>;
  return <View style={ui.card}>
    {loading ? <Text style={ui.caption}>Reading monthly limit…</Text> : error ? <><Text style={ui.error}>{error}</Text><BulsaButton secondary disabled={disabled} title="Try Again" onPress={() => void reload()} /></> : value === null ?
      <><Text style={ui.body}>No Monthly Limit Set</Text><Text style={ui.caption}>Your spending is still recorded. Total Budget is your money; this limit is a separate spending plan.</Text></> :
      <><Text style={ui.body}>Monthly Spending Limit · {monthName(month)}</Text><Text style={ui.heading}>{formatCentavos(value)}</Text><Text style={ui.body}>Spent: {formatCentavos(spent)}</Text><Text style={ui.body}>{projected === undefined ? 'Remaining' : 'Remaining After Saving'}: {formatCentavos(value - (projected ?? spent))}</Text></>}
    {!loading && !error && <BulsaButton secondary disabled={disabled} title={value === null ? 'Set Monthly Limit' : 'Edit Monthly Limit'} onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} />}
  </View>;
}
