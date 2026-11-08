import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { BackButton, Field, ReadState, ui } from '../components/bulsa-form';
import { PocketButton } from '../components/pocket-button';
import { PocketScreen } from '../components/pocket-screen';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { newRecordId } from '../lib/form-money';
import { formatCentavos, parseAmountToCentavos } from '../lib/money';
import { localDate } from '../lib/validation';
import { saveTransaction } from '../storage/transactions';
import type { Transaction } from '../types/transaction';

export default function Entry() {
  const [id] = useState(() => newRecordId('entry'));
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(localDate);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [details, setDetails] = useState(false);
  const [payment, setPayment] = useState('');
  const [note, setNote] = useState('');
  const { balances, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const selected = balances?.wallets.find(w => w.id === walletId);

  async function save() {
    const saved = await run(async () => {
      const amountCentavos = parseAmountToCentavos(amount);
      if (amountCentavos === null) throw new Error('Enter an amount greater than zero, with up to two decimal places.');
      if (type === 'expense' && selected && selected.balanceCentavos < amountCentavos) {
        const proceed = await new Promise<boolean>(resolve => Alert.alert('Balance will be negative', `${selected.name} does not have enough recorded money. You can still record a real expense and correct missing funding later.`, [{ text: 'Keep editing', style: 'cancel', onPress: () => resolve(false) }, { text: 'Save expense', onPress: () => resolve(true) }]));
        if (!proceed) return false;
      }
      await saveTransaction({ id, type, amountCentavos, category: category.trim(), date, walletId, paymentMethod: payment.trim() || 'Not specified', note: note.trim() || undefined });
    });
    if (saved) router.replace({ pathname: '/activity', params: { message: type === 'expense' ? 'Expense saved' : 'Income saved' } });
  }

  if (picker) return <PocketScreen>
    <PocketButton secondary title="‹ Back to transaction" onPress={() => setPicker(false)} />
    <Text style={ui.title}>Choose wallet</Text>
    {loading || readError || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
      <Pressable style={[ui.card, walletId === null && ui.selected]} accessibilityRole="radio" accessibilityState={{ checked: walletId === null }} onPress={() => { setWalletId(null); setPicker(false); }}><Text style={ui.heading}>Not specified</Text><Text style={ui.caption}>General · Always included</Text></Pressable>
      {balances.wallets.filter(w => !w.hidden).map(w => <Pressable key={w.id} style={[ui.card, walletId === w.id && ui.selected]} accessibilityRole="radio" accessibilityState={{ checked: walletId === w.id }} onPress={() => { if (!w.configured) router.push({ pathname: '/wallets/[id]', params: { id: w.id } }); else { setWalletId(w.id); setPicker(false); } }}>
        <Text style={ui.heading}>{w.name}  ›</Text><Text style={ui.body}>{w.configured ? formatCentavos(w.balanceCentavos) : 'Set starting balance first'}</Text><Text style={ui.caption}>{w.included ? 'Included in total balance' : 'Not included'}</Text>
      </Pressable>)}
    </>}
  </PocketScreen>;

  return <PocketScreen>
    <BackButton disabled={busy} /><Text style={ui.title}>{type === 'expense' ? 'Add expense' : 'Add income'}</Text>
    <View style={ui.row}>{(['expense', 'income'] as const).map(value => <Pressable disabled={busy} key={value} accessibilityRole="radio" accessibilityState={{ checked: type === value }} style={[ui.choice, type === value && ui.selected]} onPress={() => { setType(value); setCategory(value === 'expense' ? 'Food' : 'Salary'); }}><Text style={ui.body}>{value === 'expense' ? 'Expense' : 'Income'}</Text></Pressable>)}</View>
    {loading || readError || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
      <Field label="Amount (PHP)" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} editable={!busy} />
      <Field label={type === 'expense' ? 'Category' : 'Income source'} value={category} onChangeText={setCategory} editable={!busy} />
      <PocketButton secondary disabled={busy} title={`Wallet: ${selected?.name ?? 'Not specified'}  ›`} onPress={() => setPicker(true)} />
      <Text style={ui.caption}>{walletId === null ? 'Not specified goes to General. General always counts in Total balance and can be negative.' : selected?.included ? 'This entry affects the wallet and Total balance.' : 'This entry affects this wallet only. Expenses still count in monthly spending.'}</Text>
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} editable={!busy} autoCapitalize="none" />
      <PocketButton secondary disabled={busy} title={details ? 'Fewer details' : 'More details · optional'} onPress={() => setDetails(value => !value)} />
      {details && <><Field label="Payment method · optional" value={payment} onChangeText={setPayment} editable={!busy} placeholder="Not set" /><Text style={ui.caption}>This is a label only. Cash does not select the Cash wallet.</Text><Field label="Note · optional" value={note} onChangeText={setNote} editable={!busy} multiline /></>}
      {type === 'expense' && <View style={ui.soft}><Text style={ui.body}>No monthly limit set</Text><Text style={ui.caption}>Your expense still counts in spending.</Text></View>}
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
      <PocketButton title={busy ? 'Saving…' : type === 'expense' ? 'Save expense' : 'Save income'} disabled={busy} onPress={() => void save()} />
    </>}
  </PocketScreen>;
}
