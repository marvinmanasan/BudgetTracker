import { MoneyReview } from '@/components/money-review';
import { previewSelectedDeletion } from '@/lib/selected-deletion';
import { deleteSelectedTransactions } from '@/storage/selected-deletion';
import { CenteredPopup } from '@/components/centered-popup';
import { useBulsaTheme } from '@/hooks/use-bulsa-theme';
import { useRouter, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, Pressable, SectionList, Text, View } from 'react-native';
import { BulsaScreen } from '@/components/bulsa-screen';
import { BulsaButton } from '@/components/bulsa-button';
import { Field, ReadState, useUI } from '@/components/bulsa-form';
import { ActivityAmount } from '@/components/activity-amount';
import { useLedger, useSaveAction } from '@/hooks/use-ledger';
import { filterActivitySections, spendingSummary, type ActivityFilters } from '@/lib/activity';
import { ActivityFilterPanel } from '@/components/activity-filters';
import { useTransactionUndo } from '@/hooks/use-transaction-undo';
import { UndoNotice } from '@/components/undo-notice';

import { formatCentavos } from '@/lib/money';
import { localDate } from '@/lib/validation';
import { displayDate, monthName } from '@/lib/display-date';

export default function Activity() {
  const router = useRouter();
  const navigation = useNavigation<{ setParams: (params: { wallet?: string; message?: string }) => void }>();
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const { message, wallet } = useLocalSearchParams<{ message?: string; wallet?: string }>();
  const { data, loading, error, reload } = useLedger();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('');
  const [expanded, setExpanded] = useState(false);
  const monthKey = month || undefined;
  const monthError = '';
  const undo = useTransactionUndo();
  const saveAction = useSaveAction();
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteReview, setDeleteReview] = useState<ReturnType<typeof previewSelectedDeletion> | null>(null);
  const [selectionError, setSelectionError] = useState('');
  const blocked = saveAction.busy || undo.busy;
  const finishSelection = useCallback(() => { if (blocked) return; setSelecting(false); setSelectedIds([]); setDeleteReview(null); setSelectionError(''); }, [blocked]);
  useFocusEffect(useCallback(() => () => { setSelecting(false); setSelectedIds([]); setDeleteReview(null); setSelectionError(''); }, []));
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (blocked) return true;
      if (selecting) { finishSelection(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [blocked, selecting, finishSelection]));

  const [draftFilters, setDraftFilters] = useState<ActivityFilters>({});
  const [draftMonth, setDraftMonth] = useState('');
  const [clearWallet, setClearWallet] = useState(false);
  function openFilters() { setDraftFilters({ ...filters }); setDraftMonth(month); setClearWallet(false); setExpanded(true); }
  const sections = useMemo(() => data && !monthError ? filterActivitySections(data, { ...filters, query, wallet, month: monthKey }) : [], [data, filters, query, wallet, monthKey, monthError]);

  const matchingIds = useMemo(() => sections.flatMap(section => section.data.filter(item => item.type === 'expense' || item.type === 'income').map(item => item.key.slice('transaction-'.length))), [sections]);
  const matchingSet = useMemo(() => new Set(matchingIds), [matchingIds]);
  const chosenIds = selectedIds.filter(id => matchingSet.has(id));
  const chosenSet = new Set(chosenIds);
  function toggleSelection(key: string) {
    const id = key.slice('transaction-'.length);
    if (blocked || !matchingSet.has(id)) return;
    setSelecting(true); setSelectionError('');
    setSelectedIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  }
  function prepareDeletion() {
    if (blocked || !data || error) return;
    const pending = undo.snapshot();
    if (pending.busy || pending.record) { setSelectionError('Undo or dismiss the previous deletion first.'); return; }
    if (chosenIds.length === 1) {
      router.push({ pathname: '/activity-record', params: { record: 'transaction-' + chosenIds[0], action: 'delete' } }); return;
    }
    try { setDeleteReview(previewSelectedDeletion(data, chosenIds)); setSelectionError(''); }
    catch (cause) { setSelectionError(cause instanceof Error ? cause.message : 'Select your records again.'); }
  }
  async function confirmSelectedDeletion() {
    if (!deleteReview) return;
    const approved = deleteReview;
    const saved = await saveAction.run(async () => {
      const pending = undo.snapshot();
      if (pending.busy || pending.record) throw new Error('Undo or dismiss the previous deletion first.');
      await deleteSelectedTransactions(approved.ids, approved.signature);
    });
    if (saved) { setDeleteReview(null); setSelectedIds([]); setSelecting(false); navigation.setParams({ message: `${approved.ids.length} selected transactions deleted. Other records were kept.` }); await reload(true); }
  }
  const selectionToolbar = <View style={{ gap: 8 }}>
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Text accessibilityLiveRegion="polite" style={ui.heading}>{chosenIds.length} Selected</Text><BulsaButton secondary title="Done" disabled={blocked} onPress={finishSelection} /></View>
    <View style={ui.row}>
      <BulsaButton secondary title="Select All Matching" disabled={blocked || !matchingIds.length} onPress={() => setSelectedIds([...matchingIds])} />
      {chosenIds.length === 1 && <BulsaButton secondary title="Edit" disabled={blocked || !!error} onPress={() => router.push({ pathname: '/edit-entry', params: { id: chosenIds[0] } })} />}
      <BulsaButton title="Delete Selected" disabled={blocked || !!undo.record || !chosenIds.length || !!error} onPress={prepareDeletion} />
    </View>
    <Text style={ui.caption}>Only expenses and income matching your current filters can be selected.</Text>
    {!!undo.record && <Text style={ui.caption}>Undo or dismiss the previous deletion before deleting more records.</Text>}
    {!!selectionError && <Text accessibilityLiveRegion="polite" style={ui.error}>{selectionError}</Text>}
  </View>;
  const categories = useMemo(() => [...new Set(data?.transactions.map(t => t.category))].sort(), [data]);
  const payments = useMemo(() => [...new Set(data?.transactions.map(t => t.paymentMethod))].sort(), [data]);
  const filtering = !!(wallet || query.trim() || month || filters.type || filters.category || filters.payment);
  function clear() { setFilters({}); setQuery(''); setMonth(''); navigation.setParams({ wallet: undefined }); }
  const walletName = data?.wallets.find(w => w.id === wallet)?.name ?? 'Unknown Wallet';
  const summaryMonth = monthKey ?? localDate().slice(0, 7);
  const summary = useMemo(() => data ? spendingSummary(data, summaryMonth) : null, [data, summaryMonth]);
  const header = selecting ? undefined : <View style={{ gap: 12 }}>
    <Text style={ui.title}>Activity</Text>
    <Text style={ui.caption}>Your money, one moment at a time.</Text>
    <Field label="Search Activity" value={query} onChangeText={setQuery} placeholder="Category, wallet or note" autoCorrect={false} />
    <View style={ui.row}><BulsaButton secondary title="Filters" onPress={openFilters} /><BulsaButton secondary title="Select" disabled={!matchingIds.length || blocked} onPress={() => { setSelecting(true); setSelectedIds([]); }} /></View>
    <Text style={ui.caption}>Tap a record for details. Touch and hold an expense or income to select it.</Text>
    {filtering && <View><Text style={ui.caption}>Filtered records only. Your money totals are unchanged.</Text><BulsaButton secondary title="Clear All Filters" onPress={clear} /></View>}
    {wallet && <><Text style={ui.caption}>{walletName} Records</Text><BulsaButton secondary title="Show All Activity" onPress={() => navigation.setParams({ wallet: undefined })} /></>}
    {summary && !monthError && <View style={[ui.card, { backgroundColor: C.summary, borderRadius: 22, padding: 20, gap: 12 }]}>
      <Text style={[ui.body, { color: C.summaryMuted }]}>{monthKey ? `All Wallets · ${monthName(monthKey)}` : 'All Wallets This Month'}</Text>
      <Text style={[ui.money, { color: C.onSummary, fontSize: 36 }]}>{formatCentavos(summary.expenseCentavos)}</Text>
      <Text style={[ui.caption, { color: C.summaryMuted }]}>Across {summary.count} recorded expense{summary.count === 1 ? '' : 's'} · All wallets, before Activity filters.</Text>
    </View>}
    <BulsaButton secondary title="Reset Selected Data" onPress={() => router.push('/reset-data')} />
    {message && <View style={ui.soft}><Text style={ui.body} accessibilityLiveRegion="polite">{message}</Text><BulsaButton secondary title="Dismiss" onPress={() => navigation.setParams({ message: undefined })} /></View>}
  </View>;
  return <BulsaScreen scrollable={false} header={selecting ? selectionToolbar : undefined}>
    {(!data && loading) || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <SectionList
      style={{ flex: 1 }}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      sections={sections}
      extraData={selectedIds}
      keyExtractor={item => item.key}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={[ui.caption, { paddingVertical: 12 }]}>{displayDate(section.date)}</Text>}
      ListEmptyComponent={<View style={[ui.card, { marginTop: 20, gap: 16 }]}><Text style={ui.heading}>{filtering ? 'No Matching Records' : 'Your Story Starts Here'}</Text><Text style={ui.body}>{filtering ? 'Change or clear your filters to see more records.' : 'Record an expense, income or starting balance to see it here.'}</Text><BulsaButton title={filtering ? "Clear Filters" : "Add Expense or Income"} onPress={filtering ? clear : () => router.push('/entry')} /></View>}
      renderItem={({ item }) => {
        const eligible = item.type === 'expense' || item.type === 'income';
        const selected = eligible && chosenSet.has(item.key.slice('transaction-'.length));
        return <Pressable
          accessibilityRole={selecting && eligible ? 'checkbox' : 'button'}
          accessibilityLabel={`${item.title}, ${item.detail}, ${formatCentavos(item.amount)}`}
          accessibilityState={{ checked: selecting && eligible ? selected : undefined, disabled: blocked || (selecting && !eligible) }}
          accessibilityHint={selecting ? (eligible ? 'Select or deselect this record' : 'Only expenses and income can be selected') : 'Opens record details. Touch and hold expenses or income to select.'}
          disabled={blocked || (selecting && !eligible)}
          onLongPress={eligible ? () => toggleSelection(item.key) : undefined}
          onPress={() => selecting ? toggleSelection(item.key) : router.push({ pathname: '/activity-record', params: { record: item.key } })}
          style={({ pressed }) => [{ minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: selected ? C.soft : 'transparent', borderWidth: 1, borderColor: selected ? C.accent : 'transparent', opacity: pressed || (selecting && !eligible) ? 0.65 : 1 }]}
        >
          {selecting && eligible ? <View style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: C.accent, backgroundColor: selected ? C.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.onAccent, fontSize: 22 }}>{selected ? '✓' : ''}</Text></View> : <View style={{ width: 44, minHeight: 44, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={ui.heading}>{Array.from(item.title)[0]}</Text></View>}
          <View style={{ flex: 1, minWidth: 120, gap: 2 }}><Text style={[ui.body, { fontWeight: '700' }]}>{item.title}</Text><Text style={ui.caption}>{item.detail}</Text></View>
          <ActivityAmount item={item} />
        </Pressable>;
      }}
    />}
    {expanded && <CenteredPopup dismissOnBackdropPress onClose={() => setExpanded(false)}>
        <Text style={ui.title}>Filter Activity</Text>
        {wallet && !clearWallet && <Text style={ui.caption}>Wallet: {walletName}</Text>}
        <ActivityFilterPanel filters={draftFilters} month={draftMonth} monthError="" categories={categories} payments={payments} onChange={setDraftFilters} onMonth={setDraftMonth} onClear={() => { setDraftFilters({}); setDraftMonth(''); setClearWallet(true); }} />
        <BulsaButton title="Apply Filters" onPress={() => { setFilters(draftFilters); setMonth(draftMonth); if (clearWallet) navigation.setParams({ wallet: undefined }); setExpanded(false); }} />
    </CenteredPopup>}
    {deleteReview && <CenteredPopup onClose={finishSelection} busy={blocked}>
      <Text style={ui.title}>Delete {deleteReview.ids.length} Transactions?</Text>
      <Text style={ui.body}>Review exactly the selected records and their balance changes. Nothing has been deleted yet.</Text>
      {deleteReview.records.map(record => <View key={record.id} style={ui.card}><Text style={ui.heading}>{record.category}</Text><Text style={ui.body}>{record.type === 'expense' ? 'Expense' : 'Income'} · {displayDate(record.date)} · {formatCentavos(record.amountCentavos)}</Text><Text style={ui.caption}>{data?.wallets.find(w => w.id === record.walletId)?.name ?? 'General'} · {record.paymentMethod}</Text>{!!record.note && <Text style={ui.body}>{record.note}</Text>}</View>)}
      <MoneyReview before={deleteReview.before} after={deleteReview.after} walletIds={deleteReview.walletIds} />
      <Text style={ui.error}>Deleting multiple transactions is permanent. Undo is not available for this group deletion. Starting balances, transfers, adjustments and unselected transactions stay saved.</Text>
      {!!saveAction.error && <Text accessibilityLiveRegion="polite" style={ui.error}>{saveAction.error}</Text>}
      <BulsaButton title={saveAction.busy ? 'Deleting…' : `Delete ${deleteReview.ids.length} Transactions`} disabled={blocked || !!undo.record} onPress={() => void confirmSelectedDeletion()} />
      <BulsaButton secondary title="Refresh and Review Again" disabled={blocked} onPress={() => { setDeleteReview(null); void reload(true); }} />
      <BulsaButton secondary title="Keep Records" disabled={blocked} onPress={() => setDeleteReview(null)} />
    </CenteredPopup>}
    <UndoNotice onRestored={() => void reload(true)} />
  </BulsaScreen>;
}
