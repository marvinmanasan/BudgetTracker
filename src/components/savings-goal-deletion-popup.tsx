import { useState } from 'react';
import { Text } from 'react-native';
import { CenteredPopup } from './centered-popup';
import { BulsaButton } from './bulsa-button';
import { useUI } from './bulsa-form';
import { useSaveAction } from '../hooks/use-ledger';
import { formatCentavos } from '../lib/money';
import { savingsSummary } from '../lib/savings-summary';
import { deleteSavingsGoal, type SavingsContribution, type SavingsGoal } from '../storage/savings';

export function SavingsGoalDeletionPopup({ goal, contributions, onClose, onDeleted }: {
  goal: SavingsGoal;
  contributions: SavingsContribution[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const ui = useUI();
  const [approved] = useState(() => ({
    goal: { ...goal },
    contributions: contributions.map(record => ({ ...record })),
    savedCentavos: savingsSummary(goal, contributions).savedCentavos,
  }));
  const { busy, error, run } = useSaveAction();
  const count = approved.contributions.length;
  async function confirm() {
    const deleted = await run(() => deleteSavingsGoal(approved.goal, approved.contributions));
    if (deleted) onDeleted();
  }
  return <CenteredPopup busy={busy} onClose={onClose}>
    <Text style={ui.title}>Delete Savings Goal?</Text>
    <Text style={ui.heading}>{approved.goal.title}</Text>
    <Text style={ui.body}>Saved: {formatCentavos(approved.savedCentavos)}</Text>
    <Text style={ui.body}>Target: {formatCentavos(approved.goal.targetCentavos)}</Text>
    <Text style={ui.body}>{count === 0 ? 'This permanently deletes this goal. No savings records are attached.' : `This permanently deletes this goal and ${count === 1 ? '1 savings record' : `all ${count} savings records`}.`} This cannot be undone.</Text>
    <Text style={ui.body}>Your wallet balances, income, expenses and Total Budget stay unchanged.</Text>
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    <BulsaButton destructive title={busy ? 'Deleting…' : count === 0 ? 'Delete Goal' : 'Delete Goal And Records'} disabled={busy} onPress={confirm} />
    <BulsaButton secondary title="Cancel" disabled={busy} onPress={onClose} />
  </CenteredPopup>;
}
