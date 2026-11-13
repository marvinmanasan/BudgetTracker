import { deriveBalances, monthlyTotalsByMonth } from './ledger';
import { validateDate } from './validation';
import type { Ledger } from '../types/wallet';

export const BACKUP_MAX_BYTES = 10 * 1024 * 1024;
export const backupColumns = {
  wallets: ['id', 'name', 'nameKey', 'included', 'hidden', 'createdAt', 'updatedAt'],
  transactions: ['id', 'type', 'amountCentavos', 'category', 'date', 'paymentMethod', 'note', 'walletId'],
  balance_changes: ['id', 'walletId', 'kind', 'deltaCentavos', 'date', 'reason', 'targetCentavos', 'createdAt'],
  transfers: ['id', 'fromWalletId', 'toWalletId', 'amountCentavos', 'date', 'note', 'createdAt'],
  monthly_limits: ['month', 'limitCentavos'],
  category_allocations: ['month', 'category', 'limitCentavos'],
  savings_goals: ['id', 'title', 'targetCentavos'],
  savings_contributions: ['id', 'goalId', 'amountCentavos', 'date', 'note'],
} as const;
export type BackupTable = keyof typeof backupColumns;
export type BackupRow = Record<string, string | number | null>;
export type BackupTables = Record<BackupTable, BackupRow[]>;
export type FinancialBackup = { format: 'bulsa-financial-backup'; version: 1; createdAt: string; tables: BackupTables };

function fail(): never { throw new Error('This file is not a valid supported Bulsa financial backup.'); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: readonly string[]) {
  if (Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) fail();
}
function text(value: unknown, required = true): asserts value is string {
  if (typeof value !== 'string' || (required && !value.trim())) fail();
}
function money(value: unknown, minimum = -Number.MAX_SAFE_INTEGER): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) fail();
}
function total(values: number[]) {
  const result = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(-Number.MAX_SAFE_INTEGER)) fail();
  return result;
}

