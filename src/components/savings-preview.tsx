import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSavings } from '../hooks/use-savings';
import { savingsSummary } from '../lib/savings-summary';
import { formatCentavos } from '../lib/money';
import { PocketButton } from './pocket-button';
import { ReadState, ui } from './bulsa-form';

export function SavingsPreview() {
  const { data, loading, error, reload } = useSavings();
  const goal = data?.goals.find(g => g.id === 'main');
  let saved: number | null = null, calculationError = '';
  try { if (goal && data) saved = savingsSummary(goal, data.contributions).savedCentavos; }
  catch (cause) { calculationError = cause instanceof Error ? cause.message : 'Could not calculate savings.'; }
  return <View style={ui.card}>
    <Text style={ui.heading}>Savings</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      {!!calculationError && <Text style={ui.error}>{calculationError}</Text>}
      <Text style={ui.body}>{goal && saved !== null ? `${goal.title}: ${formatCentavos(saved)} of ${formatCentavos(goal.targetCentavos)}` : 'Set a goal and record what you have saved.'}</Text>
      <PocketButton secondary title={goal ? 'View Savings' : 'Set Savings Goal'} onPress={() => router.push(goal ? '/savings' : '/savings-goal')} />
    </>}
    <Text style={ui.caption}>Savings records are separate. They do not move money or reduce Total Budget.</Text>
  </View>;
}
