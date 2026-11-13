import type { BulsaColors } from '@/constants/bulsa';
import { useBulsaStyles, useBulsaTheme } from '@/hooks/use-bulsa-theme';
import { FirstUse } from '@/components/first-use';
import { needsIntroduction } from '@/lib/preferences';
import { router } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { BulsaScreen } from '@/components/bulsa-screen';
import { BulsaButton } from '@/components/bulsa-button';
import { SummaryCard } from '@/components/summary-card';
import { StorageCheck } from '@/components/storage-check';
import { MonthlyLimitNotice } from '@/components/monthly-limit-notice';
import { SavingsPreview } from '@/components/savings-preview';
import { ReadState, useUI } from '@/components/bulsa-form';

import { useLedger } from '@/hooks/use-ledger';
import { monthlyTotals } from '@/lib/ledger';
import { formatCentavos } from '@/lib/money';
import { localDate } from '@/lib/validation';
import { monthName } from '@/lib/display-date';

export default function Index() {
  const ui = useUI();
  const styles = useBulsaStyles(createStyles);
  const { preferences } = useBulsaTheme();
  const { data, balances, loading, error, reload } = useLedger();
  const totals = data ? monthlyTotals(data, localDate().slice(0, 7)) : null;
  if (data && !loading && !error && needsIntroduction(preferences.onboardingComplete, data)) return <FirstUse />;
  return <BulsaScreen>
    <View style={styles.topBar}><Text style={styles.brand}>bulsa</Text><Pressable accessibilityRole="button" accessibilityLabel="Open Settings" onPress={() => router.push('/settings')} style={styles.avatar}><Text style={styles.avatarText}>{Array.from(preferences.displayName.trim())[0]?.toLocaleUpperCase() || 'B'}</Text></Pressable></View>
    <Text style={ui.title}>{preferences.displayName ? `Hello, ${preferences.displayName}.` : 'Welcome to Bulsa'}</Text>
    <Text style={ui.caption}>A little room for what matters.</Text>
    {loading || error || !balances || !totals ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      <View style={styles.hero}>
        <Text style={styles.label}>Total Budget</Text>
        <Text style={styles.total}>{formatCentavos(balances.totalCentavos)}</Text>
        <Text style={styles.spent}>Spent This Month  {formatCentavos(totals.expenseCentavos)}</Text>
        <Text style={styles.label}>Included Wallets + General</Text>
        <View style={ui.row}><Pressable accessibilityRole="button" onPress={() => router.push('/wallets')} style={styles.heroAction}><Text style={styles.heroLink}>View Wallets ›</Text></Pressable></View>
      </View>
      {!balances.wallets.some(w => w.configured) && <View style={ui.soft}><Text style={ui.heading}>Start With Your Wallets</Text><Text style={ui.body}>Add the money you have before recording its transactions. Not specified entries go to General.</Text><BulsaButton title="Set Up Wallets" onPress={() => router.push('/wallets')} /></View>}
      <MonthlyLimitNotice compact month={localDate().slice(0, 7)} spent={totals.expenseCentavos} />
      <BulsaButton title="+ Add Expense" onPress={() => router.push('/entry')} />
      <Text style={ui.heading}>This Month · {monthName(localDate().slice(0, 7))}</Text>
      <View style={styles.summary}><SummaryCard label="Income" tone="income" amountCentavos={totals.incomeCentavos} /><SummaryCard label="Expenses" tone="expense" amountCentavos={totals.expenseCentavos} /></View>
      <SavingsPreview />
    </>}
    {__DEV__ && <StorageCheck />}
  </BulsaScreen>;
}
const createStyles = (C: BulsaColors) => StyleSheet.create({
  brand: { color: C.accent, fontSize: 20, fontWeight: '600' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatar: { minWidth: 48, minHeight: 48, borderRadius: 24, backgroundColor: C.summary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.onSummary, fontSize: 20 },
  heroAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  heroLink: { color: C.onSummary, fontSize: 16 },
  hero: { backgroundColor: C.summary, borderRadius: 20, padding: 20, gap: 8 },
  label: { color: C.summaryMuted, fontSize: 14, lineHeight: 21 },
  total: { color: C.onSummary, fontSize: 36, fontWeight: '700' },
  spent: { color: C.onSummary, fontSize: 16, lineHeight: 24 },
  summary: { flexDirection: 'row', gap: 12 },
});
