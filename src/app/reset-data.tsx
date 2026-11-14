import { CenteredPopup } from '../components/centered-popup';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { BulsaScreen } from '../components/bulsa-screen';
import { BulsaButton } from '../components/bulsa-button';
import { BackButton, Field, ReadState, useUI } from '../components/bulsa-form';
import { MoneyReview } from '../components/money-review';
import { UndoNotice } from '../components/undo-notice';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { useTransactionUndo } from '../hooks/use-transaction-undo';
import { previewReset, type ResetSelection, type ResetPreview } from '../lib/selective-reset';
import { applyReset } from '../storage/selective-reset';


const emptyKinds = () => ({ expenses: false, income: false, transfers: false, adjustments: false });
const stepEntrance = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
export default function ResetSelectedData() {
  const router = useRouter();
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const { data, balances, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const undo = useTransactionUndo();
  const [scope, setScope] = useState<ResetSelection['scope'] | null>(null);
  const [walletId, setWalletId] = useState('');
  const [kinds, setKinds] = useState(emptyKinds);
  const [resetStartingBalances, setStarting] = useState(false);
  const [review, setReview] = useState<{ selection: ResetSelection; preview: ResetPreview; label: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [validation, setValidation] = useState('');
  const blocked = busy || undo.busy;
  const allKinds = kinds.expenses && kinds.income && kinds.transfers && kinds.adjustments;
  function backStep() { if (confirming) { setConfirming(false); setTyped(''); } else setReview(null); }
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (blocked) return true;
      if (confirming) { setConfirming(false); setTyped(''); return true; }
      if (review) { setReview(null); return true; } return false;
    }); return () => sub.remove();
  }, [blocked, confirming, review]));
  function chooseScope(next: ResetSelection['scope']) {
    setScope(previous => previous === next ? null : next); setWalletId(''); setKinds(emptyKinds()); setStarting(false); setValidation('');
  }
  function prepare() {
    try {
      if (!scope || !data) throw new Error('Choose a wallet, General or All Wallets.');
      const pending = undo.snapshot();
      if (pending.busy || pending.record) throw new Error('Undo or dismiss the pending deletion before resetting data.');
      const selection: ResetSelection = { scope, ...(scope === 'wallet' ? { walletId } : {}), kinds: { ...kinds }, resetStartingBalances };
      const preview = previewReset(data, selection);
      const label = scope === 'wallet' ? data.wallets.find(w => w.id === walletId)!.name : scope === 'general' ? 'General' : 'All Wallets and General';
      setReview({ selection, preview, label }); setConfirming(false); setTyped(''); setValidation('');
    } catch (cause) { setValidation(cause instanceof Error ? cause.message : 'Check your selection.'); }
  }
  async function commit() {
    if (!review || typed !== 'RESET') return;
    const saved = await run(async () => {
      const pending = undo.snapshot();
      if (pending.busy || pending.record) throw new Error('Resolve the pending Undo before resetting data.');
      await applyReset(review.selection, review.preview.signature);
    });
    if (saved) router.replace({ pathname: '/activity', params: { message: 'Selected records removed. Other records and wallet names were kept.' } });
  }
  return <BulsaScreen header={<BackButton disabled={blocked} />}>
    <Animated.View entering={stepEntrance} style={{ gap: 16 }}>
    <Text style={ui.title}>Reset Selected Data</Text>
    <UndoNotice onRestored={() => void reload(true)} />
    {undo.record && <Text style={ui.caption}>Restore or dismiss the pending transaction Undo first.</Text>}
    {(!data && loading) || readError ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : !data ? null : <>
    {review && <CenteredPopup onClose={backStep} busy={blocked} stepKey={confirming ? 'confirmation' : 'review'}>
      <Text style={ui.title}>{confirming ? 'Confirm Selected Reset' : 'Review Selected Reset'}</Text>
      <Text style={ui.heading}>{review.label}</Text>
      {!confirming && <Text style={ui.body}>Nothing has been deleted. Review the changes below, then continue to confirmation if they look right.</Text>}
      <View style={ui.card}>{Object.entries(review.preview.counts).map(([key, count]) => <Text key={key} style={ui.body}>{({ expenses: 'Expenses', income: 'Income', transfers: 'Transfers', adjustments: 'Balance Adjustments', startingBalances: 'Starting Balances' } as Record<string, string>)[key]}: {count}</Text>)}</View>
      {!review.preview.hasChanges ? <Text style={ui.body}>No matching records. Nothing has been changed.</Text> : confirming ? <>
        <Text style={ui.error}>This permanently removes the reviewed records. Single-record Undo cannot recover a bulk reset.</Text>
        <Field label="Type RESET to Confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} editable={!blocked} />
        <BulsaButton title={busy ? 'Deleting…' : 'Delete Selected Records'} disabled={blocked || !!undo.record || typed !== 'RESET'} onPress={() => void commit()} />
      </> : <>
        <MoneyReview before={review.preview.before} after={review.preview.after} walletIds={review.preview.affectedWalletIds} negativeExplanation="Remaining records exceed remaining funding. Negative balances can result from removing funding; only the selected records will be removed." />
        {review.preview.counts.transfers > 0 && <Text style={ui.body}>A transfer is one record. Removing it reverses both wallet effects, including a wallet outside your selection.</Text>}
        <Text style={ui.caption}>Wallet names, inclusion, hidden status, custom choices, monthly limits, savings and settings stay saved. Unselected records stay unchanged.</Text>
        {review.selection.resetStartingBalances && <Text style={ui.body}>Selected wallets will need starting balances again. No income is created.</Text>}
        <BulsaButton title="Continue to Confirmation" disabled={blocked || !!undo.record} onPress={() => setConfirming(true)} />
      </>}
      <BulsaButton secondary title={confirming ? 'Review Again' : 'Change Selection'} disabled={blocked} onPress={backStep} />
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    </CenteredPopup>}
    <>
      <Text style={ui.caption}>For a wrong balance, use Adjust Balance and keep your correct transactions. Choose records below only when you want to remove them.</Text>
      <BulsaButton secondary title="Manage Wallet Balances" disabled={blocked} onPress={() => router.push('/wallets')} />
      <Text style={ui.heading}>Choose Where</Text>
      {(['wallet', 'general', 'all'] as const).map(value => <BulsaButton key={value} secondary={scope !== value} title={value === 'wallet' ? 'One Wallet' : value === 'general' ? 'General' : 'All Wallets'} disabled={blocked} onPress={() => chooseScope(value)} />)}
      {scope === 'wallet' && balances?.wallets.map(w => <BulsaButton key={w.id} secondary={walletId !== w.id} title={w.name + (w.hidden ? ' · Hidden' : '') + (!w.included ? ' · Excluded' : '') + (walletId === w.id ? ' · Selected' : '')} disabled={blocked} onPress={() => { setWalletId(previous => previous === w.id ? '' : w.id); setKinds(emptyKinds()); setStarting(false); }} />)}
      {scope === 'all' && <Text style={ui.body}>Includes General and every hidden or excluded wallet.</Text>}
      {scope && <>
        <Text style={ui.heading}>Choose What to Remove</Text>
        {(['expenses', 'income', 'transfers', 'adjustments'] as const).filter(kind => scope !== 'general' || kind === 'expenses' || kind === 'income').map(kind => <View key={kind} style={[ui.card, ui.row]}>
          <Text style={[ui.body, { flex: 1 }]}>{({ expenses: 'Expenses', income: 'Income', transfers: 'Transfers', adjustments: 'Balance Adjustments' })[kind]}</Text>
          <Switch accessibilityLabel={`Remove ${kind}`} value={kinds[kind]} disabled={blocked} onValueChange={value => { setKinds(previous => ({ ...previous, [kind]: value })); setStarting(false); }} trackColor={{ false: C.track, true: C.accent }} thumbColor={C.switchThumb} />
        </View>)}
        {scope === 'general' ? <Text style={ui.caption}>General only contains income and expenses without a wallet.</Text> : <View style={ui.card}><Text style={ui.heading}>Starting Balances</Text><View style={ui.row}><Text style={[ui.body, { flex: 1 }]}>Reset Starting Balances</Text><Switch accessibilityLabel="Reset Starting Balances" disabled={blocked || !allKinds} value={resetStartingBalances} onValueChange={setStarting} trackColor={{ false: C.track, true: C.accent }} thumbColor={C.switchThumb} /></View><Text style={ui.caption}>Available only when all linked financial history is selected. Otherwise starting balances stay saved.</Text></View>}
      </>}
      <View style={ui.soft}><Text style={ui.body}>After choosing where and what to remove, tap Preview Selection to review the affected records and balances. Nothing is deleted until you confirm.</Text></View>
      <BulsaButton title="Preview Selection" disabled={blocked || !!undo.record} onPress={prepare} />
    </>
    </>}
    {!!validation && <Text style={ui.error}>{validation}</Text>}
    {!!error && <><Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text><BulsaButton secondary title="Refresh and Review Again" disabled={blocked} onPress={() => { setReview(null); setConfirming(false); setTyped(''); void reload(); }} /></>}
    </Animated.View>
  </BulsaScreen>;
}
