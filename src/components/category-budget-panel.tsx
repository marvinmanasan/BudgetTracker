import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { Ledger } from '../types/wallet';
import { useCategoryPlan } from '../hooks/use-category-plan';
import { categoryBudgetSummary } from '../lib/category-budgets';
import { formatCentavos } from '../lib/money';

import { ReadState, useUI } from './bulsa-form';
import { PocketButton } from './pocket-button';

export function CategoryBudgetPanel({ data, month }: { data: Ledger; month: string }) {
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const { plan, loading, error, reload } = useCategoryPlan(month);
  const result = useMemo(() => {
    if (!plan || plan.limitCentavos === null) return null;
    try { return { summary: categoryBudgetSummary(data, month, plan.limitCentavos, plan.allocations), error: '' }; }
    catch (cause) { return { summary: null, error: cause instanceof Error ? cause.message : 'Could not calculate category spending.' }; }
  }, [data, month, plan]);
  return <View style={{ gap: 12 }}>
    <Text style={ui.heading}>Category Limits</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : !plan || plan.limitCentavos === null ? <>
      <Text style={ui.body}>Set a monthly spending limit before dividing it into categories.</Text><PocketButton secondary title="Set Monthly Limit" onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} />
    </> : <>
      {!!result?.error && <Text style={ui.error}>{result.error}</Text>}
      {result?.summary?.buckets.map(bucket => <View key={bucket.category} style={ui.card}>
        <Text style={ui.heading}>{bucket.category}{bucket.automatic ? ' · Automatic' : ''}</Text>
        <Text style={ui.body}>{formatCentavos(bucket.spentCentavos)} spent of {formatCentavos(bucket.limitCentavos)}</Text>
        <View accessible={false} style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: C.track }}><View style={{ height: 8, width: `${bucket.progress * 100}%`, backgroundColor: bucket.status === 'over' ? C.warning : C.accent }} /></View>
        <Text style={bucket.status === 'over' ? ui.error : ui.body}>{formatCentavos(bucket.remainingCentavos)} remaining{bucket.status === 'over' ? ' · Over Limit' : bucket.status === 'near' ? ' · Near Limit' : ''}</Text>
      </View>)}
      <Text style={ui.caption}>Everything Else includes every expense without a named allocation, including older custom labels. All wallets count in spending.</Text>
      <PocketButton secondary title="Edit Category Limits" onPress={() => router.push({ pathname: '/category-limits', params: { month } })} />
    </>}
  </View>;
}
