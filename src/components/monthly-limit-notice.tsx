import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useMonthlyLimit } from '../hooks/use-monthly-limit';
import { formatCentavos } from '../lib/money';
import { displayMonth } from '../lib/display-date';
import { PocketButton } from './pocket-button';
import { ui } from './bulsa-form';

export function MonthlyLimitNotice({ month, spent, projected, disabled = false }: { month: string; spent: number; projected?: number; disabled?: boolean }) {
  const { value, loading, error, reload } = useMonthlyLimit(month);
  return <View style={ui.card}>
    {loading ? <Text style={ui.caption}>Reading monthly limit…</Text> : error ? <><Text style={ui.error}>{error}</Text><PocketButton secondary disabled={disabled} title="Try Again" onPress={() => void reload()} /></> : value === null ?
      <><Text style={ui.body}>No Monthly Limit Set</Text><Text style={ui.caption}>Your spending is still recorded. Total Budget is your money; this limit is a separate spending plan.</Text></> :
      <><Text style={ui.body}>Monthly Spending Limit · {displayMonth(month)}</Text><Text style={ui.heading}>{formatCentavos(value)}</Text><Text style={ui.body}>Spent: {formatCentavos(spent)}</Text><Text style={ui.body}>{projected === undefined ? 'Remaining' : 'Remaining After Saving'}: {formatCentavos(value - (projected ?? spent))}</Text></>}
    {!loading && !error && <PocketButton secondary disabled={disabled} title={value === null ? 'Set Monthly Limit' : 'Edit Monthly Limit'} onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} />}
  </View>;
}
