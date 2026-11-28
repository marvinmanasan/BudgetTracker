import { SavingsDeadline } from '../components/savings-deadline';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BulsaScreen } from '../components/bulsa-screen';
import { BackButton, ReadState, useUI } from '../components/bulsa-form';
import { BulsaButton } from '../components/bulsa-button';
import { useSavings } from '../hooks/use-savings';
import { savingsSummary } from '../lib/savings-summary';
import { formatCentavos } from '../lib/money';
import { displayDate } from '../lib/display-date';
import { useState } from 'react';
import { SavingsCorrectionPopup } from '../components/savings-correction-popup';
import { SavingsGoalDeletionPopup } from '../components/savings-goal-deletion-popup';
import { SavingsGoalActions } from '../components/savings-goal-actions';
import type { SavingsContribution, SavingsGoal } from '../storage/savings';


export default function SavingsScreen() {
  const router = useRouter();
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const { data, loading, error, reload } = useSavings();
  const [correction, setCorrection] = useState<{ record: SavingsContribution; mode: 'edit' | 'delete' } | null>(null);
  const [deletion, setDeletion] = useState<{ goal: SavingsGoal; contributions: SavingsContribution[] } | null>(null);
  const [managing, setManaging] = useState(false);
  const goal = data?.goals.find(g => g.id === 'main');
  let summary: ReturnType<typeof savingsSummary> | null = null, calculationError = '';
  try { if (goal && data) summary = savingsSummary(goal, data.contributions); }
  catch (cause) { calculationError = cause instanceof Error ? cause.message : 'Could not calculate savings.'; }
  const canManage = !!goal && !!summary && !loading && !error;
  return <BulsaScreen header={<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
    <BackButton />
    {canManage && <Pressable accessibilityRole="button" accessibilityLabel="Manage Savings Goal" accessibilityHint="Edit or delete this savings goal" accessibilityState={{ expanded: managing }} onPress={() => setManaging(true)}
      style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, justifyContent: 'center', backgroundColor: C.soft, opacity: pressed ? 0.65 : 1, flexShrink: 1 })}>
      <Text style={{ color: C.accent, fontSize: 16, fontWeight: '600' }}>Manage Goal ▾</Text>
    </Pressable>}
  </View>}>
    <Text style={ui.title}>Savings</Text>
    <Text style={ui.caption}>Record savings separately. This does not move wallet money or change income, spending, or Total Budget.</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : !goal ? <>
      <Text style={ui.body}>No savings goal yet.</Text><BulsaButton title="Set Savings Goal" onPress={() => router.push('/savings-goal')} />
    </> : summary ? <>
      <View style={ui.card}><Text style={ui.heading}>{goal.title}</Text><Text style={ui.money}>{formatCentavos(summary.savedCentavos)}</Text><Text style={ui.body}>Target: {formatCentavos(goal.targetCentavos)}</Text>
        <SavingsDeadline deadline={goal.deadline} remaining={summary.remainingCentavos} />
        <View accessible={false} style={{ height: 8, backgroundColor: C.track, borderRadius: 4, overflow: 'hidden' }}><View style={{ height: 8, backgroundColor: C.accent, width: `${summary.progress * 100}%` }} /></View>
        <Text style={ui.body}>{summary.remainingCentavos > 0 ? `${formatCentavos(summary.remainingCentavos)} to go` : summary.remainingCentavos === 0 ? 'Goal reached.' : `Goal reached. ${formatCentavos(-summary.remainingCentavos)} above target.`}</Text>
      </View>
      <BulsaButton title="Record Savings" onPress={() => router.push('/record-savings')} />
      <Text style={ui.heading}>Savings History</Text>
      {!summary.history.length && <Text style={ui.body}>No savings recorded yet.</Text>}
      {summary.history.map(record => <View key={record.id} style={ui.card}><Text style={ui.heading}>{formatCentavos(record.amountCentavos)}</Text><Text style={ui.body}>{displayDate(record.date)}</Text>{!!record.note && <Text style={ui.body}>{record.note}</Text>}
        <BulsaButton secondary title="Edit Savings Record" onPress={() => setCorrection({ record, mode: 'edit' })} />
        <BulsaButton secondary title="Delete Savings Record" onPress={() => setCorrection({ record, mode: 'delete' })} />
      </View>)}
    </> : <Text style={ui.error}>{calculationError}</Text>}
    {!!correction && <SavingsCorrectionPopup record={correction.record} mode={correction.mode} onClose={() => setCorrection(null)} onSaved={() => { setCorrection(null); void reload(); }} />}
    {managing && canManage && goal && summary && <SavingsGoalActions goal={goal} onClose={() => setManaging(false)}
      onEdit={() => { setManaging(false); router.push('/savings-goal'); }}
      onDelete={() => { setManaging(false); setDeletion({ goal, contributions: summary.history }); }} />}
    {!!deletion && <SavingsGoalDeletionPopup goal={deletion.goal} contributions={deletion.contributions} onClose={() => { setDeletion(null); void reload(); }} onDeleted={() => { setDeletion(null); void reload(); }} />}
  </BulsaScreen>;
}
