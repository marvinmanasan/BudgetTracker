import { deriveBalances, monthlyTotalsByMonth } from './ledger';
import type { Ledger } from '../types/wallet';

export type ResetSelection = {
  scope: 'wallet' | 'general' | 'all';
  walletId?: string;
  kinds: { expenses: boolean; income: boolean; transfers: boolean; adjustments: boolean };
  resetStartingBalances: boolean;
};

export type ResetPreview = {
  before: ReturnType<typeof deriveBalances>;
  after: ReturnType<typeof deriveBalances>;
  counts: { expenses: number; income: number; transfers: number; adjustments: number; startingBalances: number };
  affectedWalletIds: string[];
  signature: string;
  hasChanges: boolean;
  selectedIds: { transactions: string[]; transfers: string[]; changes: string[] };
};

function validateSelection(data: Ledger, selection: ResetSelection) {
  if (!selection || !['wallet', 'general', 'all'].includes(selection.scope)) {
    throw new Error('Choose a wallet, General, or all data to reset.');
  }
  if (selection.scope === 'wallet') {
    if (typeof selection.walletId !== 'string' || !selection.walletId.trim() ||
        !data.wallets.some(wallet => wallet.id === selection.walletId)) {
      throw new Error('Choose an existing wallet to reset.');
    }
  } else if (selection.walletId !== undefined) {
    throw new Error('A wallet can only be chosen for a one-wallet reset.');
  }
  const keys = ['expenses', 'income', 'transfers', 'adjustments'] as const;
  if (!selection.kinds || keys.some(key => typeof selection.kinds[key] !== 'boolean') ||
      Object.keys(selection.kinds).some(key => !(keys as readonly string[]).includes(key))) {
    throw new Error('Choose valid record kinds to reset.');
  }
  if (!keys.some(key => selection.kinds[key])) throw new Error('Choose at least one record kind to reset.');
  if (typeof selection.resetStartingBalances !== 'boolean') throw new Error('Choose whether to reset starting balances.');
  if (selection.scope === 'general' && (selection.kinds.transfers || selection.kinds.adjustments)) {
    throw new Error('General only has expense and income records.');
  }
  if (selection.resetStartingBalances && (selection.scope === 'general' || !keys.every(key => selection.kinds[key]))) {
    throw new Error('Resetting starting balances requires all four record kinds and a wallet or all-data scope.');
  }
}

function ordered<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// Keep the exact canonical snapshot rather than a collision-prone short hash.
// Every ledger field and the selection participates, even for unselected rows.
function snapshot(data: Ledger, selection: ResetSelection): string {
  return JSON.stringify({
    selection: [selection.scope, selection.walletId ?? null,
      selection.kinds.expenses, selection.kinds.income, selection.kinds.transfers,
      selection.kinds.adjustments, selection.resetStartingBalances],
    wallets: ordered(data.wallets).map(w => [w.id, w.name, w.included, w.hidden]),
    transactions: ordered(data.transactions).map(t => [t.id, t.type, t.amountCentavos,
      t.category, t.date, t.paymentMethod, t.note ?? null, t.walletId ?? null]),
    changes: ordered(data.changes).map(c => [c.id, c.walletId, c.kind, c.deltaCentavos,
      c.date, c.reason, c.targetCentavos]),
    transfers: ordered(data.transfers).map(t => [t.id, t.fromWalletId, t.toWalletId,
      t.amountCentavos, t.date, t.note]),
  });
}

export function previewReset(data: Ledger, selection: ResetSelection): ResetPreview {
  validateSelection(data, selection);
  const before = deriveBalances(data);
  monthlyTotalsByMonth(data);
  const inScope = (walletId: string | null | undefined) => selection.scope === 'all' ||
    (selection.scope === 'general' ? walletId == null : walletId === selection.walletId);
  const transactions = data.transactions.filter(record => inScope(record.walletId) &&
    (record.type === 'expense' ? selection.kinds.expenses : selection.kinds.income));
  const transfers = data.transfers.filter(record => selection.kinds.transfers &&
    (inScope(record.fromWalletId) || inScope(record.toWalletId)));
  const changes = data.changes.filter(record => inScope(record.walletId) &&
    (record.kind === 'opening' ? selection.resetStartingBalances : selection.kinds.adjustments));
  const transactionIds = new Set(transactions.map(record => record.id));
  const transferIds = new Set(transfers.map(record => record.id));
  const changeIds = new Set(changes.map(record => record.id));
  const remaining: Ledger = {
    wallets: data.wallets,
    transactions: data.transactions.filter(record => !transactionIds.has(record.id)),
    transfers: data.transfers.filter(record => !transferIds.has(record.id)),
    changes: data.changes.filter(record => !changeIds.has(record.id)),
  };
  const after = deriveBalances(remaining);
  monthlyTotalsByMonth(remaining);
  const affected = new Set<string>();
  for (const record of transactions) if (record.walletId != null) affected.add(record.walletId);
  for (const record of changes) affected.add(record.walletId);
  for (const record of transfers) { affected.add(record.fromWalletId); affected.add(record.toWalletId); }
  return {
    before, after,
    counts: {
      expenses: transactions.filter(record => record.type === 'expense').length,
      income: transactions.filter(record => record.type === 'income').length,
      transfers: transfers.length,
      adjustments: changes.filter(record => record.kind === 'adjustment').length,
      startingBalances: changes.filter(record => record.kind === 'opening').length,
    },
    affectedWalletIds: [...affected].sort(),
    signature: snapshot(data, selection),
    hasChanges: transactionIds.size + transferIds.size + changeIds.size > 0,
    selectedIds: {
      transactions: [...transactionIds].sort(),
      transfers: [...transferIds].sort(),
      changes: [...changeIds].sort(),
    },
  };
}
