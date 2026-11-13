import { CenteredPopup } from '../components/centered-popup';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { BulsaScreen } from '../components/bulsa-screen';
import { BulsaButton } from '../components/bulsa-button';
import { BackButton, Field, ReadState, useUI } from '../components/bulsa-form';
import { MoneyReview } from '../components/money-review';
import { totalBudgetPreview } from '../lib/total-budget';
import { newRecordId, parseBalance } from '../lib/form-money';
import { formatCentavos } from '../lib/money';
import { localDate } from '../lib/validation';
import { setTotalBudget } from '../storage/total-budget';

export default function EditTotalBudget() {
  const router = useRouter();
  const ui = useUI();
  const { data, balances, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const [target, setTarget] = useState('');
  const [walletId, setWalletId] = useState('');
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  const [review, setReview] = useState<ReturnType<typeof totalBudgetPreview> | null>(null);
  const [id] = useState(() => newRecordId('total-correction'));
  const eligible = balances?.wallets.filter(w => w.included && w.configured) ?? [];
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (review) { setReview(null); return true; } return false;
    }); return () => sub.remove();
  }, [busy, review]));
  function prepare() {
    try {
      const amount = parseBalance(target);
      if (!data || amount === null) throw new Error('Enter a Total Budget with up to two decimal places. Zero and negative values are allowed.');
      if (!reason.trim()) throw new Error('Enter a reason for this correction.');
      setReview(totalBudgetPreview(data, walletId, amount)); setValidation('');
    } catch (cause) { setValidation(cause instanceof Error ? cause.message : 'Check your fields.'); }
  }
  async function save() {
    if (!review) return;
    const saved = await run(() => setTotalBudget({ id, walletId, targetCentavos: review.after.totalCentavos, reason, date: localDate() }, review.signature));
    if (saved) router.back();
  }
  return <BulsaScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>{'Edit Total Budget'}</Text>
    {(!data && loading) || readError ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : !balances ? null : <>
    {review && <CenteredPopup onClose={() => setReview(null)} busy={busy}><Text style={ui.title}>Review Total Budget</Text>
      <MoneyReview before={review.before} after={review.after} walletIds={[walletId]} />
      <Text style={ui.body}>Adjustment: {formatCentavos(review.deltaCentavos)}</Text><Text style={ui.body}>Reason: {reason}</Text>
      <Text style={ui.caption}>Only the chosen wallet changes. This is not income or spending.</Text>
      {review.deltaCentavos === 0 ? <Text style={ui.body}>Total Budget already matches. No adjustment will be recorded.</Text> : <BulsaButton title={busy ? 'Saving…' : 'Confirm Adjustment'} disabled={busy} onPress={() => void save()} />}
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
      <BulsaButton secondary title="Keep Editing" disabled={busy} onPress={() => setReview(null)} />
    </CenteredPopup>}
    <>
      <Text style={ui.body}>Current Total Budget: {formatCentavos(balances.totalCentavos)}</Text>
      {!eligible.length ? <><Text style={ui.body}>Set a starting balance and include a wallet before correcting Total Budget.</Text><BulsaButton title="Manage Wallets" onPress={() => router.push('/wallets')} /></> : <>
        <Field label="New Total Budget (PHP)" value={target} onChangeText={setTarget} placeholder="0.00" keyboardType="numbers-and-punctuation" editable={!busy} />
        <Text style={ui.heading}>Wallet Receiving the Difference</Text>
        {eligible.map(w => <View key={w.id} style={walletId === w.id ? ui.soft : ui.card}><BulsaButton secondary={walletId !== w.id} title={w.name + (w.hidden ? ' · Hidden' : '') + (walletId === w.id ? ' · Selected' : '')} disabled={busy} onPress={() => setWalletId(w.id)} /><Text style={ui.caption}>{formatCentavos(w.balanceCentavos)} · Included in Total Budget</Text></View>)}
        <Field label="Reason" value={reason} onChangeText={setReason} editable={!busy} multiline />
        <Text style={ui.caption}>General, other wallets and your monthly spending limit stay unchanged.</Text>
        <BulsaButton title="Review Change" disabled={busy} onPress={prepare} />
      </>}
    </>
    </>}
    {!!validation && <Text style={ui.error}>{validation}</Text>}
    {!!error && <><Text style={ui.error}>{error}</Text><BulsaButton secondary title="Refresh and Review Again" disabled={busy} onPress={() => { setReview(null); void reload(); }} /></>}
  </BulsaScreen>;
}
