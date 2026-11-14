import { CenteredPopup } from './centered-popup';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { BackButton, Field, ReadState, useUI } from './bulsa-form';
import { CategoryPicker } from './category-picker';
import { BulsaButton } from './bulsa-button';
import { MonthlyLimitNotice } from './monthly-limit-notice';
import { monthlyTotals } from '../lib/ledger';
import { MoneyReview } from './money-review';
import { BulsaScreen } from './bulsa-screen';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { newRecordId } from '../lib/form-money';
import { formatCentavos, parseAmountToCentavos } from '../lib/money';
import { expenseWalletChoices, expenseAvailable } from '../lib/expense-wallets';
import { localDate } from '../lib/validation';
import { displayDate, parseDisplayDate } from '../lib/display-date';
import { saveTransaction, updateTransaction } from '../storage/transactions';
import { transactionDraft, editedTransaction, editPreview, balanceEffectsSignature } from '../lib/editing';
import type { Transaction } from '../types/transaction';

export function EntryForm({ original, initialType }: { original?: Transaction; initialType?: Transaction['type'] }) {
  const ledger = useLedger();
  return <EntryFields original={original} ledger={ledger} initialType={initialType} />;
}

export function EntryFields({ original: incoming, ledger, initialType = 'expense' }: { original?: Transaction; initialType?: Transaction['type']; ledger: ReturnType<typeof useLedger> }) {
  const router = useRouter();
  const ui = useUI();
  const [original] = useState(incoming);
  const initial = original ? transactionDraft(original) : undefined;
  const [reviewing, setReviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [id] = useState(() => original?.id ?? newRecordId('entry'));
  const [type, setType] = useState<Transaction['type']>(original?.type ?? initialType);
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [category, setCategory] = useState(initial?.category ?? (type === 'income' ? 'Salary' : 'Food'));
  const [date, setDate] = useState(() => initial?.date ?? displayDate(localDate()));
  const [choicesBusy, setChoicesBusy] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(initial?.walletId ?? null);
  const [picker, setPicker] = useState(false);
  const [setupWallet, setSetupWallet] = useState<{ id: string; previous: typeof ledger.data } | null>(null);
  const [details, setDetails] = useState(false);
  const [payment] = useState(initial?.payment ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const { data, balances, loading, error: readError, reload } = ledger;
  const { busy, error, run } = useSaveAction();
  const blocked = busy || choicesBusy;
  const selected = balances?.wallets.find(w => w.id === walletId);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (blocked) return true;
      if (picker) { setPicker(false); return true; }
      if (reviewing) { setReviewing(false); return true; }
      return false;
    });
    return () => listener.remove();
  }, [blocked, picker, reviewing]));

  // Resolve the pending choice once, against the ledger refreshed on return.
  if (setupWallet && !loading && balances && data !== setupWallet.previous) {
    if (balances.wallets.some(w => w.id === setupWallet.id && w.configured)) {
      setWalletId(setupWallet.id);
      setPicker(false);
    }
    setSetupWallet(null);
  }

  const draft = { amount, category, date, walletId, payment, note };
  let preview: ReturnType<typeof editPreview> | undefined;
  let validation = '';
  if (original && data && reviewing) {
    try { preview = editPreview(data, editedTransaction(original, draft)); }
    catch (cause) { validation = cause instanceof Error ? cause.message : 'Check your fields.'; }
  }

  let entryMonth: string | undefined;
  try { entryMonth = parseDisplayDate(date).slice(0, 7); } catch { /* Validation is shown when saving. */ }
  const monthSpent = data && entryMonth ? monthlyTotals(data, entryMonth).expenseCentavos : 0;
  const draftAmount = parseAmountToCentavos(amount);
  const previousEffect = original?.type === 'expense' && entryMonth && original.date.startsWith(entryMonth + '-') ? original.amountCentavos : 0;
  const projectedAmount = draftAmount === null ? undefined : Number(BigInt(monthSpent) - BigInt(previousEffect) + BigInt(draftAmount));
  const projected = projectedAmount !== undefined && Number.isSafeInteger(projectedAmount) && projectedAmount >= 0 ? projectedAmount : undefined;

  async function save() {
    if (choicesBusy) return;
    const saved = await run(async () => {
      if (original) {
        if (!preview) throw new Error('Review your changes before saving.');
        await updateTransaction(editedTransaction(original, draft), 'bulsa.db', original, balanceEffectsSignature(preview));
        return;
      }
      const storedDate = parseDisplayDate(date);
      const amountCentavos = parseAmountToCentavos(amount);
      if (amountCentavos === null) throw new Error('Enter an amount greater than zero, with up to two decimal places.');
      if (type === 'expense' && selected && selected.balanceCentavos < amountCentavos) throw new Error('Not enough money in this wallet. Choose another wallet or lower the expense.');
      await saveTransaction({ id, type, amountCentavos, category, date: storedDate, walletId, paymentMethod: payment.trim() || 'Not specified', note: note.trim() || undefined });
    });
    if (saved && original) { router.back(); return; }
    if (saved) router.replace({ pathname: '/activity', params: { message: `${type === 'expense' ? 'Expense saved' : 'Income saved'} · ${selected?.name ?? 'General'}` } });
  }

  if (picker) return <BulsaScreen header={<BackButton title="‹ Back to Transaction" onPress={() => setPicker(false)} />}>
    <Text style={ui.title}>Choose Wallet</Text>
    {loading || readError || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
      <Pressable style={[ui.card, walletId === null && ui.selected]} accessibilityRole="radio" accessibilityState={{ checked: walletId === null }} onPress={() => { setWalletId(null); setPicker(false); }}><Text style={ui.heading}>General</Text><Text style={ui.caption}>Always included in Total Budget. Can go below zero.</Text></Pressable>
      {(type === 'expense' ? expenseWalletChoices(balances.wallets, original) : balances.wallets.filter(w => !w.hidden || w.id === original?.walletId)).map(w => {
        const available = expenseAvailable(w, original);
        const insufficient = type === 'expense' && draftAmount !== null && draftAmount > available && !(original?.walletId === w.id && draftAmount <= original.amountCentavos);
        return <Pressable key={w.id} disabled={insufficient} style={[ui.card, walletId === w.id && ui.selected, insufficient && { opacity: 0.55 }]} accessibilityRole="radio" accessibilityState={{ checked: walletId === w.id, disabled: insufficient }} onPress={() => { if (!w.configured) {
          setSetupWallet({ id: w.id, previous: data });
          router.push({ pathname: '/wallets/[id]', params: { id: w.id, setup: 'entry' } });
        } else { setWalletId(w.id); setPicker(false); } }}>
          <Text style={ui.heading}>{w.configured ? w.name : `Set Up ${w.name}`}  ›</Text><Text style={ui.body}>{w.configured ? formatCentavos(available) : 'Starting Balance Not Set'}</Text><Text style={ui.caption}>{insufficient ? 'Not Enough for This Expense' : w.included ? 'Included in Total Budget' : 'Not Included'}</Text>
        </Pressable>;
      })}
      {type === 'expense' && <Text style={ui.caption}>Only funded wallets are shown. Enter an amount to check which can cover it. Manage starting balances in Wallets.</Text>}
    </>}
  </BulsaScreen>;



  return <BulsaScreen header={<BackButton disabled={blocked} />}>
    <Text style={ui.title}>{original ? (type === 'expense' ? 'Edit Expense' : 'Edit Income') : type === 'expense' ? 'Add Expense' : 'Add Income'}</Text>
    {!original && <View style={ui.row}>{(['expense', 'income'] as const).map(value => <Pressable disabled={blocked} key={value} accessibilityRole="radio" accessibilityState={{ checked: type === value, disabled: blocked }} style={[ui.choice, type === value && ui.selected]} onPress={() => { setType(value); setCategory(value === 'expense' ? 'Food' : 'Salary'); }}><Text style={ui.body}>{value === 'expense' ? 'Expense' : 'Income'}</Text></Pressable>)}</View>}
    {loading || readError || !balances ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : <>
      <Field label="Amount (PHP)" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} editable={!blocked} />
      <BulsaButton secondary disabled={blocked} title={`Wallet: ${selected?.name ?? 'General'}  ›`} onPress={() => setPicker(true)} />
      <Text style={ui.caption}>{walletId === null ? 'Use General when you don’t want to choose a wallet. It counts in Total Budget and can go below zero.' : selected?.included ? 'This entry affects the wallet and Total Budget.' : 'This entry affects this wallet only. Expenses still count in monthly spending.'}</Text>
      {original && <Text style={ui.caption}>Current {type === 'income' ? 'source' : 'category'}: {category}. Older labels stay available on this record.</Text>}
      <CategoryPicker retainedValue={original?.category} key={type} kind={type} value={category} onChange={setCategory} disabled={busy} onBusyChange={setChoicesBusy} />
      <Field label="Date (MM-DD-YYYY)" placeholder="MM-DD-YYYY" value={date} onChangeText={setDate} editable={!blocked} autoCapitalize="none" autoCorrect={false} maxLength={10} />
      <BulsaButton secondary disabled={blocked} title={details ? 'Fewer Details' : 'More Details · Optional'} onPress={() => setDetails(value => !value)} />
      {details && <><Field label="Note · Optional" value={note} onChangeText={setNote} editable={!blocked} multiline /></>}
      {type === 'expense' && entryMonth && <MonthlyLimitNotice disabled={blocked} month={entryMonth} spent={monthSpent} projected={projected} />}
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
      {!!previewError && <Text style={ui.error}>{previewError}</Text>}
      <BulsaButton title={busy ? 'Saving…' : original ? 'Review Changes' : type === 'expense' ? 'Save Expense' : 'Save Income'} disabled={blocked} onPress={() => { if (original && data) { try { editPreview(data, editedTransaction(original, draft)); setPreviewError(''); setReviewing(true); } catch (cause) { setPreviewError(cause instanceof Error ? cause.message : 'Check your fields.'); } } else void save(); }} />
      {original && <BulsaButton secondary title="Cancel" disabled={blocked} onPress={() => router.back()} />}
    </>}
    {reviewing && original && <CenteredPopup onClose={() => setReviewing(false)} busy={blocked}><Text style={ui.title}>Review Changes</Text>{!preview ? <Text style={ui.error}>{validation || 'Could not preview changes.'}</Text> : <><MoneyReview before={preview.before} after={preview.after} walletIds={[original.walletId, walletId]} /><Text style={ui.caption}>This updates the original record once. Income and spending totals follow the corrected amount and date. Transfers and adjustments stay unchanged.</Text><BulsaButton title={busy ? 'Saving…' : 'Save Changes'} disabled={blocked} onPress={() => void save()} /></>}{!!error && <><Text style={ui.error}>{error}</Text><BulsaButton secondary title="Refresh Balances" disabled={blocked} onPress={() => { setReviewing(false); void reload(); }} /></>}<BulsaButton secondary title="Keep Editing" disabled={blocked} onPress={() => setReviewing(false)} /></CenteredPopup>}
  </BulsaScreen>;
}
