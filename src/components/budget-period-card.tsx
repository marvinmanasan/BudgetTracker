import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useUI } from './bulsa-form';
import { BulsaButton } from './bulsa-button';
import { periodSpending, type BudgetPeriod } from '../lib/budget-periods';
import type { Ledger } from '../types/wallet';
import { formatCentavos, spendingPlanResult } from '../lib/money';
import { displayDate } from '../lib/display-date';
import { useCurrentDate } from '../hooks/use-current-date';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';

export function BudgetPeriodCard({ period, data, compact = false }: { period: BudgetPeriod; data: Ledger; compact?: boolean }) {
  const ui = useUI();
  const { colors } = useBulsaTheme();
  const router = useRouter();
  const today = useCurrentDate();
  let spent: number;
  try { spent = periodSpending(data, period); }
  catch (cause) { return <Text style={ui.error}>{cause instanceof Error ? cause.message : 'Could not calculate spending.'}</Text>; }
  const upcoming = today < period.startDate;
  const ended = today > period.endDate;
  const remaining = period.limitCentavos - spent;
  let result = spendingPlanResult(remaining, ended);
  if (upcoming) result = `Spending Limit · ${formatCentavos(period.limitCentavos)}`;
  const fraction = period.limitCentavos ? Math.min(1, spent / period.limitCentavos) : Number(spent > 0);
  const dateRange = period.startDate === period.endDate ? displayDate(period.startDate)
    : `${displayDate(period.startDate)} – ${displayDate(period.endDate)}`;
  return <View style={[ui.card, { padding: 20, gap: 12 }]}>
    <Text style={ui.heading}>{period.title}</Text>
    <Text style={ui.caption}>{upcoming ? 'Upcoming' : ended ? 'Ended' : 'Active'} · {dateRange}</Text>
    {!upcoming && !ended && remaining > 0 ? <View>
      <Text style={ui.caption}>Left in This Plan</Text>
      <Text style={[ui.money, { color: colors.accent }]}>{formatCentavos(remaining)}</Text>
    </View> : <Text style={ui.title}>{result}</Text>}
    <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.track }}>
      <View style={{ height: 8, width: `${fraction * 100}%`, backgroundColor: remaining < 0 ? colors.warning : colors.accent }} />
    </View>
    <Text style={ui.body}>{formatCentavos(spent)} spent of {formatCentavos(period.limitCentavos)}</Text>
    <BulsaButton title={compact ? 'View Spending Plan' : 'Manage Plan'} onPress={() => router.push({
      pathname: compact ? '/budgets' : '/budget-period',
      params: { period: period.id },
    })} />
  </View>;
}
