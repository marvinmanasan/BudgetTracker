import { CenteredPopup } from '../components/centered-popup';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { BulsaScreen } from '../components/bulsa-screen';
import { BackButton, Field, ReadState, useUI } from '../components/bulsa-form';
import { BulsaButton } from '../components/bulsa-button';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { adjustmentPreview, balanceEffectsSignature } from '../lib/editing';
import { newRecordId, parseBalance } from '../lib/form-money';
import { formatCentavos } from '../lib/money';
import { localDate } from '../lib/validation';
import { adjustWallet } from '../storage/wallets';

export default function AdjustBalance() {
  const ui = useUI();
  const { wallet: walletId } = useLocalSearchParams<{ wallet?: string }>();
  const { data, balances, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const [id] = useState(() => newRecordId('adjustment'));
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  const [review, setReview] = useState<ReturnType<typeof adjustmentPreview> | null>(null);
  const wallet = balances?.wallets.find(w => w.id === walletId);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (review) { setReview(null); return true; }
      return false;
    });
    return () => listener.remove();
  }, [busy, review]));
  function prepare() {
    try {
      if (!data || !walletId) throw new Error('Wallet not found.');
      const amount = parseBalance(target);
      if (amount === null) throw new Error('Enter an actual balance with up to two decimal places. Zero and negative balances are allowed.');
      if (!reason.trim()) throw new Error('Enter a reason for this adjustment.');
      setReview(adjustmentPreview(data, walletId, amount)); setValidation('');
    } catch (cause) { setValidation(cause instanceof Error ? cause.message : 'Check the balance.'); }
  }
  async function confirm() {
    if (!review || !walletId) return;
    const saved = await run(() => adjustWallet({ id, walletId, targetCentavos: parseBalance(target)!, reason, date: localDate(), expectedBalanceCentavos: review.currentCentavos, expectedPreviewSignature: balanceEffectsSignature(review) }));
    if (saved) router.back();
  }
  return <BulsaScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>{'Adjust Balance'}</Text>
    {(!data && loading) || readError ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : !wallet?.configured ? <Text style={ui.body}>Set this wallet’s starting balance first.</Text> : <>
      <Text style={ui.heading}>{wallet.name}</Text>
      {review && <CenteredPopup onClose={() => setReview(null)} busy={busy}><Text style={ui.title}>Review Adjustment</Text>
        <View style={ui.card}><Text style={ui.body}>Recorded: {formatCentavos(review.currentCentavos)}</Text><Text style={ui.body}>Actual: {formatCentavos(parseBalance(target)!)}</Text><Text style={ui.body}>Change: {formatCentavos(review.deltaCentavos)}</Text><Text style={ui.body}>Total Budget: {formatCentavos(review.before.totalCentavos)} → {formatCentavos(review.after.totalCentavos)}</Text><Text style={ui.body}>Reason: {reason}</Text></View>
        <Text style={ui.caption}>The fixed difference is recorded in history. It is not income or spending.</Text>
        {review.deltaCentavos === 0 ? <Text style={ui.body}>Balance already matches. No adjustment will be recorded.</Text> : <BulsaButton disabled={busy} title={busy ? 'Saving…' : 'Confirm Adjustment'} onPress={() => void confirm()} />}
        {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
        <BulsaButton secondary disabled={busy} title="Keep Editing" onPress={() => setReview(null)} />
      </CenteredPopup>}
      <>
        <Text style={ui.body}>Recorded Balance: {formatCentavos(wallet.balanceCentavos)}</Text>
        <Field label="Actual Balance (PHP)" placeholder="0.00" value={target} onChangeText={setTarget} keyboardType="numbers-and-punctuation" editable={!busy} />
        <Field label="Reason" value={reason} onChangeText={setReason} multiline editable={!busy} />
        <Text style={ui.caption}>Use an adjustment to reconcile your records. Record ordinary expenses and income separately.</Text>
        <BulsaButton title="Review Adjustment" disabled={busy} onPress={prepare} />
      </>
    </>}
    {!!validation && <Text style={ui.error}>{validation}</Text>}
    {!!error && <><Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text><BulsaButton secondary title="Refresh Balance" disabled={busy} onPress={() => { setReview(null); void reload(); }} /></>}
  </BulsaScreen>;
}
