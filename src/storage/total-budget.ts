import { withDatabase } from './database';
import { readLedger } from './wallets';
import { totalBudgetPreview } from '../lib/total-budget';
import { validateDate } from '../lib/validation';

export async function setTotalBudget(input: { id: string; walletId: string; targetCentavos: number; reason: string; date: string }, signature: string, name = 'bulsa.db'): Promise<void> {
  input = { ...input };
  if (!input.id.trim() || !input.reason.trim()) throw new Error('Enter a reason for this correction.');
  validateDate(input.date);
  await withDatabase(name, async db => {
    const data = await readLedger(db);
    if (JSON.stringify(data) !== signature) throw new Error('Your records changed. Refresh and review the Total Budget again.');
    const preview = totalBudgetPreview(data, input.walletId, input.targetCentavos);
    if (!preview.deltaCentavos) return;
    await db.runAsync("INSERT INTO balance_changes(id,walletId,kind,deltaCentavos,date,reason,targetCentavos) VALUES(?,?,'adjustment',?,?,?,?)", input.id, input.walletId, preview.deltaCentavos, input.date, input.reason.trim(), preview.walletTargetCentavos);
    await readLedger(db);
  }, true);
}
