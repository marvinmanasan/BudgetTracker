import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { getChoices } from '../storage/choices';
import { saveCategoryAllocations, type CategoryPlan } from '../storage/categories';
import { PRESET_CHOICES } from '../lib/choices';
import { centavosInput } from '../lib/editing';
import { parseBalance } from '../lib/form-money';
import { formatCentavos } from '../lib/money';
import { monthName } from '../lib/display-date';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { BulsaScreen } from './bulsa-screen';
import { BulsaButton } from './bulsa-button';
import { BackButton, Field, useUI } from './bulsa-form';

export function CategoryLimitForm({ month, initial, sourceError, sourceLoading, retry }: { month: string; initial: CategoryPlan; sourceError: string; sourceLoading: boolean; retry: () => void }) {
  const router = useRouter();
  const ui = useUI();
  const [original] = useState(initial);
  const [rows] = useState(() => original.allocations.map(a => ({ category: a.category, amount: centavosInput(a.limitCentavos) })));
  const [category, setCategory] = useState(''), [amount, setAmount] = useState('');
  const [custom, setCustom] = useState<string[]>([]), [choicesError, setChoicesError] = useState('');
  const [draftError, setDraftError] = useState('');
  const mounted = useRef(false);
  const { data } = useLedger();
  const { busy, error, run } = useSaveAction();
  const blocked = busy || sourceLoading || !!sourceError;
  const readChoices = useCallback(async () => {
    try { const next = await getChoices('expense'); if (mounted.current) { setCustom(next.map(c => c.name)); setChoicesError(''); } }
    catch (cause) { if (mounted.current) setChoicesError(cause instanceof Error ? cause.message : 'Could not read choices.'); }
  }, []);
  useEffect(() => { mounted.current = true; let active = true; void getChoices('expense').then(next => { if (active) setCustom(next.map(c => c.name)); }).catch(cause => { if (active) setChoicesError(cause instanceof Error ? cause.message : 'Could not read choices.'); }); return () => { active = false; mounted.current = false; }; }, []);
  useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => busy); return () => sub.remove(); }, [busy]));
  const options = [...new Set([...PRESET_CHOICES.expense, ...custom, ...rows.map(r => r.category), ...(data?.transactions.filter(t => t.type === 'expense').map(t => t.category) ?? [])])].filter(name => name.trim().toLowerCase() !== 'everything else');
  const cap = original.limitCentavos;
  const allocated = rows.reduce((sum, row) => sum + BigInt(parseBalance(row.amount) ?? 0), 0n);
  async function save(nextRows = rows) {
    const saved = await run(() => saveCategoryAllocations(month, nextRows.map(row => ({ category: row.category, limitCentavos: parseBalance(row.amount)! })), 'bulsa.db', original.signature));
    if (saved) router.back();
  }
  function saveCategory() {
    const cents = parseBalance(amount);
    if (!category || cents === null || cents < 0) { setDraftError('Choose a category and enter zero or more.'); return; }
    const next = [...rows.filter(row => row.category !== category), { category, amount }];
    const sum = next.reduce((total, row) => total + BigInt(parseBalance(row.amount)!), 0n);
    if (cap === null || sum > BigInt(cap)) { setDraftError('Category limits cannot exceed the monthly limit.'); return; }
    setDraftError('');
    void save(next);
  }
  return <BulsaScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>Category Limits</Text><Text style={ui.body}>{monthName(month)}</Text>
    {!!sourceError && <><Text style={ui.error}>{sourceError}</Text><BulsaButton secondary title="Try Again" disabled={busy} onPress={retry} /></>}
    {cap === null ? <><Text style={ui.body}>Set a monthly limit first.</Text><BulsaButton title="Set Monthly Limit" onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} /></> : <>
      <Text style={ui.body}>Monthly Limit: {formatCentavos(cap)}</Text>
      {rows.map(row => <View key={row.category} style={ui.card}><Text style={ui.heading}>{row.category}</Text><Text style={ui.body}>{row.amount} PHP</Text><BulsaButton secondary title="Edit Allocation" disabled={blocked} onPress={() => { setCategory(row.category); setAmount(row.amount); }} /><BulsaButton secondary title="Remove Allocation" disabled={blocked} onPress={() => void save(rows.filter(r => r.category !== row.category))} /></View>)}
      <Text style={ui.heading}>Choose Category</Text>
      <View style={ui.row}>{options.map(name => <BulsaButton key={name} secondary={category !== name} title={name} disabled={blocked} onPress={() => setCategory(name)} />)}</View>
      {!!choicesError && <><Text style={ui.error}>{choicesError}</Text><BulsaButton secondary title="Reload Choices" disabled={blocked} onPress={() => void readChoices()} /></>}
      <Field label="Category Limit (PHP)" value={amount} onChangeText={setAmount} editable={!blocked} keyboardType="decimal-pad" placeholder="0.00" />
      {!!draftError && <Text accessibilityLiveRegion="polite" style={ui.error}>{draftError}</Text>}{!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
      <BulsaButton title={busy ? 'Saving…' : 'Save Category Limit'} disabled={blocked} onPress={saveCategory} />
      <Text style={ui.body}>Everything Else: {allocated <= BigInt(cap) ? formatCentavos(Number(BigInt(cap) - allocated)) : 'Allocations exceed monthly limit'}</Text>
      <Text style={ui.caption}>Choose a category and save its limit. Everything Else receives the amount left in your monthly plan.</Text>
      {(!!category || !!amount) && <BulsaButton secondary title="Clear Current Input" disabled={blocked} onPress={() => { setCategory(''); setAmount(''); }} />}
    </>}
    <BulsaButton secondary title="Cancel" disabled={busy} onPress={() => router.back()} />
  </BulsaScreen>;
}
