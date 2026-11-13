const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

const load = createLoader();
const { validateBackup, parseBackup, serializeBackup, backupColumns, BACKUP_MAX_BYTES } = load('src/lib/backup.ts');
const stamp = '2026-11-13 12:00:00';
const fixture = {
  format: 'bulsa-financial-backup', version: 1, createdAt: '2026-11-13T04:00:00.000Z',
  tables: {
    wallets: [{ id: 'cash', name: 'Cash', nameKey: 'cash', included: 1, hidden: 0, createdAt: stamp, updatedAt: stamp }, { id: 'bank', name: 'Bank', nameKey: 'bank', included: 0, hidden: 1, createdAt: stamp, updatedAt: stamp }],
    transactions: [{ id: 'expense', type: 'expense', amountCentavos: 100, category: 'Food', date: '2026-11-12', paymentMethod: 'Cash', note: null, walletId: 'cash' }, { id: 'income', type: 'income', amountCentavos: 500, category: 'Pay', date: '2026-11-12', paymentMethod: 'Not specified', note: 'General', walletId: null }],
    balance_changes: [{ id: 'opening', walletId: 'cash', kind: 'opening', deltaCentavos: 10000, date: '2026-11-01', reason: 'Starting balance', targetCentavos: null, createdAt: stamp }, { id: 'bank-opening', walletId: 'bank', kind: 'opening', deltaCentavos: -50, date: '2026-11-01', reason: 'Starting balance', targetCentavos: null, createdAt: stamp }, { id: 'adjust', walletId: 'cash', kind: 'adjustment', deltaCentavos: 20, date: '2026-11-02', reason: 'Correction', targetCentavos: 10020, createdAt: stamp }],
    transfers: [{ id: 'transfer', fromWalletId: 'cash', toWalletId: 'bank', amountCentavos: 30, date: '2026-11-12', note: '', createdAt: stamp }],
    monthly_limits: [{ month: '2026-11', limitCentavos: 5000 }],
    category_allocations: [{ month: '2026-11', category: 'Food', limitCentavos: 2000 }],
    savings_goals: [{ id: 'goal', title: 'Emergency', targetCentavos: 10000 }],
    savings_contributions: [{ id: 'saving', goalId: 'goal', amountCentavos: 300, date: '2026-11-12', note: '' }],
  },
};
const clone = value => JSON.parse(JSON.stringify(value));
// The normal storage API allows long notes and embedded NUL characters.
fixture.tables.transactions[1].note = 'a'.repeat(10001) + '\0🙂';
assert.deepEqual(parseBackup(JSON.stringify(fixture)), fixture);
assert.equal(serializeBackup(fixture), JSON.stringify(fixture));
const multibyte = clone(fixture);
multibyte.tables.transactions[0].note = '漢'.repeat(Math.floor(BACKUP_MAX_BYTES / 3));
const multibyteJson = JSON.stringify(multibyte);
assert(multibyteJson.length < BACKUP_MAX_BYTES, 'UTF-16 length alone misses this oversized UTF-8 file');
assert(Buffer.byteLength(multibyteJson, 'utf8') > BACKUP_MAX_BYTES);
assert.throws(() => serializeBackup(multibyte), /10 MB/);
assert.throws(() => parseBackup(multibyteJson), /10 MB/);
const unicode = clone(fixture);
unicode.tables.transactions[0].note = '漢🙂\ud800\0';
assert.deepEqual(parseBackup(serializeBackup(unicode)), unicode);
const manyMonths = clone(fixture);
manyMonths.tables.monthly_limits = [];
manyMonths.tables.category_allocations = [];
for (let i = 0; i < 2000; i++) {
  const month = `${1000 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`;
  manyMonths.tables.monthly_limits.push({ month, limitCentavos: 100 });
  manyMonths.tables.category_allocations.push({ month, category: 'Food', limitCentavos: 50 }, { month, category: 'Other', limitCentavos: 50 });
}
assert.equal(validateBackup(manyMonths).tables.category_allocations.length, 4000);
manyMonths.tables.category_allocations.at(-1).limitCentavos = 51;
assert.throws(() => validateBackup(manyMonths), 'Accumulate every allocation in each month');
const copied = validateBackup(fixture);
copied.tables.wallets[0].name = 'Changed';
assert.equal(fixture.tables.wallets[0].name, 'Cash');
const badCases = [
  b => b.version = 2,
  b => b.tables.evil = [],
  b => delete b.tables.transfers,
  b => b.tables.transactions[0].extra = 'SQL',
  b => b.tables.transactions[0].amountCentavos = '100',
  b => b.tables.transactions[0].amountCentavos = Number.MAX_SAFE_INTEGER + 1,
  b => b.tables.transactions[0].date = '2026-02-30',
  b => b.tables.transactions.push(clone(b.tables.transactions[0])),
  b => b.tables.transactions[0].walletId = 'missing',
  b => b.tables.wallets[1].nameKey = 'cash',
  b => Object.assign(b.tables.wallets[1], { name: 'Cash', nameKey: 'cash' }),
  b => b.tables.wallets[0].included = true,
  b => b.tables.balance_changes.push({ ...b.tables.balance_changes[0], id: 'duplicate-opening' }),
  b => b.tables.transfers[0].toWalletId = 'cash',
  b => b.tables.category_allocations[0].month = '2026-12',
  b => b.tables.category_allocations[0].category = 'Everything Else',
  b => b.tables.category_allocations[0].limitCentavos = 5001,
  b => b.tables.savings_contributions[0].goalId = 'missing',
  b => b.tables.savings_contributions.push({ ...b.tables.savings_contributions[0], id: 'overflow', amountCentavos: Number.MAX_SAFE_INTEGER }),
  b => b.tables.balance_changes[0].deltaCentavos = Number.MAX_SAFE_INTEGER,
  b => b.tables.transactions.push({ ...b.tables.transactions[1], id: 'overflow-income', amountCentavos: Number.MAX_SAFE_INTEGER }),
  b => b.tables.wallets[0].createdAt = '2026-11-13 25:00:00',
];
for (const change of badCases) { const bad = clone(fixture); change(bad); assert.throws(() => validateBackup(bad)); }
assert.throws(() => parseBackup('{invalid'));
assert.throws(() => parseBackup(' '.repeat(10 * 1024 * 1024 + 1)), /10 MB/);
console.log('Backup validation passed: strict schema, copies, dates, names, duplicates, references and safe totals.');

