import { CenteredPopup } from '../components/centered-popup';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { BulsaScreen } from '../components/bulsa-screen';
import { BulsaButton } from '../components/bulsa-button';
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
  const { colors: C } = useBulsaTheme();
  const { data, balances, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const [id] = useState(() => newRecordId('transfer'));
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [amount, setAmount] = useState(''), [note, setNote] = useState('');
  const [date, setDate] = useState(() => displayDate(localDate()));
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [review, setReview] = useState<{ record: Transfer; effects: ReturnType<typeof transferPreview> } | null>(null);
  const [validation, setValidation] = useState('');
  const visibleWallets = balances?.wallets.filter(w => !w.hidden) ?? [];
  const requiredAmount = parseAmountToCentavos(amount) ?? 1;
  const priority = (wallet: (typeof visibleWallets)[number]) => !wallet.configured ? 1 : picker === 'from' && wallet.balanceCentavos < requiredAmount ? 2 : 0;
  const choices = visibleWallets.filter(w => w.id !== (picker === 'from' ? to : from)).sort((a, b) => priority(a) - priority(b));
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
      if (!from) throw new Error('Choose the wallet the money came from.');
      if (!to) throw new Error('Choose the wallet that received the money.');
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
  function walletRow(wallet: (typeof choices)[number], index: number, rows: typeof choices) {
    const insufficient = picker === 'from' && wallet.configured && wallet.balanceCentavos < requiredAmount;
    const disabled = busy || insufficient;
    return <Pressable key={wallet.id} accessibilityRole="button" accessibilityLabel={wallet.configured ? wallet.name : `Set Up ${wallet.name}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => {
      if (!wallet.configured) { router.push({ pathname: '/wallets/[id]', params: { id: wallet.id } }); return; }
      if (picker === 'from') setFrom(wallet.id); else setTo(wallet.id);
      setPicker(null);
    }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: C.track, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={[ui.body, { fontWeight: '600' }]}>{wallet.name}</Text>
        {wallet.configured && <Text style={ui.caption}>{insufficient ? 'Not enough recorded money' : wallet.included ? 'Included in Total Budget' : 'Not Included'}</Text>}
      </View>
      <Text style={wallet.configured ? ui.body : [ui.body, { color: C.accent }]}>{wallet.configured ? formatCentavos(wallet.balanceCentavos) : 'Set Up'}</Text>
      <Text accessible={false} style={[ui.body, { color: C.accent }]}>›</Text>
    </Pressable>;
  }
  const configuredChoices = choices.filter(wallet => wallet.configured);
  const setupChoices = choices.filter(wallet => !wallet.configured);
  if (picker) return <BulsaScreen key={picker} header={<BackButton disabled={busy} onPress={() => setPicker(null)} />}>
    <Text style={ui.title}>{picker === 'from' ? 'Transfer From' : 'Transfer To'}</Text>
    {loading || readError || !data || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
      <Text style={ui.caption}>{picker === 'from' ? 'Choose the wallet the money came from.' : 'Choose the wallet that received the money. Its balance can be ₱0.'}</Text>
      {!choices.length && <Text style={ui.body}>No other visible wallet is available. Add a wallet to record this transfer.</Text>}
      {!!configuredChoices.length && <View style={[ui.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>{configuredChoices.map(walletRow)}</View>}
      {!!setupChoices.length && <>
        <View style={{ gap: 4 }}><Text style={ui.heading}>Set Up Another Wallet</Text><Text style={ui.caption}>Enter its balance before this transfer, then return to select it. If it was empty, use ₱0.</Text></View>
        <View style={[ui.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>{setupChoices.map(walletRow)}</View>
      </>}
      <BulsaButton secondary title="Add Wallet" disabled={busy} onPress={() => router.push('/wallets/add')} />
    </>}
  </BulsaScreen>;
  return <BulsaScreen key="transfer" header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>{'Transfer Money Between Wallets'}</Text>
    <Text style={ui.caption}>Record money you already moved from one account to another. Bulsa updates your records only.</Text>
    {loading || readError || !data || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
    {review && <CenteredPopup onClose={() => setReview(null)} busy={busy}><Text style={ui.title}>Review Transfer</Text>
      <Text style={ui.heading}>{names.get(from)} → {names.get(to)}</Text><Text style={ui.body}>{formatCentavos(review.record.amountCentavos)} · {displayDate(review.record.date)}</Text>
      {!!review.record.note && <Text style={ui.body}>{review.record.note}</Text>}
      <MoneyReview {...review.effects} walletIds={[from, to]} />
      <Text style={ui.caption}>This records a transfer, not income or spending. Crossing included/excluded wallets can change Total Budget. Bulsa does not move real money.</Text>
      <BulsaButton title={busy ? 'Saving…' : 'Confirm Transfer'} disabled={busy} onPress={() => void save()} />
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
      <BulsaButton secondary title="Keep Editing" disabled={busy} onPress={() => setReview(null)} />
    </CenteredPopup>}
      <BulsaButton secondary title={`From: ${names.get(from) ?? 'Choose Wallet'}`} disabled={busy} onPress={() => setPicker('from')} />
      <BulsaButton secondary title={`To: ${names.get(to) ?? 'Choose Wallet'}`} disabled={busy} onPress={() => setPicker('to')} />
      <Field editable={!busy} label="Amount (PHP)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      <Field editable={!busy} label="Date (MM-DD-YYYY)" value={date} onChangeText={setDate} maxLength={10} />
      <Field editable={!busy} label="Note · Optional" value={note} onChangeText={setNote} multiline />
      <BulsaButton title="Review Transfer" disabled={busy} onPress={prepare} />
    </>}
    {!!validation && <Text style={ui.error}>{validation}</Text>}
    {!!error && <><Text style={ui.error}>{error}</Text><BulsaButton secondary title="Refresh and Review Again" disabled={busy} onPress={() => { setReview(null); void reload(); }} /></>}
  </BulsaScreen>;
}
