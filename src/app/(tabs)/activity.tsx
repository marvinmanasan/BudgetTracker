import { useBulsaTheme } from '@/hooks/use-bulsa-theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { PocketScreen } from '@/components/pocket-screen';
import { PocketButton } from '@/components/pocket-button';
import { Field, ReadState, useUI } from '@/components/bulsa-form';
import { ActivityAmount } from '@/components/activity-amount';
import { useLedger } from '@/hooks/use-ledger';
import { filterActivitySections, parseActivityMonth, spendingSummary, type ActivityFilters } from '@/lib/activity';
import { ActivityFilterPanel } from '@/components/activity-filters';
import { UndoNotice } from '@/components/undo-notice';

import { formatCentavos } from '@/lib/money';
import { localDate } from '@/lib/validation';
import { displayDate, displayMonth } from '@/lib/display-date';

export default function Activity() {
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const { message, wallet } = useLocalSearchParams<{ message?: string; wallet?: string }>();
  const { data, loading, error, reload } = useLedger();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('');
  const [expanded, setExpanded] = useState(false);
  let monthKey: string | undefined;
  let monthError = '';
  try { monthKey = parseActivityMonth(month); } catch (cause) { monthError = (cause as Error).message; }
  const sections = useMemo(() => data && !monthError ? filterActivitySections(data, { ...filters, query, wallet, month: monthKey }) : [], [data, filters, query, wallet, monthKey, monthError]);
  const categories = useMemo(() => [...new Set(data?.transactions.map(t => t.category))].sort(), [data]);
  const payments = useMemo(() => [...new Set(data?.transactions.map(t => t.paymentMethod))].sort(), [data]);
  const filtering = !!(wallet || query.trim() || month || filters.type || filters.category || filters.payment);
  function clear() { setFilters({}); setQuery(''); setMonth(''); router.setParams({ wallet: undefined }); }
  const walletName = data?.wallets.find(w => w.id === wallet)?.name ?? 'Unknown Wallet';
  const summaryMonth = monthKey ?? localDate().slice(0, 7);
  const summary = useMemo(() => data ? spendingSummary(data, summaryMonth) : null, [data, summaryMonth]);
  const header = <View style={{ gap: 12 }}>
    <Text style={ui.title}>Activity</Text>
    <Text style={ui.caption}>Your money, one moment at a time.</Text>
    <Field label="Search Activity" value={query} onChangeText={setQuery} placeholder="Category, wallet or note" autoCorrect={false} />
    <PocketButton secondary title={expanded ? "Hide Filters" : "Filters"} onPress={() => setExpanded(value => !value)} />
    {expanded && <ActivityFilterPanel filters={filters} month={month} monthError={monthError} categories={categories} payments={payments} onChange={setFilters} onMonth={setMonth} onClear={clear} />}
    {!expanded && !!monthError && <Text style={ui.error}>{monthError}</Text>}
    {filtering && <View><Text style={ui.caption}>Filtered records only. Your money totals are unchanged.</Text><PocketButton secondary title="Clear All Filters" onPress={clear} /></View>}
    {wallet && <><Text style={ui.caption}>{walletName} Records</Text><PocketButton secondary title="Show All Activity" onPress={() => router.setParams({ wallet: undefined })} /></>}
    {summary && !monthError && <View style={[ui.card, { backgroundColor: C.summary, borderRadius: 22, padding: 20, gap: 12 }]}>
      <Text style={[ui.body, { color: C.summaryMuted }]}>{monthKey ? `Spent In ${displayMonth(monthKey)}` : 'Spent This Month'}</Text>
      <Text style={[ui.money, { color: C.onSummary, fontSize: 36 }]}>{formatCentavos(summary.expenseCentavos)}</Text>
      <Text style={[ui.caption, { color: C.summaryMuted }]}>Across {summary.count} recorded expense{summary.count === 1 ? '' : 's'} · All wallets, before Activity filters.</Text>
    </View>}
    <PocketButton secondary title="Reset Selected Data" onPress={() => router.push('/reset-data')} />
    {message && <View style={ui.soft}><Text style={ui.body} accessibilityLiveRegion="polite">{message}</Text><PocketButton secondary title="Dismiss" onPress={() => router.setParams({ message: undefined })} /></View>}
  </View>;
  return <PocketScreen scrollable={false}>
    {(!data && loading) || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <SectionList
      style={{ flex: 1 }}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      sections={sections}
      keyExtractor={item => item.key}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={[ui.caption, { paddingVertical: 12 }]}>{displayDate(section.date)}</Text>}
      ListEmptyComponent={<View style={ui.card}><Text style={ui.heading}>{filtering ? 'No Matching Records' : 'Your Story Starts Here'}</Text><Text style={ui.body}>{filtering ? 'Change or clear your filters to see more records.' : 'Record an expense, income or starting balance to see it here.'}</Text><PocketButton title="Add Expense or Income" onPress={() => router.push('/entry')} /></View>}
      renderItem={({ item }) => <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens record details"
        onPress={() => router.push({ pathname: '/activity-record', params: { record: item.key } })}
        style={({ pressed }) => [{ minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={{ width: 44, minHeight: 44, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={ui.heading}>{Array.from(item.title)[0]}</Text></View>
        <View style={{ flex: 1, minWidth: 120, gap: 2 }}><Text style={[ui.body, { fontWeight: '700' }]}>{item.title}</Text><Text style={ui.caption}>{item.detail}</Text></View>
        <ActivityAmount item={item} />
      </Pressable>}
    />}
    <UndoNotice onRestored={() => void reload(true)} />
  </PocketScreen>;
}
