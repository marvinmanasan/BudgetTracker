import { previewSelectedDeletion } from '../lib/selected-deletion';
import { withDatabase } from './database';
import { readLedger } from './wallets';

export function deleteSelectedTransactions(ids: readonly string[], expectedSignature: string, name = 'bulsa.db') {
  ids = [...ids];
  return withDatabase(name, async db => {
    const preview = previewSelectedDeletion(await readLedger(db), ids);
    if (!expectedSignature || preview.signature !== expectedSignature) throw new Error('Your records or balances changed. Close this review, refresh Activity, and review the selection again.');
    for (let offset = 0; offset < preview.ids.length; offset += 200) {
      const batch = preview.ids.slice(offset, offset + 200);
      const result = await db.runAsync(`DELETE FROM transactions WHERE id IN (${batch.map(() => '?').join(',')})`, ...batch);
      if (result.changes !== batch.length) throw new Error('Selected records changed. Nothing was deleted.');
    }
    await readLedger(db);
  }, true);
}
