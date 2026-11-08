import type { SQLiteDatabase } from 'expo-sqlite';
import { deriveBalances, monthlyTotals } from '../lib/ledger';
import { localDate, validateCentavos, validateDate, validateTransaction } from '../lib/validation';
import type { Ledger, Wallet, BalanceChange, Transfer } from '../types/wallet';
import type { Transaction } from '../types/transaction';
import { withDatabase } from './database';

// Internal reader: call inside the storage queue, never enqueue a nested operation.
export async function readLedger(db: SQLiteDatabase): Promise<Ledger> {
  const rows = await db.getAllAsync<Omit<Wallet, 'included' | 'hidden'> & { included: number; hidden: number }>('SELECT id,name,included,hidden FROM wallets ORDER BY rowid');
  const raw = await db.getAllAsync<Omit<Transaction, 'note'> & { note: string | null }>('SELECT id,type,amountCentavos,category,date,paymentMethod,note,walletId FROM transactions ORDER BY date DESC,id DESC');
  const transactions = raw.map(row => ({ ...row, note: row.note ?? undefined, walletId: row.walletId ?? undefined }));
  transactions.forEach(validateTransaction);
  const changes = await db.getAllAsync<BalanceChange>('SELECT id,walletId,kind,deltaCentavos,date,reason,targetCentavos FROM balance_changes ORDER BY rowid');
  const transfers = await db.getAllAsync<Transfer>('SELECT id,fromWalletId,toWalletId,amountCentavos,date,note FROM transfers ORDER BY rowid');
  const data: Ledger = { wallets: rows.map(w => ({ ...w, included: w.included === 1, hidden: w.hidden === 1 })), transactions, changes, transfers };
  deriveBalances(data);
  for (const month of new Set(transactions.map(r => r.date.slice(0, 7)))) monthlyTotals(data, month);
  return data;
}

export function getLedger(name = 'bulsa.db'): Promise<Ledger> {
  return withDatabase(name, readLedger);
}

function walletName(name: string) {
  if (typeof name !== 'string') throw new Error('Enter a wallet name.');
  name = name.trim().normalize('NFC');
  const key = name.toLowerCase();
  if (!name || name.length > 60 || ['general', 'not specified'].includes(key)) throw new Error('Use a unique wallet name of 1 to 60 characters. General and Not specified are reserved.');
  return { name, key };
}

function validId(id: string) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('A record ID is required.');
}

export async function requireWallet(db: SQLiteDatabase, id: string, allowHidden = false) {
  const data = await readLedger(db);
  const wallet = deriveBalances(data).wallets.find(w => w.id === id);
  if (!wallet || !wallet.configured) throw new Error('Set this wallet’s starting balance first.');
  if (wallet.hidden && !allowHidden) throw new Error('Restore this wallet before using it for a new entry.');
  return wallet;
}

export function createWallet(input: { id: string; name: string; openingCentavos: number; included: boolean }, name = 'bulsa.db') {
  input = { ...input };
  return withDatabase(name, async db => {
    validId(input.id); validateCentavos(input.openingCentavos);
    if (typeof input.included !== 'boolean') throw new Error('Choose whether to include this wallet.');
    const label = walletName(input.name);
    if (await db.getFirstAsync('SELECT id FROM wallets WHERE nameKey=?', label.key)) throw new Error('A wallet already uses this name.');
    await db.runAsync('INSERT INTO wallets(id,name,nameKey,included,hidden) VALUES(?,?,?,?,0)', input.id, label.name, label.key, input.included ? 1 : 0);
    await insertOpening(db, input.id, input.openingCentavos);
    await readLedger(db);
  }, true);
}

async function insertOpening(db: SQLiteDatabase, id: string, amount: number) {
  validateCentavos(amount);
  await db.runAsync("INSERT INTO balance_changes(id,walletId,kind,deltaCentavos,date,reason,targetCentavos) VALUES(?,?,'opening',?,?,?,NULL)", 'opening-' + id, id, amount, localDate(), 'Starting balance');
}

