import { useCanGoBack, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { BulsaScreen } from './bulsa-screen';
import { BackButton, Field, useUI } from './bulsa-form';
import { BulsaButton } from './bulsa-button';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { setMonthlyLimit } from '../storage/budgets';
import { centavosInput } from '../lib/editing';
import { parseBalance } from '../lib/form-money';
import { monthlyTotals } from '../lib/ledger';
import { monthName } from '../lib/display-date';
import { formatCentavos } from '../lib/money';

export function MonthlyLimitForm({ month, initial, sourceError, sourceLoading, retry }: { month: string; initial: number | null; sourceError: string; sourceLoading: boolean; retry: () => void }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const ui = useUI();
  const [amount, setAmount] = useState(initial === null ? '' : centavosInput(initial));
  const { data, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const spent = data ? monthlyTotals(data, month).expenseCentavos : null;
  useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => busy); return () => sub.remove(); }, [busy]));
  const draftLimit = parseBalance(amount);
  async function save() {
    const saved = await run(async () => {
      const value = parseBalance(amount);
      if (value === null || value < 0) throw new Error('Enter a limit of zero or more, with up to two decimal places.');
      await setMonthlyLimit(month, value);
    });
    if (saved) { if (canGoBack) router.back(); else router.replace('/budgets'); }
  }
  return <BulsaScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>Monthly Spending Limit</Text>
    {!!sourceError && <><Text style={ui.error}>{sourceError}</Text><BulsaButton secondary disabled={busy} title="Try Again" onPress={retry} /></>}
    {sourceLoading && <Text style={ui.caption}>Refreshing monthly limit…</Text>}
    <Text style={ui.body}>Month: {monthName(month)}</Text>
    <Field label="Spending Limit (PHP)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" editable={!busy} />
    {readError ? <><Text style={ui.error}>{readError}</Text><BulsaButton secondary disabled={busy} title="Refresh Spending" onPress={() => void reload()} /></> : spent !== null && <View style={ui.card}><Text style={ui.body}>Spent: {formatCentavos(spent)}</Text>{draftLimit !== null && draftLimit >= 0 && <Text style={ui.body}>Remaining With This Limit: {formatCentavos(draftLimit - spent)}</Text>}</View>}
    <Text style={ui.caption}>Zero is a valid spending limit. This does not change any wallet balance or Total Budget. Choose a different month from Budgets.</Text>
    {!!error && <Text style={ui.error}>{error}</Text>}
    <BulsaButton title={busy ? 'Saving…' : 'Save Monthly Limit'} disabled={busy || sourceLoading || !!sourceError} onPress={() => void save()} />
    <BulsaButton secondary title="Cancel" disabled={busy} onPress={() => router.back()} />
  </BulsaScreen>;
}
