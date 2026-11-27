import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { Ledger } from '../types/wallet';
import { useCategoryPlan } from '../hooks/use-category-plan';
import { categoryBudgetSummary } from '../lib/category-budgets';
import { formatCentavos, spendingLimitStatus } from '../lib/money';

import { ReadState, useUI } from './bulsa-form';
import { BulsaButton } from './bulsa-button';

export function CategoryBudgetPanel({ data, month }: { data: Ledger; month: string }) {
  const [lastHeight, setLastHeight] = useState(0);
  const router = useRouter();
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const { plan, loading, error, reload } = useCategoryPlan(month);
  const result = useMemo(() => {
    if (loading || !plan || plan.limitCentavos === null) return null;
    try { return { summary: categoryBudgetSummary(data, month, plan.limitCentavos, plan.allocations), error: '' }; }
    catch (cause) { return { summary: null, error: cause instanceof Error ? cause.message : 'Could not calculate category spending.' }; }
  }, [data, month, plan, loading]);
  if (loading && !error) return <View accessibilityLabel="Updating category limits" accessibilityState={{ busy: true }} style={{ minHeight: lastHeight }} />;
  if (!loading && !error && (!plan || plan.limitCentavos === null)) return null;
  return <View onLayout={event => { setLastHeight(event.nativeEvent.layout.height); }} style={{ gap: 12 }}>
    <Text style={ui.heading}>Category Limits</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : !plan || plan.limitCentavos === null ? null : <>
      <BulsaButton secondary title={plan.allocations.length ? 'Edit Category Limits' : 'Set Category Limits'} onPress={() => router.push({ pathname: '/category-limits', params: { month } })} />
      {!!result?.error && <Text style={ui.error}>{result.error}</Text>}
      {result?.summary?.buckets.map(bucket => <View key={bucket.category} style={ui.card}>
        <Text style={ui.heading}>{bucket.category}</Text>
        <Text style={ui.body}>{formatCentavos(bucket.spentCentavos)} spent of {formatCentavos(bucket.limitCentavos)}</Text>
        <View accessible={false} style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: C.track }}><View style={{ height: 8, width: `${bucket.progress * 100}%`, backgroundColor: bucket.status === 'over' ? C.warning : C.accent }} /></View>
        <Text style={bucket.status === 'over' ? ui.error : ui.body}>{spendingLimitStatus(bucket.remainingCentavos)}</Text>
      </View>)}
      <Text style={ui.caption}>Spending in categories without their own limit appears in Everything Else. All wallets count in spending.</Text>
    </>}
  </View>;
}
