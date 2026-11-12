import type { Transaction } from "../types/transaction";
import { validateTransaction } from "../lib/validation";
import { withDatabase } from "./database";
import { readLedger, requireWallet, requireWalletInLedger } from "./wallets";
export { validateTransaction } from "../lib/validation";

export async function saveTransaction(record: Transaction, databaseName = "bulsa.db"): Promise<void> {
  record = { ...record };
  validateTransaction(record);
  await withDatabase(databaseName, async db => {
    if (record.walletId != null) {
      const wallet = await requireWallet(db, record.walletId);
      if (record.type === 'expense' && wallet.balanceCentavos < record.amountCentavos) throw new Error('Not enough money in this wallet. Choose another wallet or lower the expense.');
    }
    await db.runAsync(
      "INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod,note,walletId) VALUES(?,?,?,?,?,?,?,?)",
      record.id, record.type, record.amountCentavos, record.category,
      record.date, record.paymentMethod, record.note ?? null, record.walletId ?? null,
    );
    await readLedger(db);
  }, true);
}

export function getTransactions(databaseName = "bulsa.db"): Promise<Transaction[]> {
  return withDatabase(databaseName, async db => (await readLedger(db)).transactions);
}

export async function updateTransaction(record: Transaction, databaseName = "bulsa.db", expected?: Transaction): Promise<void> {
  record = { ...record };
  expected = expected ? { ...expected } : undefined;
  validateTransaction(record);
  await withDatabase(databaseName, async db => {
    const data = await readLedger(db);
    const old = data.transactions.find(r => r.id === record.id);
    if (!old) throw new Error("Transaction not found.");
    if (expected && (['id', 'type', 'amountCentavos', 'category', 'date', 'paymentMethod', 'note', 'walletId'] as const).some(key => (old[key] ?? null) !== (expected![key] ?? null))) throw new Error('This record changed. Reopen it before saving your edits.');
    if (record.walletId != null) {
      const wallet = requireWalletInLedger(data, record.walletId, record.walletId === old.walletId);
      if (record.type === 'expense' && (old.type !== 'expense' || record.walletId !== old.walletId || record.amountCentavos > old.amountCentavos)) {
        const available = BigInt(wallet.balanceCentavos) + (old.walletId === record.walletId ? BigInt(old.amountCentavos) * (old.type === 'expense' ? 1n : -1n) : 0n);
        if (BigInt(record.amountCentavos) > available) throw new Error('Not enough money in this wallet. Choose another wallet or lower the expense.');
      }
    }
    await db.runAsync("UPDATE transactions SET type=?,amountCentavos=?,category=?,date=?,paymentMethod=?,note=?,walletId=? WHERE id=?",
      record.type, record.amountCentavos, record.category, record.date,
      record.paymentMethod, record.note ?? null, record.walletId ?? null, record.id);
    // Recalculate rather than replaying or rewriting transfers/corrections.
    await readLedger(db);
  }, true);
}

export function deleteTransaction(id: string, databaseName = "bulsa.db", expected?: Transaction): Promise<Transaction> {
  expected = expected ? { ...expected } : undefined;
  return withDatabase(databaseName, async db => {
    const old = (await readLedger(db)).transactions.find(t => t.id === id);
    if (!old) throw new Error("Transaction not found.");
    if (expected && (['id', 'type', 'amountCentavos', 'category', 'date', 'paymentMethod', 'note', 'walletId'] as const).some(key => (old[key] ?? null) !== (expected![key] ?? null))) throw new Error("This record changed. Reopen it before deleting.");
    const result = await db.runAsync("DELETE FROM transactions WHERE id=?", id);
    if (!result.changes) throw new Error("Transaction not found.");
    await readLedger(db);
    return old;
  }, true);
}

// Restore the original identity, including a historical hidden-wallet link.
// Duplicate IDs and missing/invalid wallets fail atomically, never duplicating money.
export async function restoreTransaction(record: Transaction, databaseName = 'bulsa.db'): Promise<void> {
  record = { ...record };
  validateTransaction(record);
  await withDatabase(databaseName, async db => {
    if (record.walletId != null) await requireWallet(db, record.walletId, true);
    await db.runAsync('INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod,note,walletId) VALUES(?,?,?,?,?,?,?,?)', record.id, record.type, record.amountCentavos, record.category, record.date, record.paymentMethod, record.note ?? null, record.walletId ?? null);
    await readLedger(db);
  }, true);
}
