import { previewReset, type ResetSelection } from '../lib/selective-reset';
import { withDatabase } from './database';
import { readLedger } from './wallets';

// Snapshot synchronously, before waiting for other queued storage work.
function copySelection(selection: ResetSelection): ResetSelection {
  return { ...selection, kinds: { ...selection?.kinds } };
}

export function getResetPreview(selection: ResetSelection, name = 'bulsa.db') {
  selection = copySelection(selection);
  return withDatabase(name, async db => previewReset(await readLedger(db), selection));
}

export function applyReset(selection: ResetSelection, expectedSignature: string, name = 'bulsa.db') {
  selection = copySelection(selection);
  return withDatabase(name, async db => {
    const preview = previewReset(await readLedger(db), selection);
    if (typeof expectedSignature !== 'string' || !expectedSignature || expectedSignature !== preview.signature) {
      throw new Error('The data or reset choices changed. Review the latest reset preview before confirming.');
    }
    const groups = [
      ['transactions', preview.selectedIds.transactions],
      ['transfers', preview.selectedIds.transfers],
      ['balance_changes', preview.selectedIds.changes],
    ] as const;
    for (const [table, ids] of groups) {
      // Bound parameter batches stay below SQLite's variable limit on mobile.
      for (let offset = 0; offset < ids.length; offset += 200) {
        const batch = ids.slice(offset, offset + 200);
        await db.runAsync(`DELETE FROM ${table} WHERE id IN (${batch.map(() => '?').join(',')})`, ...batch);
      }
    }
    await readLedger(db);
    return preview;
  }, true);
}
