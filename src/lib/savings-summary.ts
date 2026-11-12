import type { SavingsGoal, SavingsContribution } from '../storage/savings';
export function savingsSummary(goal: SavingsGoal, records: SavingsContribution[]) {
  if (!Number.isSafeInteger(goal.targetCentavos) || goal.targetCentavos <= 0) throw new Error('Enter a positive savings target.');
  const history = records.filter(r => r.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  let total = 0n;
  for (const record of history) {
    if (!Number.isSafeInteger(record.amountCentavos) || record.amountCentavos <= 0) throw new Error('Invalid savings contribution.');
    total += BigInt(record.amountCentavos);
  }
  const savedCentavos = Number(total);
  if (!Number.isSafeInteger(savedCentavos)) throw new Error('Savings total is outside the safe range.');
  return { savedCentavos, remainingCentavos: goal.targetCentavos - savedCentavos, progress: Math.min(1, savedCentavos / goal.targetCentavos), history };
}
