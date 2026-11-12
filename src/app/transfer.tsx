import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { PocketScreen } from '../components/pocket-screen';
import { PocketButton } from '../components/pocket-button';
import { BackButton, Field, ReadState, useUI } from '../components/bulsa-form';
import { MoneyReview } from '../components/money-review';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { transferPreview } from '../lib/transfers';
import { newRecordId } from '../lib/form-money';
import { parseAmountToCentavos, formatCentavos } from '../lib/money';
import { displayDate, parseDisplayDate } from '../lib/display-date';
import { localDate } from '../lib/validation';
import { recordTransfer } from '../storage/wallets';
import type { Transfer } from '../types/wallet';

export default function TransferScreen() {
  const ui = useUI();
  const { data, balances, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const [id] = useState(() => newRecordId('transfer'));
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [amount, setAmount] = useState(''), [note, setNote] = useState('');
  const [date, setDate] = useState(() => displayDate(localDate()));
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [review, setReview] = useState<{ record: Transfer; effects: ReturnType<typeof transferPreview> } | null>(null);
  const [validation, setValidation] = useState('');
  const eligible = balances?.wallets.filter(w => w.configured && !w.hidden) ?? [];
  const names = new Map(balances?.wallets.map(w => [w.id, w.name]));
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (picker) { setPicker(null); return true; }
      if (review) { setReview(null); return true; } return false;
    }); return () => sub.remove();
  }, [busy, picker, review]));
  function prepare() {
    try {
      const cents = parseAmountToCentavos(amount);
      if (!data || cents === null) throw new Error('Enter a positive amount with up to two decimal places.');
      const record = { id, fromWalletId: from, toWalletId: to, amountCentavos: cents, date: parseDisplayDate(date), note: note.trim() };
      setReview({ record, effects: transferPreview(data, record) }); setValidation('');
    } catch (cause) { setValidation(cause instanceof Error ? cause.message : 'Check the transfer.'); }
  }
  async function save() {
    if (!review) return;
    const saved = await run(() => recordTransfer(review.record, 'bulsa.db', review.effects.signature));
    if (saved) router.replace({ pathname: '/activity', params: { message: 'Transfer recorded. Income and spending are unchanged.' } });
  }
  if (picker) return <PocketScreen header={<BackButton onPress={() => setPicker(null)} />}>
    <Text style={ui.title}>{picker === 'from' ? 'Transfer From' : 'Transfer To'}</Text>
    {eligible.filter(w => w.id !== (picker === 'from' ? to : from)).map(w => <View key={w.id} style={ui.card}><PocketButton secondary title={w.name} onPress={() => { if (picker === 'from') setFrom(w.id); else setTo(w.id); setPicker(null); }} /><Text style={ui.body}>{formatCentavos(w.balanceCentavos)} · {w.included ? 'Included' : 'Excluded'}</Text></View>)}
    <Text style={ui.caption}>Only visible wallets with starting balances are eligible. General cannot be transferred.</Text>
  </PocketScreen>;
  return <PocketScreen header={<BackButton disabled={busy} onPress={review ? () => setReview(null) : undefined} />}>
    <Text style={ui.title}>{review ? 'Review Transfer' : 'Transfer Between Wallets'}</Text>
    {(!data && loading) || readError ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : review ? <>
      <Text style={ui.heading}>{names.get(from)} → {names.get(to)}</Text><Text style={ui.body}>{formatCentavos(review.record.amountCentavos)} · {displayDate(review.record.date)}</Text>
      {!!review.record.note && <Text style={ui.body}>{review.record.note}</Text>}
      <MoneyReview {...review.effects} walletIds={[from, to]} />
      <Text style={ui.caption}>This records a transfer, not income or spending. Crossing included/excluded wallets can change Total Budget. Bulsa does not move real money.</Text>
      <PocketButton title={busy ? 'Saving…' : 'Confirm Transfer'} disabled={busy} onPress={() => void save()} />
      <PocketButton secondary title="Keep Editing" disabled={busy} onPress={() => setReview(null)} />
    </> : eligible.length < 2 ? <>
      <Text style={ui.body}>Set starting balances for at least two visible wallets first.</Text><PocketButton title="Manage Wallets" onPress={() => router.push('/wallets')} />
    </> : <>
      <PocketButton secondary title={`From: ${names.get(from) ?? 'Choose Wallet'}`} onPress={() => setPicker('from')} />
      <PocketButton secondary title={`To: ${names.get(to) ?? 'Choose Wallet'}`} onPress={() => setPicker('to')} />
      <Field label="Amount (PHP)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      <Field label="Date (MM-DD-YYYY)" value={date} onChangeText={setDate} maxLength={10} />
      <Field label="Note · Optional" value={note} onChangeText={setNote} multiline />
      <PocketButton title="Review Transfer" onPress={prepare} />
    </>}
    {!!validation && <Text style={ui.error}>{validation}</Text>}
    {!!error && <><Text style={ui.error}>{error}</Text><PocketButton secondary title="Refresh and Review Again" disabled={busy} onPress={() => { setReview(null); void reload(); }} /></>}
  </PocketScreen>;
}
