import type { Transaction } from '../types/transaction';

type State = { record: Transaction | null; busy: boolean; error: string };
export function createUndoController(storage: { remove: (record: Transaction) => Promise<Transaction>; restore: (record: Transaction) => Promise<void> }) {
  let state: State = { record: null, busy: false, error: '' };
  const listeners = new Set<() => void>();
  function publish(next: State) { state = next; listeners.forEach(listener => listener()); }
  return {
    snapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dismiss: () => { if (!state.busy) publish({ record: null, busy: false, error: '' }); },
    async remove(record: Transaction) {
      if (state.busy || state.record) return false;
      publish({ record: null, busy: true, error: '' });
      try { const deleted = await storage.remove({ ...record }); publish({ record: deleted, busy: false, error: '' }); return true; }
      catch (cause) { publish({ record: null, busy: false, error: cause instanceof Error ? cause.message : 'Could not delete.' }); return false; }
    },
    async undo() {
      if (state.busy || !state.record) return false;
      const record = state.record;
      publish({ record, busy: true, error: '' });
      try { await storage.restore({ ...record }); publish({ record: null, busy: false, error: '' }); return true; }
      catch (cause) { publish({ record, busy: false, error: cause instanceof Error ? cause.message : 'Could not restore. Try again.' }); return false; }
    },
  };
}