// Strict allowlist: no SQL, arbitrary tables, implicit coercion or unknown versions.
// Return a fresh snapshot so callers cannot alter an approved file while queued.
export function validateBackup(value: unknown): FinancialBackup {
  const root = object(value);
  keys(root, ['format', 'version', 'createdAt', 'tables']);
  if (root.format !== 'bulsa-financial-backup' || root.version !== 1) fail();
  text(root.createdAt);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(root.createdAt) || !Number.isFinite(Date.parse(root.createdAt)) || new Date(root.createdAt).toISOString() !== root.createdAt) fail();
  const source = object(root.tables);
  keys(source, Object.keys(backupColumns));
  const tables = {} as BackupTables;
  let count = 0;
  for (const table of Object.keys(backupColumns) as BackupTable[]) {
    const rows = source[table];
    if (!Array.isArray(rows) || (count += rows.length) > 50000) fail();
    const unique = new Set<string>();
    tables[table] = rows.map(value => {
      const raw = object(value);
      keys(raw, backupColumns[table]);
      const row: BackupRow = {};
      for (const column of backupColumns[table]) {
        const value = raw[column];
        if (column === 'included' || column === 'hidden') {
          if (value !== 0 && value !== 1) fail();
        } else if (column.endsWith('Centavos')) {
          if (column === 'targetCentavos' && table === 'balance_changes' && value === null) { /* opening */ }
          else money(value, column === 'deltaCentavos' || (column === 'targetCentavos' && table === 'balance_changes') ? -Number.MAX_SAFE_INTEGER : column === 'limitCentavos' ? 0 : 1);
        } else if ((column === 'note' || column === 'walletId') && table === 'transactions' && value === null) { /* legacy General / no note */ }
        else text(value, column !== 'note');
        row[column] = value as string | number | null;
      }
      if ('date' in row) validateDate(row.date as string);
      if ('month' in row && (typeof row.month !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(row.month))) fail();
      for (const column of ['createdAt', 'updatedAt']) {
        if (column in row) {
          const stamp = row[column] as string;
          if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(stamp)) fail();
          validateDate(stamp.slice(0, 10));
          if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(stamp.slice(11))) fail();
        }
      }
      const key = table === 'category_allocations' ? JSON.stringify([row.month, row.category]) : String(row.id ?? row.month);
      if (unique.has(key)) fail();
      unique.add(key);
      return row;
    });
  }
  const walletIds = new Set(tables.wallets.map(row => row.id));
  const names = new Set<string>();
  for (const row of tables.wallets) {
    const name = row.name as string;
    const key = name.toLowerCase();
    if (name !== name.trim().normalize('NFC') || name.length > 60 || row.nameKey !== key || ['general', 'not specified'].includes(key) || names.has(key)) fail();
    names.add(key);
  }
  const openings = new Set<string>();
  for (const row of tables.balance_changes) {
    if (!walletIds.has(row.walletId) || !['opening', 'adjustment'].includes(row.kind as string)) fail();
    if (row.kind === 'opening') {
      if (row.targetCentavos !== null || openings.has(row.walletId as string)) fail();
      openings.add(row.walletId as string);
    } else if (row.targetCentavos === null) fail();
  }
  for (const row of tables.transactions) {
    if (!['income', 'expense'].includes(row.type as string) || (row.walletId !== null && !walletIds.has(row.walletId))) fail();
    if (row.walletId !== null && !openings.has(row.walletId as string)) fail();
  }
  for (const row of tables.transfers) {
    if (row.fromWalletId === row.toWalletId || !openings.has(row.fromWalletId as string) || !openings.has(row.toWalletId as string)) fail();
  }
  for (const row of tables.balance_changes) if (row.kind === 'adjustment' && !openings.has(row.walletId as string)) fail();
  const months = new Map(tables.monthly_limits.map(row => [row.month, row.limitCentavos as number]));
  const allocatedByMonth = new Map<string, bigint>();
  for (const row of tables.category_allocations) {
    if (!months.has(row.month) || (row.category as string).trim().toLowerCase() === 'everything else') fail();
    const month = row.month as string;
    const allocated = (allocatedByMonth.get(month) ?? 0n) + BigInt(row.limitCentavos as number);
    if (allocated > BigInt(Number.MAX_SAFE_INTEGER) || allocated > BigInt(months.get(month)!)) fail();
    allocatedByMonth.set(month, allocated);
  }
  const goals = new Set(tables.savings_goals.map(row => row.id));
  for (const row of tables.savings_contributions) if (!goals.has(row.goalId)) fail();
  total(tables.savings_contributions.map(row => row.amountCentavos as number));
  const ledger: Ledger = {
    wallets: tables.wallets.map(row => ({ id: row.id as string, name: row.name as string, included: row.included === 1, hidden: row.hidden === 1 })),
    transactions: tables.transactions.map(row => ({ ...row, note: row.note ?? undefined, walletId: row.walletId ?? undefined })) as Ledger['transactions'],
    changes: tables.balance_changes as Ledger['changes'],
    transfers: tables.transfers as Ledger['transfers'],
  };
  deriveBalances(ledger);
  monthlyTotalsByMonth(ledger);
  return { format: 'bulsa-financial-backup', version: 1, createdAt: root.createdAt, tables };
}

// Count the bytes written as UTF-8, including surrogate pairs/replacement
// characters. No native encoder or platform-specific API is required.
function checkBackupSize(json: string) {
  let bytes = 0;
  for (const character of json) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes > BACKUP_MAX_BYTES) throw new Error('This backup exceeds the supported 10 MB size. Your records were not changed.');
  }
}

export function serializeBackup(backup: FinancialBackup) {
  const json = JSON.stringify(validateBackup(backup));
  checkBackupSize(json);
  return json;
}

export function parseBackup(json: string) {
  checkBackupSize(json);
  try { return validateBackup(JSON.parse(json)); }
  catch (cause) { throw new Error(cause instanceof Error ? cause.message : 'Could not read this backup.'); }
}

export function backupCounts(backup: FinancialBackup) {
  return (Object.keys(backupColumns) as BackupTable[]).map(table => ({ table, count: backup.tables[table].length }));
}
