import { useSyncExternalStore } from 'react';
import { createUndoController } from '../lib/transaction-undo';
import { deleteTransaction, restoreTransaction } from '../storage/transactions';

// One pending Undo survives navigation, but not closing the app. Never persisted
// as a second financial record or silently replaced by another deletion.
const controller = createUndoController({
  remove: (record, expectedPreviewSignature) => deleteTransaction(record.id, 'bulsa.db', record, expectedPreviewSignature),
  restore: record => restoreTransaction(record),
});
export function useTransactionUndo() {
  return { ...useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot), ...controller };
}
