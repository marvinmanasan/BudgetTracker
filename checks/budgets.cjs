const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-month-limits-'));
  const connections = new Set();
  let failMigration = false;
  let failSave = false;
  let failRead = false;
  const fresh = () => createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
    const db = new DatabaseSync(path.join(folder, name));
    connections.add(db);
    return {
      execAsync: async sql => {
        db.exec(sql);
        if (failMigration && sql.includes('CREATE TABLE') && sql.includes('monthly_limits')) throw Error('month migration interrupted');
      },
      runAsync: async (sql, ...params) => {
        const result = db.prepare(sql).run(...params);
        if (failSave && sql.includes('monthly_limits')) throw Error('limit save interrupted');
        return result;
      },
      getFirstAsync: async (sql, ...params) => {
        if (failRead && sql.includes('monthly_limits')) throw Error('limit read failed');
        return db.prepare(sql).get(...params) ?? null;
      },
      getAllAsync: async (sql, ...params) => {
        if (failRead && sql.includes('monthly_limits')) throw Error('limit read failed');
        return db.prepare(sql).all(...params);
      },
      closeAsync: async () => { db.close(); connections.delete(db); },
      withTransactionAsync: async work => {
        db.exec('BEGIN');
        try { await work(); db.exec('COMMIT'); }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      },
    };
  } } });
  const filename = path.join(folder, 'legacy.db');
  function legacySnapshot(db) {
    return JSON.stringify(['transactions', 'wallets', 'balance_changes', 'transfers', 'custom_choices'].map(table =>
      [table, db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
  }
  try {
    // Independent v2 fixture: removing/reseeding a wallet or altering history must fail preservation.
    const legacy = new DatabaseSync(filename);
    legacy.exec(`
      CREATE TABLE wallets(id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,nameKey TEXT NOT NULL UNIQUE,included INTEGER NOT NULL,hidden INTEGER NOT NULL,createdAt TEXT,updatedAt TEXT);
      CREATE TABLE transactions(id TEXT PRIMARY KEY NOT NULL,type TEXT NOT NULL,amountCentavos INTEGER NOT NULL,category TEXT NOT NULL,date TEXT NOT NULL,paymentMethod TEXT NOT NULL,note TEXT,walletId TEXT REFERENCES wallets(id));
      CREATE TABLE balance_changes(id TEXT PRIMARY KEY NOT NULL,walletId TEXT NOT NULL REFERENCES wallets(id),kind TEXT NOT NULL,deltaCentavos INTEGER NOT NULL,date TEXT NOT NULL,reason TEXT NOT NULL,targetCentavos INTEGER,createdAt TEXT);
      CREATE UNIQUE INDEX one_opening_per_wallet ON balance_changes(walletId) WHERE kind='opening';
      CREATE TABLE transfers(id TEXT PRIMARY KEY NOT NULL,fromWalletId TEXT NOT NULL REFERENCES wallets(id),toWalletId TEXT NOT NULL REFERENCES wallets(id),amountCentavos INTEGER NOT NULL,date TEXT NOT NULL,note TEXT NOT NULL,createdAt TEXT);
      CREATE TABLE custom_choices(id TEXT PRIMARY KEY,kind TEXT,name TEXT,nameKey TEXT);
      INSERT INTO wallets VALUES('custom','Renamed bank','renamed bank',0,1,'2026-01-01','2026-11-11'),('wallet-cash','Cash','cash',1,0,'2026-01-01','2026-01-01');
      INSERT INTO transactions VALUES('general','expense',123,'Special food','2026-11-01','Custom method','Preserve me',NULL),('assigned','income',456,'Gift','2026-11-02','Bank',NULL,'custom');
      INSERT INTO balance_changes VALUES('opening','custom','opening',1000,'2026-10-01','Starting balance',1000,'2026-10-01'),('adjustment','custom','adjustment',-20,'2026-11-02','Counted',1436,'2026-11-02');
      INSERT INTO transfers VALUES('transfer','custom','wallet-cash',100,'2026-11-03','Keep transfer','2026-11-03');
      INSERT INTO custom_choices VALUES('choice','expense','Special food','special food');
      PRAGMA user_version=2;
    `);
    const before = legacySnapshot(legacy);
    legacy.close();
    let load = fresh();
    let database = load('src/storage/database.ts');
    const migrated = await database.openDatabase('legacy.db');
    assert.equal((await migrated.getFirstAsync('PRAGMA user_version')).user_version, 4, 'v2 financial database upgrades to month-limit schema');
    assert.deepEqual(await migrated.getAllAsync('SELECT * FROM monthly_limits'), [], 'migration never invents a budget');
    let inspect = new DatabaseSync(filename);
    assert.equal(legacySnapshot(inspect), before, 'v2 money, renamed/hidden/excluded wallets, choices and deleted defaults remain exact');
    inspect.close();
    await migrated.closeAsync();

    // A failed post-DDL setup must roll back both version and table, then retry the same loader.
    inspect = new DatabaseSync(filename);
    inspect.exec('DROP TABLE monthly_limits; PRAGMA user_version=2');
    inspect.close();
    load = fresh(); database = load('src/storage/database.ts');
    failMigration = true;
    await assert.rejects(database.openDatabase('legacy.db'), /migration interrupted/);
    inspect = new DatabaseSync(filename);
    assert.equal(inspect.prepare('PRAGMA user_version').get().user_version, 2);
    assert.equal(inspect.prepare("SELECT name FROM sqlite_master WHERE name='monthly_limits'").get(), undefined);
    assert.equal(legacySnapshot(inspect), before);
    inspect.close();
    failMigration = false;
    await database.openDatabase('legacy.db');

    assert.ok(fs.existsSync('src/storage/budgets.ts'), 'month-limit persistence API must exist');
    let budgets = load('src/storage/budgets.ts');
    assert.equal(await budgets.getMonthlyLimit('2026-11'), null);
    await budgets.setMonthlyLimit('2026-11', 123);
    assert.equal(JSON.stringify(await budgets.getMonthlyLimits()), JSON.stringify([{ month: '2026-11', limitCentavos: 123 }]));
    assert.equal(await budgets.getMonthlyLimit('2026-11', 'legacy.db'), null, 'absence is distinct from explicit zero');
    await budgets.setMonthlyLimit('2026-11', 50000, 'legacy.db');
    await budgets.setMonthlyLimit('2026-10', 70000, 'legacy.db');
    await budgets.setMonthlyLimit('2026-11', 0, 'legacy.db');
    await budgets.setMonthlyLimit('0001-01', 1, 'legacy.db');
    await budgets.setMonthlyLimit('9999-12', Number.MAX_SAFE_INTEGER, 'legacy.db');
    assert.equal(await budgets.getMonthlyLimit('2026-11', 'legacy.db'), 0);
    assert.equal(await budgets.getMonthlyLimit('2026-12', 'legacy.db'), null, 'new months are not silently copied');
    const expected = [
      { month: '9999-12', limitCentavos: Number.MAX_SAFE_INTEGER },
      { month: '2026-11', limitCentavos: 0 },
      { month: '2026-10', limitCentavos: 70000 },
      { month: '0001-01', limitCentavos: 1 },
    ];
    assert.equal(JSON.stringify(await budgets.getMonthlyLimits('legacy.db')), JSON.stringify(expected), 'upsert updates only one month and results descend');
    for (const month of ['', '2026-1', '2026-00', '2026-13', '0000-01', '10000-01', ' 2026-11', '2026-11 ', '2026-11-01', "2026-11'); DROP TABLE wallets;--", null, 202611]) {
      await assert.rejects(budgets.getMonthlyLimit(month, 'legacy.db'), /month/i);
      await assert.rejects(budgets.setMonthlyLimit(month, 1, 'legacy.db'), /month/i);
    }
    for (const amount of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100', null, undefined]) {
      await assert.rejects(budgets.setMonthlyLimit('2026-11', amount, 'legacy.db'), /limit|centavos|integer/i);
    }
    failSave = true;
    await assert.rejects(budgets.setMonthlyLimit('2026-11', 999, 'legacy.db'), /save interrupted/);
    failSave = false;
    assert.equal(await budgets.getMonthlyLimit('2026-11', 'legacy.db'), 0, 'interrupted write rolls back');
    failRead = true;
    await assert.rejects(budgets.getMonthlyLimit('2026-11', 'legacy.db'), /read failed/);
    await assert.rejects(budgets.getMonthlyLimits('legacy.db'), /read failed/);
    failRead = false;
    assert.equal(JSON.stringify(await budgets.getMonthlyLimits('legacy.db')), JSON.stringify(expected));
    assert.equal(await budgets.getMonthlyLimit('2026-11', 'isolated.db'), null);
    await budgets.setMonthlyLimit('2026-11', 9, 'isolated.db');
    assert.equal(await budgets.getMonthlyLimit('2026-11', 'legacy.db'), 0);
    inspect = new DatabaseSync(filename);
    assert.equal(legacySnapshot(inspect), before, 'month updates never alter ledger rows or choices');
    inspect.close();
    for (const db of connections) db.close();
    connections.clear();
    load = fresh(); budgets = load('src/storage/budgets.ts');
    assert.equal(JSON.stringify(await budgets.getMonthlyLimits('legacy.db')), JSON.stringify(expected), 'settings persist after real disk reopen');
    console.log('Monthly limit SQLite checks passed: v2 preservation, migration rollback/retry, zero vs absent, month validation, safe-centavo limits, upsert/order, save rollback, read errors, isolation and reopen.');
    await budgets.setMonthlyLimit('2026-12',0,'copy.db');
    assert.equal(await budgets.ensureMonthlyLimit('2027-01','copy.db'),0);
    await budgets.setMonthlyLimit('2027-01',5000,'copy.db');
    assert.equal(await budgets.ensureMonthlyLimit('2027-01','copy.db'),5000);
    assert.equal(await budgets.ensureMonthlyLimit('2027-03','copy.db'),null);
  } finally {
    for (const db of connections) db.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
