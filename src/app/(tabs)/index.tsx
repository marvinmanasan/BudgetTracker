import { router } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { PocketScreen } from '@/components/pocket-screen';
import { PocketButton } from '@/components/pocket-button';
import { SummaryCard } from '@/components/summary-card';
import { StorageCheck } from '@/components/storage-check';
import { ReadState, ui } from '@/components/bulsa-form';
import { PocketColors as C } from '@/constants/pocket';
import { useLedger } from '@/hooks/use-ledger';
import { monthlyTotals } from '@/lib/ledger';
import { formatCentavos } from '@/lib/money';
import { localDate } from '@/lib/validation';
import { displayMonth } from '@/lib/display-date';

export default function Index() {
  const { data, balances, loading, error, reload } = useLedger();
  const totals = data ? monthlyTotals(data, localDate().slice(0, 7)) : null;
  return <PocketScreen>
    <Text style={styles.brand}>bulsa</Text>
    <Text style={ui.title}>Welcome to Bulsa</Text>
    <Text style={ui.caption}>A little room for what matters.</Text>
    {loading || error || !balances || !totals ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      <View style={styles.hero}>
        <Text style={styles.label}>Total Budget</Text>
        <Text style={styles.total}>{formatCentavos(balances.totalCentavos)}</Text>
        <Text style={styles.spent}>Spent This Month  {formatCentavos(totals.expenseCentavos)}</Text>
        <Text style={styles.label}>Included Wallets + General</Text>
        <PocketButton title="View Wallets  ›" onPress={() => router.push('/wallets')} />
      </View>
      {!balances.wallets.some(w => w.configured) && <View style={ui.soft}><Text style={ui.heading}>Start With Your Wallets</Text><Text style={ui.body}>Add the money you have before recording its transactions. Not specified entries go to General.</Text><PocketButton title="Set Up Wallets" onPress={() => router.push('/wallets')} /></View>}
      <View style={ui.card}><Text style={ui.body}>No Monthly Limit Set</Text><Text style={ui.caption}>Total Budget is your recorded money. Your monthly spending limit is separate.</Text></View>
      <PocketButton title="+ Add Expense" onPress={() => router.push('/entry')} />
      <Text style={ui.heading}>This Month · {displayMonth(localDate().slice(0, 7))}</Text>
      <View style={styles.summary}><SummaryCard label="Income" amountCentavos={totals.incomeCentavos} /><SummaryCard label="Expenses" amountCentavos={totals.expenseCentavos} /></View>
    </>}
    {__DEV__ && <StorageCheck />}
  </PocketScreen>;
}
const styles = StyleSheet.create({
  brand: { color: C.accent, fontSize: 20, fontWeight: '600' },
  hero: { backgroundColor: C.summary, borderRadius: 24, padding: 20, gap: 12 },
  label: { color: C.summaryMuted, fontSize: 14, lineHeight: 21 },
  total: { color: C.onSummary, fontSize: 36, fontWeight: '700' },
  spent: { color: C.onSummary, fontSize: 16, lineHeight: 24 },
  summary: { flexDirection: 'row', gap: 12 },
});
