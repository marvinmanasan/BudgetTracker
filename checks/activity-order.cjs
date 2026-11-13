const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-activity-order-'));
  const connections = new Set();
  let failMigration = false, failRestore = false, failReset = false;
  function fresh() {
    return createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
      assert(name.startsWith('test-'), 'Open isolated sample databases only');
      const db = new DatabaseSync(path.join(folder, name)); connections.add(db);
      return {
        execAsync: async sql => {
          db.exec(sql);
          if (failMigration && sql.includes('CREATE TRIGGER')) throw Error('order migration interrupted');
        },
        getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
        getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
        runAsync: async (sql, ...args) => {
          if (failRestore && sql.startsWith('INSERT INTO transactions')) throw Error('restore interrupted');
          const result = db.prepare(sql).run(...args);
          if (failReset && sql.startsWith('DELETE FROM balance_changes')) throw Error('reset interrupted');
          return result;
        },
        withTransactionAsync: async work => { db.exec('BEGIN'); try { await work(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } },
        closeAsync: async () => { if (connections.delete(db)) db.close(); },
      };
    } } });
  }
  try {
    const { legacyActivityOrder } = fresh()('src/lib/activity.ts');
    const older = Date.parse('2026-11-13T00:00:00.000Z').toString(36);
    const newer = Date.parse('2026-11-13T00:01:00.000Z').toString(36);
    const reconstructed = legacyActivityOrder({
      transactions: [{ id: `entry-${older}-a-b` }, { id: 'unknown-old-id' }],
      transfers: [{ id: `transfer-${newer}-a-b`, createdAt: '2026-11-12 00:00:00' }],
      changes: [{ id: 'opening-wallet-cash', createdAt: '2026-11-01 00:00:00' }],
    });
    assert.deepEqual(reconstructed.map(row => row.recordId), ['unknown-old-id', 'opening-wallet-cash', `entry-${older}-a-b`, `transfer-${newer}-a-b`], 'Legacy backfill uses recognized ID timestamps and valid createdAt, with stable fallback for unknown chronology');
    const name = 'test-order.db';
    let load = fresh(), wallets = load('src/storage/wallets.ts'), store = load('src/storage/transactions.ts');
    const { activitySections } = load('src/lib/activity.ts');
    const backup = load('src/storage/backup.ts');
    const date = '2026-11-13';
    const record = (id, type = 'expense') => ({ id, type, amountCentavos: 100, category: type === 'expense' ? 'Food' : 'Salary', date, paymentMethod: 'Not specified', walletId: 'wallet-gcash' });
    await wallets.setOpening('wallet-gcash', 100000, name);
    await wallets.setOpening('wallet-cash', 50000, name);
    await store.saveTransaction(record('zzz-first'), name);
    await wallets.recordTransfer({ id: 'aaa-second', fromWalletId: 'wallet-gcash', toWalletId: 'wallet-cash', amountCentavos: 200, date, note: '' }, name);
    await store.saveTransaction(record('aaa-third', 'income'), name);
    await wallets.adjustWallet({ id: 'zzz-fourth', walletId: 'wallet-gcash', targetCentavos: 99000, date, reason: 'Counted' }, name);
    const keys = async () => activitySections(await wallets.getLedger(name)).flatMap(section => section.data).filter(row => !row.key.startsWith('change-opening-')).map(row => row.key);
    const expected = ['change-zzz-fourth', 'transaction-aaa-third', 'transfer-aaa-second', 'transaction-zzz-first'];
    assert.deepEqual(await keys(), expected, 'Same-day mixed record types show newest saved first, regardless of IDs');
    const getOrder = async () => (await wallets.getLedger(name)).activityOrder;
    const initialOrder = await getOrder();
    await store.updateTransaction({ ...record('zzz-first'), category: 'Transport', date: '2026-11-12' }, name);
    assert.deepEqual(await getOrder(), initialOrder, 'Editing an amount, label or financial date cannot change saved order');
    await store.updateTransaction({ ...record('zzz-first'), category: 'Transport' }, name);
    assert.deepEqual(await keys(), expected);
    const deleted = await store.deleteTransaction('zzz-first', name);
    await store.saveTransaction(record('mmm-later'), name);
    await store.restoreTransaction(deleted, name);
    assert.deepEqual(await keys(), ['transaction-mmm-later', ...expected], 'Undo puts the original record back at its original position');
    const originalNow = Date.now;
    try { Date.now = () => 1; await store.saveTransaction(record('bbb-clock-backwards'), name); }
    finally { Date.now = originalNow; }
    assert.equal((await keys())[0], 'transaction-bbb-clock-backwards');
    await Promise.all([
      store.saveTransaction(record('rapid-z'), name),
      wallets.recordTransfer({ id: 'rapid-a', fromWalletId: 'wallet-gcash', toWalletId: 'wallet-cash', amountCentavos: 100, date, note: '' }, name),
      store.saveTransaction(record('rapid-b', 'income'), name),
    ]);
    assert.deepEqual((await keys()).slice(0, 3), ['transaction-rapid-b', 'transfer-rapid-a', 'transaction-rapid-z'], 'One sequence spans queued writes across every Activity record type');
    await store.deleteTransaction('mmm-later', name);
    const saved = await backup.createFinancialBackup(name);
    assert(!saved.tables.activity_order.some(row => row.recordId === 'mmm-later'), 'Exports exclude deleted record identities');
    assert.equal(saved.tables.activity_order.length, saved.tables.transactions.length + saved.tables.transfers.length + saved.tables.balance_changes.length);
    const beforeKeys = await keys();
    const signature = backup.financialSignature(saved);
    failRestore = true;
    await assert.rejects(() => backup.restoreFinancialBackup(saved, signature, () => true, name), /restore interrupted/);
    failRestore = false;
    assert.equal(backup.financialSignature(await backup.createFinancialBackup(name)), signature, 'Failed replacement rolls record data and order back together');
    await backup.restoreFinancialBackup(saved, signature, () => true, name);
    assert.deepEqual(await keys(), beforeKeys, 'Complete backup roundtrip preserves every Activity position');
    await store.saveTransaction(record('after-restore'), name);
    assert.equal((await keys())[0], 'transaction-after-restore', 'New records after restore get a greater sequence');
    // Starting balances reuse a deterministic ID after reset, but they are new
    // additions. Only transaction deletes support Undo and retain tombstones.
    const resetName = 'test-reset-order.db';
    await wallets.setOpening('wallet-gcash', 100000, resetName);
    await store.saveTransaction({ ...record('general-between'), type: 'income', walletId: null }, resetName);
    const reset = load('src/storage/selective-reset.ts');
    const pick = { scope: 'wallet', walletId: 'wallet-gcash', kinds: { expenses: true, income: true, transfers: true, adjustments: true }, resetStartingBalances: true };
    const resetBefore = await wallets.getLedger(resetName);
    const resetPreview = await reset.getResetPreview(pick, resetName);
    failReset = true;
    await assert.rejects(reset.applyReset(pick, resetPreview.signature, resetName), /reset interrupted/);
    failReset = false;
    assert.deepEqual(await wallets.getLedger(resetName), resetBefore, 'Reset failure rolls financial rows and removed order metadata back together');
    await reset.applyReset(pick, resetPreview.signature, resetName);
    await wallets.setOpening('wallet-gcash', 50000, resetName);
    const resetAfter = await wallets.getLedger(resetName);
    const openingOrder = resetAfter.activityOrder.find(row => row.recordId === 'opening-wallet-gcash').sequence;
    const incomeOrder = resetAfter.activityOrder.find(row => row.recordId === 'general-between').sequence;
    assert(openingOrder > incomeOrder, 'A fresh starting balance after reset gets a fresh Activity position');
    const orderDb = await load('src/storage/database.ts').openDatabase(name);
    const maxSnapshot = await backup.createFinancialBackup(name);
    maxSnapshot.tables.activity_order.forEach((row, index, rows) => { row.sequence = Number.MAX_SAFE_INTEGER - rows.length + index + 1; });
    await backup.restoreFinancialBackup(maxSnapshot, backup.financialSignature(await backup.createFinancialBackup(name)), () => true, name);
    await store.saveTransaction(record('after-max-import'), name);
    assert.equal((await keys())[0], 'transaction-after-max-import', 'Imported sequence magnitude cannot prevent future saves');
    const healthy = await backup.createFinancialBackup(name);
    await orderDb.runAsync("UPDATE sqlite_sequence SET seq=? WHERE name='activity_order'", Number.MAX_SAFE_INTEGER);
    const poisonedSignature = backup.financialSignature(await backup.createFinancialBackup(name));
    failRestore = true;
    await assert.rejects(backup.restoreFinancialBackup(healthy, poisonedSignature, () => true, name), /restore interrupted/);
    failRestore = false;
    assert.equal((await orderDb.getFirstAsync("SELECT seq FROM sqlite_sequence WHERE name='activity_order'")).seq, Number.MAX_SAFE_INTEGER, 'Late failure rolls the saved-order high-water counter back too');
    assert.equal(backup.financialSignature(await backup.createFinancialBackup(name)), poisonedSignature);
    await backup.restoreFinancialBackup(healthy, poisonedSignature, () => true, name);
    await store.saveTransaction(record('after-highwater-repair'), name);
    assert.equal((await keys())[0], 'transaction-after-highwater-repair', 'A healthy restore repairs an oversized old counter without changing money rules');
    let db = await load('src/storage/database.ts').openDatabase(name);
    const moneyBefore = await wallets.getLedger(name); delete moneyBefore.activityOrder;
    await db.execAsync('DROP TRIGGER activity_transactions_added; DROP TRIGGER activity_transfers_added; DROP TRIGGER activity_changes_added; DROP TRIGGER activity_transfers_removed; DROP TRIGGER activity_changes_removed; DROP TABLE activity_order; PRAGMA user_version=5');
    await db.closeAsync();
    load = fresh(); failMigration = true;
    await assert.rejects(load('src/storage/database.ts').openDatabase(name), /order migration interrupted/);
    const inspect = new DatabaseSync(path.join(folder, name));
    assert.equal(inspect.prepare('PRAGMA user_version').get().user_version, 5);
    assert.equal(inspect.prepare("SELECT name FROM sqlite_master WHERE name='activity_order'").get(), undefined, 'Failed migration rolls table, triggers and metadata back');
    inspect.close(); failMigration = false;
    db = await load('src/storage/database.ts').openDatabase(name);
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 6);
    const migrated = await load('src/storage/wallets.ts').getLedger(name); delete migrated.activityOrder;
    assert.deepEqual(migrated, moneyBefore, 'Metadata migration never changes financial rows');
    await db.execAsync('DROP TRIGGER activity_changes_removed; DROP TRIGGER activity_transfers_removed');
    await db.closeAsync();
    load = fresh();
    const reopened = await load('src/storage/wallets.ts').getLedger(name);
    assert.equal(reopened.activityOrder.length, reopened.transactions.length + reopened.transfers.length + reopened.changes.length);
    const repairedDb = await load('src/storage/database.ts').openDatabase(name);
    assert.equal((await repairedDb.getAllAsync("SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('activity_changes_removed','activity_transfers_removed')")).length, 2, 'Opening a local schema6 draft installs missing delete triggers without rewriting financial records');
    const repairedMoney = { ...reopened }; delete repairedMoney.activityOrder; assert.deepEqual(repairedMoney, moneyBefore);
    console.log('Activity saved-order passed: cross-type insertion order, unchanged edits/Undo, rapid writes, backwards clock, exact backup ordering, rollback and v5→v6 preservation/retry/reopen.');
  } finally { for (const db of connections) db.close(); fs.rmSync(folder, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
