import type { BulsaColors } from '@/constants/bulsa';
import { useBulsaStyles, useBulsaTheme } from '@/hooks/use-bulsa-theme';
import { FirstUse } from '@/components/first-use';
import { needsIntroduction } from '@/lib/preferences';
import { useRouter } from 'expo-router';
import { Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { BulsaScreen } from '@/components/bulsa-screen';
import { BulsaButton } from '@/components/bulsa-button';
import { SummaryCard } from '@/components/summary-card';
import { MonthlyLimitNotice } from '@/components/monthly-limit-notice';
import { SavingsPreview } from '@/components/savings-preview';
import { ReadState, useUI } from '@/components/bulsa-form';

import { useLedger } from '@/hooks/use-ledger';
import { monthlyTotals } from '@/lib/ledger';
import { formatCentavos } from '@/lib/money';
import { localDate } from '@/lib/validation';
import { monthName } from '@/lib/display-date';

export default function Index() {
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackActions = Math.min(width, 600) - 48 < 8 + 2 * (20 + 100 * fontScale);
  const ui = useUI();
  const styles = useBulsaStyles(createStyles);
  const { preferences } = useBulsaTheme();
  const { data, balances, loading, error, reload } = useLedger();
  const totals = data ? monthlyTotals(data, localDate().slice(0, 7)) : null;
  if (data && balances && !loading && !error && needsIntroduction(preferences.onboardingComplete, data)) return <FirstUse wallets={balances.wallets} />;
  return <BulsaScreen>
    <View style={styles.topBar}>
      <Text style={styles.brand}>bulsa</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={styles.settings}>
        <Text accessible={false} style={styles.settingsText}>⚙</Text><Text style={styles.settingsText}>Settings</Text>
      </Pressable>
    </View>
    {loading || error || !balances || !totals ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      <View style={{ gap: 4 }}>
        <Text style={ui.title}>{preferences.displayName ? `Hello, ${preferences.displayName}.` : 'Welcome to Bulsa'}</Text>
        <Text style={ui.caption}>A little room for what matters.</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.label}>Total Budget</Text>
        <Text style={styles.total}>{formatCentavos(balances.totalCentavos)}</Text>
        <Text style={styles.label}>Included Wallets + General</Text>
      </View>
      <View style={[styles.actions, stackActions && styles.stacked]}>
        {(['expense', 'income'] as const).map(type => (
          <Pressable key={type} accessibilityRole="button" onPress={() => router.push({ pathname: '/entry', params: { type } })}
            style={({ pressed }) => [styles.action, stackActions && styles.stackedAction, type === 'income' && styles.outline, pressed && styles.pressed]}>
            <Text style={[styles.actionText, type === 'income' && styles.outlineText]}>{type === 'expense' ? 'Add Expense' : 'Add Income'}</Text>
          </Pressable>
        ))}
      </View>
      {!balances.wallets.some(wallet => wallet.configured) && <View style={ui.soft}>
        <Text style={ui.heading}>Start With Your Wallets</Text>
        <Text style={ui.body}>Add the money you have before recording transactions. Entries without a wallet go to General.</Text>
        <BulsaButton title="Set Up Wallets" onPress={() => router.push('/wallets')} />
      </View>}
      <MonthlyLimitNotice compact month={localDate().slice(0, 7)} spent={totals.expenseCentavos} />
      <Text style={ui.heading}>This Month · {monthName(localDate().slice(0, 7))}</Text>
      <View style={styles.summary}><SummaryCard label="Income" tone="income" amountCentavos={totals.incomeCentavos} /><SummaryCard label="Expenses" tone="expense" amountCentavos={totals.expenseCentavos} /></View>
      <Pressable style={styles.settings} accessibilityRole="button" onPress={() => router.push('/wallets')}><Text style={styles.settingsText}>View Wallets ›</Text></Pressable>
      <SavingsPreview />
    </>}
  </BulsaScreen>;
}
const createStyles = (C: BulsaColors) => StyleSheet.create({
  brand: { color: C.accent, fontSize: 20, fontWeight: '600' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settings: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  settingsText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  stacked: { flexDirection: 'column' },
  action: { flexGrow: 1, flexBasis: 0, minHeight: 48, paddingHorizontal: 8, paddingVertical: 10, justifyContent: 'center', alignItems: 'center', borderColor: C.accent, borderWidth: 1, borderRadius: 16, backgroundColor: C.accent },
  stackedAction: { flexBasis: 'auto' },
  outline: { backgroundColor: C.surface },
  actionText: { fontSize: 16, fontWeight: '600', color: C.onAccent, textAlign: 'center' },
  outlineText: { color: C.accent },
  pressed: { opacity: 0.75 },
  hero: { backgroundColor: C.summary, borderRadius: 20, padding: 20, gap: 8 },
  label: { color: C.summaryMuted, fontSize: 14, lineHeight: 21 },
  total: { color: C.onSummary, fontSize: 36, fontWeight: '700' },
  summary: { flexDirection: 'row', gap: 12 },
});