async function storageChecks() {
  let picked = { canceled: false, result: { size: 100, text: async () => JSON.stringify(fixture), delete: () => assert.fail('Never delete the selected original') } };
  let pickerCalls = 0;
  const pickerLoader = createLoader({
    'expo-file-system': { File: class { static async pickFileAsync(options) { pickerCalls++; assert.equal(options.multipleFiles, false); return picked; } }, Paths: {} },
    'expo-document-picker': { getDocumentAsync: () => assert.fail('Use the scoped FileSystem picker') },
    'expo-sharing': {},
    'react-native': { Platform: { OS: 'android' } },
  });
  const pick = pickerLoader('src/services/backup-files.ts').pickFinancialBackup;
  assert.deepEqual(await pick(), fixture, 'Read the File returned by its own scoped native picker');
  picked = { canceled: true, result: null };
  assert.equal(await pick(), null);
  picked = { canceled: false, result: { size: BACKUP_MAX_BYTES + 1, text: () => assert.fail('Reject oversized file before reading it'), delete: () => assert.fail('Never delete the selected original') } };
  await assert.rejects(pick, /10 MB/);
  assert.equal(pickerCalls, 3);
  let exportFilesCreated = 0;
  const serviceLoader = createLoader({
    'expo-file-system': { File: class { constructor() { exportFilesCreated++; } }, Paths: { cache: 'test-cache' } },
    'expo-document-picker': {},
    'expo-sharing': { isAvailableAsync: async () => true },
    'react-native': { Platform: { OS: 'android' } },
  });
  await assert.rejects(() => serviceLoader('src/services/backup-files.ts').shareFinancialBackup(multibyte), /10 MB/);
  assert.equal(exportFilesCreated, 0, 'Oversized UTF-8 export is rejected before creating or writing a file');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-backup-'));
  const connections = [];
  let failInsert = false;
  const loader = createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
    assert(name.startsWith('test-'), 'Never open user databases');
    const db = new DatabaseSync(path.join(folder, name));
    connections.push(db);
    return {
      execAsync: async sql => db.exec(sql),
      getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
      getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
      runAsync: async (sql, ...args) => {
        if (failInsert && sql.startsWith('INSERT INTO savings_contributions')) throw Error('injected late insert failure');
        return db.prepare(sql).run(...args);
      },
      withTransactionAsync: async work => {
        db.exec('BEGIN');
        try { await work(); db.exec('COMMIT'); }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      },
      closeAsync: async () => {},
    };
  } } });
  try {
    const name = 'test-backup.db';
    const db = await loader('src/storage/database.ts').openDatabase(name);
    const { createFinancialBackup, restoreFinancialBackup, financialSignature } = loader('src/storage/backup.ts');
    let before = await createFinancialBackup(name);
    const read = () => createFinancialBackup(name);
    const signature = async () => financialSignature(await read());
    const beforeSignature = financialSignature(before);
    await assert.rejects(() => restoreFinancialBackup(fixture, beforeSignature, () => false, name), /Undo/);
    assert.equal(await signature(), beforeSignature);
    failInsert = true;
    await assert.rejects(() => restoreFinancialBackup(fixture, beforeSignature, () => true, name), /injected/);
    assert.equal(await signature(), beforeSignature, 'Late failure rolls back all deletions and previous inserts');
    failInsert = false;
    await restoreFinancialBackup(fixture, beforeSignature, () => true, name);
    assert.equal(await signature(), financialSignature(validateBackup(fixture)), 'All financial tables survive exact round trip');
    before = await read();
    await db.runAsync('UPDATE savings_goals SET title=? WHERE id=?', 'Changed', 'goal');
    await assert.rejects(() => restoreFinancialBackup(fixture, financialSignature(before), () => true, name), /changed/);
    before = await read();
    await db.runAsync('UPDATE monthly_limits SET limitCentavos=? WHERE month=?', 6000, '2026-11');
    await assert.rejects(() => restoreFinancialBackup(fixture, financialSignature(before), () => true, name), /changed/);
    const stable = await signature();
    let gateCalls = 0;
    await assert.rejects(() => restoreFinancialBackup(fixture, stable, () => ++gateCalls === 1, name), /Undo changed/);
    assert.equal(await signature(), stable, 'An Undo started during restore rolls the transaction back');
    const invalid = clone(fixture); invalid.tables.transfers[0].toWalletId = 'missing';
    assert.throws(() => restoreFinancialBackup(invalid, stable, () => true, name));
    assert.equal(await signature(), stable);
    for (const table of Object.keys(backupColumns)) assert((await read()).tables[table], `${table} included`);
    console.log('Backup SQLite passed: every table round trip, stale plans/savings, Undo gates and late-write rollback.');
  } finally {
    for (const db of connections) db.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
storageChecks().catch(error => { console.error(error); process.exitCode = 1; });
