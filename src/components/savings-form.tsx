import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Text } from 'react-native';
import { PocketScreen } from './pocket-screen';
import { BackButton, Field, ReadState, ui } from './bulsa-form';
import { PocketButton } from './pocket-button';
import { useSaveAction } from '../hooks/use-ledger';
import { newRecordId } from '../lib/form-money';
import { parseAmountToCentavos } from '../lib/money';
import { centavosInput } from '../lib/editing';
import { displayDate, parseDisplayDate } from '../lib/display-date';
import { localDate } from '../lib/validation';
import { recordSavingsContribution, saveSavingsGoal, type SavingsGoal } from '../storage/savings';

export function SavingsForm({ initial, contribution = false, loading, readError, retry }: { initial?: SavingsGoal; contribution?: boolean; loading: boolean; readError: string; retry: () => void }) {
  const [original] = useState(initial);
  const [title, setTitle] = useState(original?.title ?? '');
  const [amount, setAmount] = useState(contribution ? '' : original ? centavosInput(original.targetCentavos) : '');
  const [date, setDate] = useState(() => displayDate(localDate()));
  const [note, setNote] = useState(''), [validation, setValidation] = useState('');
  const [id] = useState(() => newRecordId('savings'));
  const { busy, error, run } = useSaveAction();
  const blocked = busy || loading || !!readError;
  useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => busy); return () => sub.remove(); }, [busy]));
  async function save() {
    const cents = parseAmountToCentavos(amount);
    if (cents === null) { setValidation('Enter an amount above zero with up to two decimal places.'); return; }
    if (!contribution && !title.trim()) { setValidation('Enter a goal name.'); return; }
    let iso = '';
    try { if (contribution) iso = parseDisplayDate(date); }
    catch (cause) { setValidation((cause as Error).message); return; }
    setValidation('');
    const saved = await run(() => contribution
      ? recordSavingsContribution({ id, goalId: original!.id, amountCentavos: cents, date: iso, note })
      : saveSavingsGoal({ id: original?.id ?? 'main', title: title.trim(), targetCentavos: cents }));
    if (saved) router.back();
  }
  return <PocketScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>{contribution ? 'Record Savings' : original ? 'Edit Savings Goal' : 'Set Savings Goal'}</Text>
    {(loading || !!readError) && <ReadState loading={loading} error={readError} retry={retry} />}
    {contribution && !original ? <Text style={ui.body}>Set a savings goal first.</Text> : <>
      {contribution ? <Text style={ui.heading}>{original!.title}</Text> : <Field label="Goal Name" value={title} onChangeText={setTitle} editable={!blocked} />}
      <Field label={contribution ? 'Amount Saved (PHP)' : 'Savings Target (PHP)'} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" editable={!blocked} />
      {contribution && <><Field label="Date (MM-DD-YYYY)" value={date} onChangeText={setDate} placeholder="MM-DD-YYYY" maxLength={10} editable={!blocked} /><Field label="Note (Optional)" value={note} onChangeText={setNote} multiline editable={!blocked} /></>}
      <Text style={ui.caption}>{contribution ? 'This records money already saved. It does not deduct money from a wallet or Total Budget. Recording more than your target is allowed.' : 'Changing your goal keeps all previous savings records. This target is separate from wallet money and monthly spending limits.'}</Text>
      {!!validation && <Text style={ui.error}>{validation}</Text>}{!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
      <PocketButton title={busy ? 'Saving…' : contribution ? 'Save Savings Record' : 'Save Savings Goal'} disabled={blocked} onPress={() => void save()} />
    </>}
    <PocketButton secondary title="Cancel" disabled={busy} onPress={() => router.back()} />
  </PocketScreen>;
}
