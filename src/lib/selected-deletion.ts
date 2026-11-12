import { deriveBalances, monthlyTotalsByMonth } from './ledger';
import type { Ledger } from '../types/wallet';

export function previewSelectedDeletion(data: Ledger, selectedIds: readonly string[]) {
  if (!Array.isArray(selectedIds) || !selectedIds.length || selectedIds.some(id => typeof id !== 'string' || !id)) throw new Error('Select at least one expense or income record.');
  const ids = [...selectedIds].sort();
  const selected = new Set(ids);
  if (selected.size !== ids.length) throw new Error('A record was selected more than once.');
  const records = data.transactions.filter(t => selected.has(t.id));
  if (records.length !== ids.length || records.some(t => t.type !== 'expense' && t.type !== 'income')) throw new Error('Selected records changed. Select your expenses and income again.');
  const before = deriveBalances(data);
  monthlyTotalsByMonth(data);
  const remaining = { ...data, transactions: data.transactions.filter(t => !selected.has(t.id)) };
  const after = deriveBalances(remaining);
  monthlyTotalsByMonth(remaining);
  const ordered = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const signature = JSON.stringify({ ids,
    wallets: ordered(data.wallets).map(w => [w.id, w.name, w.included, w.hidden]),
    transactions: ordered(data.transactions).map(t => [t.id, t.type, t.amountCentavos, t.category, t.date, t.paymentMethod, t.note ?? null, t.walletId ?? null]),
    changes: ordered(data.changes).map(c => [c.id, c.walletId, c.kind, c.deltaCentavos, c.date, c.reason, c.targetCentavos]),
    transfers: ordered(data.transfers).map(t => [t.id, t.fromWalletId, t.toWalletId, t.amountCentavos, t.date, t.note]),
  });
  return { ids, records, before, after, signature, walletIds: [...new Set(records.flatMap(t => t.walletId == null ? [] : [t.walletId]))] };
}
