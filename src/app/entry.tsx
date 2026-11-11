import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { BackButton, Field, ReadState, ui } from '../components/bulsa-form';
import { CategoryPicker } from '../components/category-picker';
import { PocketButton } from '../components/pocket-button';
import { PocketScreen } from '../components/pocket-screen';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { newRecordId } from '../lib/form-money';
import { formatCentavos, parseAmountToCentavos } from '../lib/money';
import { localDate } from '../lib/validation';
import { displayDate, parseDisplayDate } from '../lib/display-date';
import { saveTransaction } from '../storage/transactions';
import type { Transaction } from '../types/transaction';

export default function Entry() {
  const [id] = useState(() => newRecordId('entry'));
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(() => displayDate(localDate()));
  const [choicesBusy, setChoicesBusy] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [details, setDetails] = useState(false);
  const [payment, setPayment] = useState('');
  const [note, setNote] = useState('');
  const { balances, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const blocked = busy || choicesBusy;
  const selected = balances?.wallets.find(w => w.id === walletId);

  async function save() {
    if (choicesBusy) return;
    const saved = await run(async () => {
      const storedDate = parseDisplayDate(date);
      const amountCentavos = parseAmountToCentavos(amount);
      if (amountCentavos === null) throw new Error('Enter an amount greater than zero, with up to two decimal places.');
      if (type === 'expense' && selected && selected.balanceCentavos < amountCentavos) {
        const proceed = await new Promise<boolean>(resolve => Alert.alert('Balance will be negative', `${selected.name} does not have enough recorded money. You can still record a real expense and correct missing funding later.`, [{ text: 'Keep Editing', style: 'cancel', onPress: () => resolve(false) }, { text: 'Save Expense', onPress: () => resolve(true) }]));
        if (!proceed) return false;
      }
      await saveTransaction({ id, type, amountCentavos, category, date: storedDate, walletId, paymentMethod: payment.trim() || 'Not specified', note: note.trim() || undefined });
    });
    if (saved) router.replace({ pathname: '/activity', params: { message: type === 'expense' ? 'Expense saved' : 'Income saved' } });
  }

  if (picker) return <PocketScreen header={<BackButton title="‹ Back to Transaction" onPress={() => setPicker(false)} />}>
    <Text style={ui.title}>Choose Wallet</Text>
    {loading || readError || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
      <Pressable style={[ui.card, walletId === null && ui.selected]} accessibilityRole="radio" accessibilityState={{ checked: walletId === null }} onPress={() => { setWalletId(null); setPicker(false); }}><Text style={ui.heading}>Not Specified</Text><Text style={ui.caption}>General · Always Included</Text></Pressable>
      {balances.wallets.filter(w => !w.hidden).map(w => <Pressable key={w.id} style={[ui.card, walletId === w.id && ui.selected]} accessibilityRole="radio" accessibilityState={{ checked: walletId === w.id }} onPress={() => { if (!w.configured) router.push({ pathname: '/wallets/[id]', params: { id: w.id } }); else { setWalletId(w.id); setPicker(false); } }}>
        <Text style={ui.heading}>{w.name}  ›</Text><Text style={ui.body}>{w.configured ? formatCentavos(w.balanceCentavos) : 'Starting Balance Not Set'}</Text><Text style={ui.caption}>{w.included ? 'Included in Total Budget' : 'Not Included'}</Text>
      </Pressable>)}
    </>}
  </PocketScreen>;

  return <PocketScreen header={<BackButton disabled={blocked} />}>
    <Text style={ui.title}>{type === 'expense' ? 'Add Expense' : 'Add Income'}</Text>
    <View style={ui.row}>{(['expense', 'income'] as const).map(value => <Pressable disabled={blocked} key={value} accessibilityRole="radio" accessibilityState={{ checked: type === value, disabled: blocked }} style={[ui.choice, type === value && ui.selected]} onPress={() => { setType(value); setCategory(value === 'expense' ? 'Food' : 'Salary'); }}><Text style={ui.body}>{value === 'expense' ? 'Expense' : 'Income'}</Text></Pressable>)}</View>
    {loading || readError || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
      <Field label="Amount (PHP)" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} editable={!blocked} />
      <CategoryPicker key={type} kind={type} value={category} onChange={setCategory} disabled={busy} onBusyChange={setChoicesBusy} />
      <PocketButton secondary disabled={blocked} title={`Wallet: ${selected?.name ?? 'Not Specified'}  ›`} onPress={() => setPicker(true)} />
      <Text style={ui.caption}>{walletId === null ? 'Not specified goes to General. General always counts in Total Budget and can be negative.' : selected?.included ? 'This entry affects the wallet and Total Budget.' : 'This entry affects this wallet only. Expenses still count in monthly spending.'}</Text>
      <Field label="Date (MM-DD-YYYY)" placeholder="MM-DD-YYYY" value={date} onChangeText={setDate} editable={!blocked} autoCapitalize="none" autoCorrect={false} maxLength={10} />
      <PocketButton secondary disabled={blocked} title={details ? 'Fewer Details' : 'More Details · Optional'} onPress={() => setDetails(value => !value)} />
      {details && <><Field label="Payment Method · Optional" value={payment} onChangeText={setPayment} editable={!blocked} placeholder="Not Set" /><Text style={ui.caption}>This is a label only. Cash does not select the Cash wallet.</Text><Field label="Note · Optional" value={note} onChangeText={setNote} editable={!blocked} multiline /></>}
      {type === 'expense' && <View style={ui.soft}><Text style={ui.body}>No Monthly Limit Set</Text><Text style={ui.caption}>Your expense still counts in spending.</Text></View>}
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
      <PocketButton title={busy ? 'Saving…' : type === 'expense' ? 'Save Expense' : 'Save Income'} disabled={blocked} onPress={() => void save()} />
    </>}
  </PocketScreen>;
}
