import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { PocketScreen } from '@/components/pocket-screen';
import { PocketButton } from '@/components/pocket-button';
import { ReadState, ui } from '@/components/bulsa-form';
import { PocketColors as C } from '@/constants/pocket';
import { useLedger } from '@/hooks/use-ledger';
import { formatCentavos } from '@/lib/money';
import { displayDate } from '@/lib/display-date';

export default function Activity() {
  const { message, wallet } = useLocalSearchParams<{ message?: string; wallet?: string }>();
  const { data, loading, error, reload } = useLedger();
  const walletName = (id?: string | null) => data?.wallets.find(w => w.id === id)?.name ?? 'General';
  const rows = !data ? [] : [
    ...data.transactions.filter(t => !wallet || t.walletId === wallet).map(t => ({ key: 'transaction-' + t.id, date: t.date, title: t.category, detail: `${t.type === 'income' ? 'Income' : 'Expense'} · ${walletName(t.walletId)} · ${t.paymentMethod}`, amount: t.amountCentavos * (t.type === 'income' ? 1 : -1), type: t.type, note: t.note ?? '' })),
    ...data.transfers.filter(t => !wallet || t.fromWalletId === wallet || t.toWalletId === wallet).map(t => ({ key: 'transfer-' + t.id, date: t.date, title: 'Transfer', detail: `${walletName(t.fromWalletId)} → ${walletName(t.toWalletId)}`, amount: t.amountCentavos, type: 'transfer', note: t.note })),
    ...data.changes.filter(c => !wallet || c.walletId === wallet).map(c => ({ key: 'change-' + c.id, date: c.date, title: c.kind === 'opening' ? 'Starting Balance' : 'Balance Adjustment', detail: walletName(c.walletId), amount: c.deltaCentavos, type: c.kind, note: c.reason })),
  ].sort((a,b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
  return <PocketScreen scrollable={false}>
    <Text style={ui.title}>Activity</Text>
    {wallet && <><Text style={ui.caption}>{walletName(wallet)} Records</Text><PocketButton secondary title="Show All Activity" onPress={() => router.setParams({ wallet: undefined })} /></>}
    {message && <View style={ui.soft}><Text style={ui.body} accessibilityLiveRegion="polite">{message}</Text><PocketButton secondary title="Dismiss" onPress={() => router.setParams({ message: undefined })} /></View>}
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <FlatList style={{ flex: 1 }} data={rows} keyExtractor={item => item.key} contentContainerStyle={{ paddingBottom: 24, gap: 12 }} ListEmptyComponent={<View style={ui.card}><Text style={ui.heading}>Your Story Starts Here</Text><Text style={ui.body}>Record an expense, income or starting balance to see it here.</Text><PocketButton title="Add Expense or Income" onPress={() => router.push('/entry')} /></View>} renderItem={({item}) => <View style={ui.card}>
      <Text style={ui.caption}>{displayDate(item.date)}</Text>
      <Text style={ui.heading}>{item.title}</Text>
      <Text style={ui.caption}>{item.detail}</Text>
      <Text style={[ui.heading, { color: item.type === 'income' ? C.income : item.type === 'expense' ? C.warning : C.text }]}>{item.type === 'income' ? '+' : ''}{formatCentavos(item.amount)}</Text>
      {!!item.note && <Text style={ui.caption}>{item.note}</Text>}
    </View>} />}
  </PocketScreen>;
}
