import { CenteredPopup } from '../components/centered-popup';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { BulsaScreen } from '../components/bulsa-screen';
import { BackButton, ReadState, useUI } from '../components/bulsa-form';
import { BulsaButton } from '../components/bulsa-button';
import { ActivityAmount } from '../components/activity-amount';
import { UndoNotice } from '../components/undo-notice';
import { MoneyReview } from '../components/money-review';
import { useTransactionUndo } from '../hooks/use-transaction-undo';
import { balanceEffectsSignature, deletionPreview } from '../lib/editing';
import type { Transaction } from '../types/transaction';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { activityRecord } from '../lib/activity';
import { displayDate } from '../lib/display-date';

export default function ActivityRecord() {
  const ui = useUI();
  const { record, action } = useLocalSearchParams<{ record?: string | string[]; action?: string }>();
  const { data, loading, error, reload } = useLedger();
  const item = useMemo(() => {
    if (!data || typeof record !== 'string') return undefined;
    return activityRecord(data, record);
  }, [data, record]);
  const transaction = typeof record === 'string' ? data?.transactions.find(t => 'transaction-' + t.id === record) : undefined;
  const undo = useTransactionUndo();
  const { run } = useSaveAction();
  const [deleteDraft, setDeleteDraft] = useState<Transaction | null>(null);
  const [autoDelete, setAutoDelete] = useState(action === 'delete' && !undo.record);
  const deleting = deleteDraft ?? (autoDelete ? transaction ?? null : null);
  function setDeleting(value: Transaction | null) { setDeleteDraft(value); setAutoDelete(false); }
  const preview = useMemo(() => {
    if (!data || !deleting) return null;
    try { return deletionPreview(data, deleting.id); }
    catch { return null; }
  }, [data, deleting]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (undo.busy) return true;
      if (deleting) { setDeleting(null); return true; }
      return false;
    });
    return () => listener.remove();
  }, [deleting, undo.busy]));
  async function confirmDelete() {
    if (!deleting || !preview) return;
    if (await run(() => undo.remove(deleting, balanceEffectsSignature(preview)))) {
      if (router.canGoBack()) router.back(); else router.replace('/activity');
    }
  }

  return <BulsaScreen header={<BackButton />}>
    <Text style={ui.title}>Record Details</Text>
    <UndoNotice onRestored={() => void reload(true)} />
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : !item ?
      <View style={ui.card}><Text style={ui.heading}>Record Not Found</Text><Text style={ui.body}>This record is no longer available. Go back to Activity to see your current records.</Text></View> :
      <>
        <View style={ui.soft}>
          <Text style={ui.heading}>{item.title}</Text>
          <Text style={ui.body}>{item.detail}</Text>
          <ActivityAmount item={item} />
          <Text style={ui.caption}>{displayDate(item.date)}</Text>
        </View>
        {transaction && <BulsaButton title="Edit Transaction" onPress={() => router.push({ pathname: '/edit-entry', params: { id: transaction.id } })} />}
        {transaction && <BulsaButton secondary title="Delete Transaction" disabled={undo.busy || !!undo.record} onPress={() => setDeleting({ ...transaction })} />}
        {transaction && undo.record && <Text style={ui.caption}>Undo or dismiss the previous deletion before deleting another record.</Text>}
        {item.fields.map(field => <View key={field.label} style={ui.card}>
          <Text style={ui.caption}>{field.label}</Text>
          <Text style={ui.body}>{field.value}</Text>
        </View>)}
      </>
    }
    {deleting && <CenteredPopup onClose={() => setDeleting(null)} busy={undo.busy}><Text style={ui.title}>Delete {deleting.type === 'expense' ? 'Expense' : 'Income'}?</Text>
    <Text style={ui.body}>{deleting.category} · {displayDate(deleting.date)}</Text>
    {preview ? <MoneyReview {...preview} walletIds={[deleting.walletId]} /> : <Text style={ui.error}>Could not preview this deletion. Return to Activity and try again.</Text>}
    <Text style={ui.caption}>The original record will be removed. Undo is available in Activity until dismissed or the app closes. Existing transfers and adjustments stay unchanged.</Text>
    {!!undo.error && <><Text style={ui.error}>{undo.error}</Text><BulsaButton secondary title="Refresh Balances" disabled={undo.busy} onPress={() => { setDeleting(null); void reload(); }} /></>}
    <BulsaButton title={undo.busy ? 'Deleting…' : 'Confirm Delete'} disabled={undo.busy || !preview || !!undo.record} onPress={() => void confirmDelete()} />
    <BulsaButton secondary title="Keep Record" disabled={undo.busy} onPress={() => setDeleting(null)} />
  </CenteredPopup>}
  </BulsaScreen>;
}
