import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { PocketScreen } from '@/components/pocket-screen';
import { PocketButton } from '@/components/pocket-button';
import { Field, ReadState, ui } from '@/components/bulsa-form';
import { MonthlyLimitNotice } from '@/components/monthly-limit-notice';
import { useLedger } from '@/hooks/use-ledger';
import { monthlyTotals } from '@/lib/ledger';
import { localDate } from '@/lib/validation';
import { displayMonth } from '@/lib/display-date';
import { parseActivityMonth } from '@/lib/activity';

export default function Budgets() {
  const [input, setInput] = useState(() => displayMonth(localDate().slice(0, 7)));
  const { data, loading, error, reload } = useLedger();
  let month: string | undefined, validation = '';
  try { month = parseActivityMonth(input); if (!month) validation = 'Enter a month in MM-YYYY format.'; }
  catch (cause) { validation = (cause as Error).message; }
  return <PocketScreen>
    <Text style={ui.title}>Budgets</Text><Text style={ui.caption}>Plan your spending separately from your recorded money.</Text>
    <Field label="Month (MM-YYYY)" value={input} onChangeText={setInput} placeholder="11-2026" maxLength={7} />
    {!!validation && <Text style={ui.error}>{validation}</Text>}
    {loading || error || !data ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : month && <MonthlyLimitNotice month={month} spent={monthlyTotals(data, month).expenseCentavos} />}
    <View style={ui.card}><Text style={ui.heading}>Wallet Money</Text><Text style={ui.body}>Correct recorded money without changing income or spending.</Text><PocketButton secondary title="Edit Total Budget" onPress={() => router.push('/edit-total-budget')} /><PocketButton secondary title="Manage Wallet Balances" onPress={() => router.push('/wallets')} /></View>
    <Text style={ui.caption}>Category limits and savings are still planned.</Text>
  </PocketScreen>;
}