export function setOpening(id: string, amount: number, name = 'bulsa.db') {
  return withDatabase(name, async db => {
    await insertOpening(db, id, amount);
    await readLedger(db);
  }, true);
}

export function renameWallet(id: string, value: string, name = 'bulsa.db') {
  return withDatabase(name, async db => {
    const label = walletName(value);
    if (await db.getFirstAsync('SELECT id FROM wallets WHERE nameKey=? AND id<>?', label.key, id)) throw new Error('A wallet already uses this name.');
    const result = await db.runAsync('UPDATE wallets SET name=?,nameKey=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?', label.name, label.key, id);
    if (!result.changes) throw new Error('Wallet not found.');
  }, true);
}

export function setWalletFlags(id: string, flags: { included?: boolean; hidden?: boolean }, name = 'bulsa.db') {
  flags = { ...flags };
  return withDatabase(name, async db => {
    const current = (await readLedger(db)).wallets.find(w => w.id === id);
    if (!current) throw new Error('Wallet not found.');
    if ([flags.included, flags.hidden].some(v => v !== undefined && typeof v !== 'boolean')) throw new Error('Use true or false for wallet settings.');
    await db.runAsync('UPDATE wallets SET included=?,hidden=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?', (flags.included ?? current.included) ? 1 : 0, (flags.hidden ?? current.hidden) ? 1 : 0, id);
    await readLedger(db);
  }, true);
}

export function removeWallet(id: string, name = 'bulsa.db') {
  return withDatabase(name, async db => {
    const data = await readLedger(db);
    if (!data.wallets.some(w => w.id === id)) throw new Error('Wallet not found.');
    const used = data.changes.some(c => c.walletId === id) || data.transactions.some(t => t.walletId === id) || data.transfers.some(t => t.fromWalletId === id || t.toWalletId === id);
    if (used) throw new Error('This wallet has history. Hide it instead.');
    await db.runAsync('DELETE FROM wallets WHERE id=?', id);
  }, true);
}

export function recordTransfer(record: Transfer, name = 'bulsa.db') {
  record = { ...record };
  return withDatabase(name, async db => {
    validId(record.id); validateDate(record.date); validateCentavos(record.amountCentavos, true);
    if (typeof record.note !== 'string') throw new Error('Note must be text.');
    if (record.fromWalletId === record.toWalletId) throw new Error('Choose two different wallets.');
    const source = await requireWallet(db, record.fromWalletId);
    await requireWallet(db, record.toWalletId);
    if (source.balanceCentavos < record.amountCentavos) throw new Error('Not enough money in the source wallet.');
    await db.runAsync('INSERT INTO transfers(id,fromWalletId,toWalletId,amountCentavos,date,note) VALUES(?,?,?,?,?,?)', record.id, record.fromWalletId, record.toWalletId, record.amountCentavos, record.date, record.note);
    await readLedger(db);
  }, true);
}

export function adjustWallet(input: { id: string; walletId: string; targetCentavos: number; reason: string; date: string }, name = 'bulsa.db') {
  input = { ...input };
  return withDatabase(name, async db => {
    validId(input.id); validateDate(input.date); validateCentavos(input.targetCentavos);
    if (typeof input.reason !== 'string' || !input.reason.trim()) throw new Error('Enter a reason for this adjustment.');
    const wallet = await requireWallet(db, input.walletId, true);
    const delta = input.targetCentavos - wallet.balanceCentavos;
    validateCentavos(delta);
    if (!delta) return;
    await db.runAsync("INSERT INTO balance_changes(id,walletId,kind,deltaCentavos,date,reason,targetCentavos) VALUES(?,?,'adjustment',?,?,?,?)", input.id, input.walletId, delta, input.date, input.reason.trim(), input.targetCentavos);
    await readLedger(db);
  }, true);
}
