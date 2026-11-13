import { useCallback, useRef, useState } from 'react';
import { BackHandler, Platform, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { BackButton, Field, useUI } from '../components/bulsa-form';
import { PocketButton } from '../components/pocket-button';
import { PocketScreen } from '../components/pocket-screen';
import { useTransactionUndo } from '../hooks/use-transaction-undo';
import { backupCounts, type FinancialBackup } from '../lib/backup';
import { pickFinancialBackup, shareFinancialBackup } from '../services/backup-files';
import { createFinancialBackup, financialSignature, restoreFinancialBackup } from '../storage/backup';

const labels = { wallets: 'Wallets', transactions: 'Income and Expenses', balance_changes: 'Starting Balances and Adjustments', transfers: 'Transfers', monthly_limits: 'Monthly Limits', category_allocations: 'Category Allocations', savings_goals: 'Savings Goals', savings_contributions: 'Savings Records' };
type Preview = { incoming: FinancialBackup; current: FinancialBackup; signature: string };

export default function BackupScreen() {
  const ui = useUI();
  const undo = useTransactionUndo();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => lock.current);
    return () => subscription.remove();
  }, []));

  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setMessage(''); setError('');
    try { await work(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not complete this backup action.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const pendingUndo = !!undo.record || undo.busy;
  return <PocketScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>Backup and Restore</Text>
    <Text style={ui.body}>Save a financial backup before changing phones or clearing app data.</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>Financial Records Only</Text>
      <Text style={ui.body}>Includes all wallets, income, expenses, starting balances, adjustments, transfers, monthly limits, category allocations, savings goals and savings records.</Text>
      <Text style={ui.caption}>Display name, appearance, introduction status and custom category/payment choices are not included. Your existing preferences and choices stay as they are.</Text>
      <Text style={ui.caption}>The JSON file is readable and unencrypted. Save it somewhere private. Bulsa does not upload it; the destination you choose may use cloud storage. Keep a copy outside Bulsa.</Text>
      <Text style={ui.caption}>An export copy stays in the app cache for sharing and may be cleared by your device. Backups support up to 10 MB and 50,000 financial rows.</Text>
    </View>
    <PocketButton title={busy ? 'Please Wait…' : 'Export Financial Backup'} disabled={busy || Platform.OS === 'web'} onPress={() => void run(async () => {
      await shareFinancialBackup(await createFinancialBackup());
      setMessage('Share sheet closed. Check your chosen destination to confirm the backup was saved.');
    })} />
    <PocketButton secondary title="Choose Backup to Restore" disabled={busy || pendingUndo || Platform.OS === 'web'} onPress={() => void run(async () => {
      setPreview(null); setConfirmation('');
      const incoming = await pickFinancialBackup();
      if (!incoming) return;
      const current = await createFinancialBackup();
      setPreview({ incoming, current, signature: financialSignature(current) });
    })} />
    {Platform.OS === 'web' && <Text style={ui.caption}>Export and restore are available in the Android app.</Text>}
    {pendingUndo && <View style={ui.card}><Text style={ui.body}>Finish or dismiss the pending Undo before restoring a backup.</Text><PocketButton secondary title="Dismiss Undo" disabled={busy || undo.busy} onPress={undo.dismiss} /></View>}
    {preview && <View style={ui.card}>
      <Text style={ui.heading}>Review Replacement</Text>
      <Text style={ui.body}>This replaces all current financial records. It does not merge them. Export your current records first if you want to keep them.</Text>
      <Text style={ui.caption}>Backup created: {preview.incoming.createdAt}</Text>
      {backupCounts(preview.incoming).map(({ table, count }) => <Text key={table} style={ui.body}>{labels[table]}: {preview.current.tables[table].length} current → {count} from backup</Text>)}
      <Field label="Type RESTORE to Confirm" value={confirmation} onChangeText={setConfirmation} editable={!busy} autoCapitalize="characters" autoCorrect={false} />
      <PocketButton title="Replace Financial Records" disabled={busy || pendingUndo || confirmation !== 'RESTORE'} onPress={() => void run(async () => {
        if (confirmation !== 'RESTORE') return;
        await restoreFinancialBackup(preview.incoming, preview.signature, () => { const state = undo.snapshot(); return !state.record && !state.busy; });
        setPreview(null); setConfirmation('');
        setMessage('Financial records restored.');
      })} />
      <PocketButton secondary title="Cancel Restore" disabled={busy} onPress={() => { setPreview(null); setConfirmation(''); }} />
    </View>}
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}
    {message === 'Financial records restored.' && <PocketButton title="Return Home" onPress={() => router.replace('/')} />}
  </PocketScreen>;
}
