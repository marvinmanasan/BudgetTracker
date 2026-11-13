import { useRouter } from 'expo-router';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { Text, View } from 'react-native';
import { useSavings } from '../hooks/use-savings';
import { savingsSummary } from '../lib/savings-summary';
import { formatCentavos } from '../lib/money';
import { BulsaButton } from './bulsa-button';
import { ReadState, useUI } from './bulsa-form';

export function SavingsPreview() {
  const router = useRouter();
  const ui = useUI();
  const { colors } = useBulsaTheme();
  const { data, loading, error, reload } = useSavings();
  const goal = data?.goals.find(g => g.id === 'main');
  let summary: ReturnType<typeof savingsSummary> | null = null, calculationError = '';
  try { if (goal && data) summary = savingsSummary(goal, data.contributions); }
  catch (cause) { calculationError = cause instanceof Error ? cause.message : 'Could not calculate savings.'; }
  return <View style={ui.card}>
    <Text style={ui.heading}>Savings Goal</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      {!!calculationError && <Text style={ui.error}>{calculationError}</Text>}
      <Text style={ui.body}>{goal && summary ? `${goal.title}: ${formatCentavos(summary.savedCentavos)} of ${formatCentavos(goal.targetCentavos)}` : 'Set a goal and record what you have saved.'}</Text>
      {goal && summary && <View accessible accessibilityRole="progressbar" accessibilityLabel={goal.title} accessibilityValue={{ min: 0, max: 100, now: Math.round(summary.progress * 100), text: `${formatCentavos(summary.savedCentavos)} saved of ${formatCentavos(goal.targetCentavos)}` }} style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.track }}><View accessible={false} style={{ height: 8, backgroundColor: colors.accent, width: `${summary.progress * 100}%` }} /></View>}
      <BulsaButton secondary title={goal ? 'View Savings' : 'Set Savings Goal'} onPress={() => router.push(goal ? '/savings' : '/savings-goal')} />
    </>}
    <Text style={ui.caption}>Savings records are separate. They do not move money or reduce Total Budget.</Text>
  </View>;
}
