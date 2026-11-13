const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-choice-migration-'));
  const mainName = 'test-migration.db', legacyName = 'test-legacy.db';
  const connections = new Set();
  let failCopy = false, failRead = false, legacyOpens = 0;
  function fresh() {
    return createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
      assert([mainName, legacyName].includes(name), 'Only explicitly isolated sample DBs may open');
      if (name === legacyName) legacyOpens++;
      const db = new DatabaseSync(path.join(folder, name)); connections.add(db);
      return {
        execAsync: async sql => db.exec(sql),
        runAsync: async (sql, ...args) => {
          if (failCopy && sql.startsWith('INSERT INTO custom_choices') && args[0] === 'legacy-income') throw Error('copy interrupted');
          return db.prepare(sql).run(...args);
        },
        getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
        getAllAsync: async (sql, ...args) => {
          if (name === legacyName && failRead) throw Error('legacy read interrupted');
          return db.prepare(sql).all(...args);
        },
        withTransactionAsync: async work => {
          db.exec('BEGIN');
          try { await work(); db.exec('COMMIT'); }
          catch (error) { db.exec('ROLLBACK'); throw error; }
        },
        closeAsync: async () => { if (connections.delete(db)) db.close(); },
      };
    } } });
  }
  try {
    let load = fresh();
    let db = await load('src/storage/database.ts').openDatabase(mainName);
    await db.runAsync('INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod,note) VALUES(?,?,?,?,?,?,?)', 'expense', 'expense', 12500, 'Everything Else', '2026-11-13', 'Not specified', 'Old category stays');
    const ledgerBefore = await load('src/storage/wallets.ts').readLedger(db); delete ledgerBefore.activityOrder;
    await db.execAsync('DROP TRIGGER IF EXISTS activity_transactions_added; DROP TRIGGER IF EXISTS activity_transfers_added; DROP TRIGGER IF EXISTS activity_changes_added; DROP TRIGGER IF EXISTS activity_transfers_removed; DROP TRIGGER IF EXISTS activity_changes_removed; DROP TABLE IF EXISTS activity_order; DROP TABLE IF EXISTS custom_choices; PRAGMA user_version=4');
    await db.closeAsync();
    const legacy = new DatabaseSync(path.join(folder, legacyName));
    legacy.exec(`CREATE TABLE custom_choices(id TEXT PRIMARY KEY NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('expense','income')),name TEXT NOT NULL,nameKey TEXT NOT NULL,UNIQUE(kind,nameKey))`);
    const originalRows = [
      { id: 'legacy-expense', kind: 'expense', name: ' Everything Else ', nameKey: 'everything else' },
      { id: 'legacy-income', kind: 'income', name: '  Weekend  Pay  ', nameKey: 'weekend  pay' },
    ];
    for (const row of originalRows) legacy.prepare('INSERT INTO custom_choices VALUES(?,?,?,?)').run(...Object.values(row));
    legacy.close();
    const legacyBytes = fs.readFileSync(path.join(folder, legacyName));
    failRead = true;
    load = fresh();
    await assert.rejects(load('src/storage/database.ts').openDatabase(mainName, legacyName), /legacy read interrupted/);
    failRead = false;
    failCopy = true;
    await assert.rejects(load('src/storage/database.ts').openDatabase(mainName, legacyName), /copy interrupted/);
    const inspect = new DatabaseSync(path.join(folder, mainName));
    assert.equal(inspect.prepare('PRAGMA user_version').get().user_version, 4, 'Failed migration never advances schema');
    assert.equal(inspect.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_choices'").get(), undefined, 'Table creation and partial copy both roll back');
    inspect.close();
    failCopy = false;
    db = await load('src/storage/database.ts').openDatabase(mainName, legacyName);
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 6);
    assert.deepEqual((await db.getAllAsync('SELECT * FROM custom_choices ORDER BY id')).map(row => ({ ...row })), originalRows);
    assert.deepEqual((({activityOrder, ...financial}) => financial)(await load('src/storage/wallets.ts').readLedger(db)), ledgerBefore, 'Migration keeps every financial record intact');
    assert.deepEqual(fs.readFileSync(path.join(folder, legacyName)), legacyBytes, 'Legacy source file is unchanged');
    const backup = load('src/storage/backup.ts');
    const saved = await backup.createFinancialBackup(mainName);
    const emptyChoices = JSON.parse(JSON.stringify(saved)); emptyChoices.tables.custom_choices = [];
    await backup.restoreFinancialBackup(emptyChoices, backup.financialSignature(saved), () => true, mainName);
    await db.closeAsync();
    const opensBefore = legacyOpens;
    load = fresh();
    db = await load('src/storage/database.ts').openDatabase(mainName, legacyName);
    assert.equal(legacyOpens, opensBefore, 'Migrated schema never reopens or reimports legacy choices');
    assert.deepEqual(await load('src/storage/choices.ts').getChoices('expense', mainName), [], 'Restored choice deletion cannot resurrect old legacy rows');
    assert.deepEqual((({activityOrder, ...financial}) => financial)(await load('src/storage/wallets.ts').readLedger(db)), ledgerBefore);
    console.log('Choice migration passed: isolated v4→v6, exact legacy preservation, read/copy failure rollback and retry, unchanged money, source retained, no resurrection after restore/reopen.');
  } finally {
    for (const db of connections) db.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
