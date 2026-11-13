import type { Transaction } from '../types/transaction';
import type { Ledger } from '../types/wallet';
import { displayDate, parseDisplayDate } from './display-date';
import { parseAmountToCentavos } from './money';
import { validateTransaction } from './validation';
import { deriveBalances, monthlyTotalsByMonth } from './ledger';

// Compare the reviewed before/after wallet effects, including inclusion and
// General, against a fresh snapshot inside the queued storage transaction.
export function balanceEffectsSignature(preview: { before: ReturnType<typeof deriveBalances>; after: ReturnType<typeof deriveBalances> }) {
  return JSON.stringify({ before: preview.before, after: preview.after });
}

export function deletionPreview(data: Ledger, id: string) {
  if (!data.transactions.some(t => t.id === id)) throw new Error('Transaction not found.');
  return { before: deriveBalances(data), after: deriveBalances({ ...data, transactions: data.transactions.filter(t => t.id !== id) }) };
}

export function centavosInput(value: number) {
  if (!Number.isSafeInteger(value)) throw new Error('Money is outside the safe range.');
  const absolute = Math.abs(value);
  return `${value < 0 ? '-' : ''}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}
export type TransactionDraft = { amount: string; category: string; date: string; walletId: string | null; payment: string; note: string };
export function transactionDraft(record: Transaction): TransactionDraft {
  return { amount: centavosInput(record.amountCentavos), category: record.category, date: displayDate(record.date), walletId: record.walletId ?? null, payment: record.paymentMethod, note: record.note ?? '' };
}
export function editedTransaction(original: Transaction, draft: TransactionDraft): Transaction {
  const amount = parseAmountToCentavos(draft.amount);
  if (amount === null) throw new Error('Enter an amount greater than zero, with up to two decimal places.');
  const record = { ...original, amountCentavos: amount, category: draft.category, date: parseDisplayDate(draft.date), walletId: draft.walletId, paymentMethod: draft.payment.trim() || 'Not specified', note: draft.note.trim() || undefined };
  validateTransaction(record);
  return record;
}
export function editPreview(data: Ledger, record: Transaction) {
  if (!data.transactions.some(t => t.id === record.id)) throw new Error('Transaction not found.');
  const next = { ...data, transactions: data.transactions.map(t => t.id === record.id ? record : t) };
  monthlyTotalsByMonth(next);
  return { before: deriveBalances(data), after: deriveBalances(next) };
}
export function adjustmentPreview(data: Ledger, walletId: string, targetCentavos: number) {
  const before = deriveBalances(data);
  const wallet = before.wallets.find(w => w.id === walletId);
  if (!wallet?.configured) throw new Error('Set this wallet’s starting balance first.');
  const deltaCentavos = targetCentavos - wallet.balanceCentavos;
  if (!Number.isSafeInteger(targetCentavos) || !Number.isSafeInteger(deltaCentavos)) throw new Error('Money is outside the safe range.');
  const after = deriveBalances({ ...data, changes: [...data.changes, { id: 'preview', walletId, kind: 'adjustment', deltaCentavos, date: '2000-01-01', reason: 'Preview', targetCentavos }] });
  return { before, after, deltaCentavos, currentCentavos: wallet.balanceCentavos };
}
