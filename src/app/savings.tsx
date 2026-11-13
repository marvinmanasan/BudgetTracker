import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { PocketScreen } from '../components/pocket-screen';
import { BackButton, ReadState, useUI } from '../components/bulsa-form';
import { PocketButton } from '../components/pocket-button';
import { useSavings } from '../hooks/use-savings';
import { savingsSummary } from '../lib/savings-summary';
import { formatCentavos } from '../lib/money';
import { displayDate } from '../lib/display-date';
import { useState } from 'react';
import { SavingsCorrectionPopup } from '../components/savings-correction-popup';
import type { SavingsContribution } from '../storage/savings';


export default function SavingsScreen() {
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const { data, loading, error, reload } = useSavings();
  const [correction, setCorrection] = useState<{ record: SavingsContribution; mode: 'edit' | 'delete' } | null>(null);
  const goal = data?.goals.find(g => g.id === 'main');
  let summary: ReturnType<typeof savingsSummary> | null = null, calculationError = '';
  try { if (goal && data) summary = savingsSummary(goal, data.contributions); }
  catch (cause) { calculationError = cause instanceof Error ? cause.message : 'Could not calculate savings.'; }
  return <PocketScreen header={<BackButton />}>
    <Text style={ui.title}>Savings</Text>
    <Text style={ui.caption}>Record savings separately. This does not move wallet money or change income, spending, or Total Budget.</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : !goal ? <>
      <Text style={ui.body}>No savings goal yet.</Text><PocketButton title="Set Savings Goal" onPress={() => router.push('/savings-goal')} />
    </> : summary ? <>
      <View style={ui.card}><Text style={ui.heading}>{goal.title}</Text><Text style={ui.money}>{formatCentavos(summary.savedCentavos)}</Text><Text style={ui.body}>Target: {formatCentavos(goal.targetCentavos)}</Text>
        <View accessible={false} style={{ height: 8, backgroundColor: C.track, borderRadius: 4, overflow: 'hidden' }}><View style={{ height: 8, backgroundColor: C.accent, width: `${summary.progress * 100}%` }} /></View>
        <Text style={ui.body}>{summary.remainingCentavos > 0 ? `${formatCentavos(summary.remainingCentavos)} to go` : summary.remainingCentavos === 0 ? 'Goal reached.' : `Goal reached. ${formatCentavos(-summary.remainingCentavos)} above target.`}</Text>
      </View>
      <PocketButton title="Record Savings" onPress={() => router.push('/record-savings')} />
      <PocketButton secondary title="Edit Savings Goal" onPress={() => router.push('/savings-goal')} />
      <Text style={ui.heading}>Savings History</Text>
      {!summary.history.length && <Text style={ui.body}>No savings recorded yet.</Text>}
      {summary.history.map(record => <View key={record.id} style={ui.card}><Text style={ui.heading}>{formatCentavos(record.amountCentavos)}</Text><Text style={ui.body}>{displayDate(record.date)}</Text>{!!record.note && <Text style={ui.body}>{record.note}</Text>}
        <PocketButton secondary title="Edit Savings Record" onPress={() => setCorrection({ record, mode: 'edit' })} />
        <PocketButton secondary title="Delete Savings Record" onPress={() => setCorrection({ record, mode: 'delete' })} />
      </View>)}
    </> : <Text style={ui.error}>{calculationError}</Text>}
    {!!correction && <SavingsCorrectionPopup record={correction.record} mode={correction.mode} onClose={() => setCorrection(null)} onSaved={() => { setCorrection(null); void reload(); }} />}
  </PocketScreen>;
}
