import type { SQLiteDatabase } from 'expo-sqlite';
import { backupColumns, validateBackup, type BackupTable, type BackupTables, type FinancialBackup } from '../lib/backup';
import { withDatabase } from './database';

async function readBackup(db: SQLiteDatabase): Promise<FinancialBackup> {
  const tables = {} as BackupTables;
  for (const table of Object.keys(backupColumns) as BackupTable[]) {
    tables[table] = table === 'activity_order'
      ? await db.getAllAsync(`SELECT sequence,recordType,recordId FROM activity_order o WHERE
        (recordType='transaction' AND EXISTS(SELECT 1 FROM transactions t WHERE t.id=o.recordId)) OR
        (recordType='transfer' AND EXISTS(SELECT 1 FROM transfers t WHERE t.id=o.recordId)) OR
        (recordType='change' AND EXISTS(SELECT 1 FROM balance_changes c WHERE c.id=o.recordId)) ORDER BY sequence`)
      : await db.getAllAsync(`SELECT ${backupColumns[table].join(',')} FROM ${table} ORDER BY rowid`);
  }
  return validateBackup({ format: 'bulsa-financial-backup', version: 1, createdAt: new Date().toISOString(), tables });
}

export function createFinancialBackup(name = 'bulsa.db') {
  return withDatabase(name, readBackup);
}

// Compare every financial row, including plans and savings, inside the same
// serialized transaction as replacement. The exported timestamp is not data.
export function financialSignature(backup: FinancialBackup) {
  return JSON.stringify(backup.tables);
}

export function restoreFinancialBackup(input: FinancialBackup, expectedSignature: string, canRestore: () => boolean, name = 'bulsa.db') {
  const backup = validateBackup(input);
  return withDatabase(name, async db => {
    if (!canRestore()) throw new Error('Finish or dismiss the pending Undo before restoring.');
    if (financialSignature(await readBackup(db)) !== expectedSignature) throw new Error('Your records changed. Choose the backup again and review a fresh preview.');
    const deletionOrder: BackupTable[] = ['custom_choices', 'savings_contributions', 'category_allocations', 'transactions', 'transfers', 'balance_changes', 'savings_goals', 'monthly_limits', 'wallets', 'activity_order'];
    for (const table of deletionOrder) await db.runAsync(`DELETE FROM ${table}`);
    // All active order rows will be restored explicitly. Reset the private
    // AUTOINCREMENT high-water mark in the same transaction, including rollback.
    await db.runAsync("DELETE FROM sqlite_sequence WHERE name='activity_order'");
    const insertionOrder: BackupTable[] = ['activity_order', 'wallets', 'monthly_limits', 'savings_goals', 'balance_changes', 'transactions', 'transfers', 'category_allocations', 'savings_contributions', 'custom_choices'];
    for (const table of insertionOrder) {
      const columns = backupColumns[table];
      for (const row of backup.tables[table]) {
        await db.runAsync(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`, ...columns.map(column => row[column]));
      }
    }
    if (!canRestore()) throw new Error('Undo changed during restore. Nothing was replaced.');
    const restored = await readBackup(db);
    if (financialSignature(restored) !== financialSignature(backup)) throw new Error('Backup verification failed. Nothing was replaced.');
  }, true);
}
