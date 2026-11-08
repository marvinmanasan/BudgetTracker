import type { Transaction } from "../types/transaction";
import { validateTransaction } from "../lib/validation";
import { withDatabase } from "./database";
import { readLedger, requireWallet } from "./wallets";
export { validateTransaction } from "../lib/validation";

export async function saveTransaction(record: Transaction, databaseName = "bulsa.db"): Promise<void> {
  record = { ...record };
  validateTransaction(record);
  await withDatabase(databaseName, async db => {
    if (record.walletId != null) await requireWallet(db, record.walletId);
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

export async function updateTransaction(record: Transaction, databaseName = "bulsa.db"): Promise<void> {
  record = { ...record };
  validateTransaction(record);
  await withDatabase(databaseName, async db => {
    const old = (await readLedger(db)).transactions.find(r => r.id === record.id);
    if (!old) throw new Error("Transaction not found.");
    if (record.walletId != null) await requireWallet(db, record.walletId, record.walletId === old.walletId);
    await db.runAsync("UPDATE transactions SET type=?,amountCentavos=?,category=?,date=?,paymentMethod=?,note=?,walletId=? WHERE id=?",
      record.type, record.amountCentavos, record.category, record.date,
      record.paymentMethod, record.note ?? null, record.walletId ?? null, record.id);
    // Recalculate rather than replaying or rewriting transfers/corrections.
    await readLedger(db);
  }, true);
}

export function deleteTransaction(id: string, databaseName = "bulsa.db"): Promise<void> {
  return withDatabase(databaseName, async db => {
    const result = await db.runAsync("DELETE FROM transactions WHERE id=?", id);
    if (!result.changes) throw new Error("Transaction not found.");
    await readLedger(db);
  }, true);
}
