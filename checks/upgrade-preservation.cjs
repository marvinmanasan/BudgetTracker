const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

// Frozen v1.0.0 schema from src/storage/database.ts at commit 8a5c300.
// Keep this independent of current migrations. No Git installation/history is
// needed to run the check, and no database outside this test folder may open.
const V1_SCHEMA = `PRAGMA foreign_keys=ON;

    CREATE TABLE IF NOT EXISTS transactions(
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amountCentavos INTEGER NOT NULL CHECK (amountCentavos > 0),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    note TEXT);
    

          CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
            nameKey TEXT NOT NULL UNIQUE,
            included INTEGER NOT NULL CHECK(included IN (0,1)),
            hidden INTEGER NOT NULL CHECK(hidden IN (0,1)),
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          ALTER TABLE transactions ADD COLUMN walletId TEXT REFERENCES wallets(id) ON DELETE RESTRICT;
          CREATE TABLE IF NOT EXISTS balance_changes (
            id TEXT PRIMARY KEY NOT NULL, walletId TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
            kind TEXT NOT NULL CHECK(kind IN ('opening','adjustment')),
            deltaCentavos INTEGER NOT NULL, date TEXT NOT NULL,
            reason TEXT NOT NULL, targetCentavos INTEGER,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE UNIQUE INDEX IF NOT EXISTS one_opening_per_wallet ON balance_changes(walletId) WHERE kind='opening';
          CREATE TABLE IF NOT EXISTS transfers (
            id TEXT PRIMARY KEY NOT NULL,
            fromWalletId TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
            toWalletId TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
            amountCentavos INTEGER NOT NULL CHECK(amountCentavos > 0),
            date TEXT NOT NULL, note TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CHECK(fromWalletId <> toWalletId)
          );
          CREATE INDEX IF NOT EXISTS transaction_wallet ON transactions(walletId);
          CREATE INDEX IF NOT EXISTS balance_wallet ON balance_changes(walletId);
          CREATE INDEX IF NOT EXISTS transfer_source ON transfers(fromWalletId);
          CREATE INDEX IF NOT EXISTS transfer_destination ON transfers(toWalletId);
        

          CREATE TABLE IF NOT EXISTS monthly_limits (
            month TEXT PRIMARY KEY NOT NULL,
            limitCentavos INTEGER NOT NULL CHECK (
              typeof(limitCentavos) = 'integer' AND
              limitCentavos >= 0 AND limitCentavos <= 9007199254740991
            )
          );
          CREATE TABLE IF NOT EXISTS category_allocations (
            month TEXT NOT NULL REFERENCES monthly_limits(month) ON DELETE RESTRICT,
            category TEXT NOT NULL CHECK(length(trim(category)) > 0),
            limitCentavos INTEGER NOT NULL CHECK(typeof(limitCentavos) = 'integer' AND limitCentavos >= 0 AND limitCentavos <= 9007199254740991),
            PRIMARY KEY(month, category)
          );
          CREATE TABLE IF NOT EXISTS savings_goals (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL CHECK(length(trim(title)) > 0),
            targetCentavos INTEGER NOT NULL CHECK(typeof(targetCentavos) = 'integer' AND targetCentavos > 0 AND targetCentavos <= 9007199254740991)
          );
          CREATE TABLE IF NOT EXISTS savings_contributions (
            id TEXT PRIMARY KEY NOT NULL,
            goalId TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE RESTRICT,
            amountCentavos INTEGER NOT NULL CHECK(typeof(amountCentavos) = 'integer' AND amountCentavos > 0 AND amountCentavos <= 9007199254740991),
            date TEXT NOT NULL,
            note TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS savings_goal_history ON savings_contributions(goalId,date);
          PRAGMA user_version = 4;
        `;

const financialTables = ['wallets', 'transactions', 'balance_changes', 'transfers', 'monthly_limits', 'category_allocations', 'savings_goals', 'savings_contributions'];
const stamp = '2026-11-12 08:09:10';
const mainName = 'test-upgrade-financial.db';
const legacyName = 'test-upgrade-choices.db';
const settingsName = 'test-upgrade-settings.db';
const jsonRows = rows => rows.map(row => ({ ...row }));
function snapshot(db, tables = financialTables) {
  return Object.fromEntries(tables.map(table => [table, jsonRows(db.prepare(`SELECT rowid AS originalRowid,* FROM ${table} ORDER BY rowid`).all())]));
}
function ledgerFromRows(tables) {
  return {
    wallets: tables.wallets.map(row => ({ id: row.id, name: row.name, included: row.included === 1, hidden: row.hidden === 1 })),
    transactions: tables.transactions.map(({ originalRowid, ...row }) => ({ ...row, note: row.note ?? undefined, walletId: row.walletId ?? undefined })),
    changes: tables.balance_changes.map(({ originalRowid, createdAt, ...row }) => row),
    transfers: tables.transfers.map(({ originalRowid, createdAt, ...row }) => row),
  };
}
function seedVersionOne(folder) {
  const db = new DatabaseSync(path.join(folder, mainName));
  db.exec(V1_SCHEMA);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 4);
  const insertWallet = db.prepare('INSERT INTO wallets(id,name,nameKey,included,hidden,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)');
  for (const [id, name, included, hidden] of [
    ['wallet-gcash', 'GCash', 1, 0], ['wallet-cash', 'Cash', 1, 1],
    ['wallet-maya', 'Maya', 0, 1], ['wallet-gotyme', 'GoTyme', 1, 0],
    ['wallet-maribank', 'MariBank', 1, 0], ['household', 'Sari-Sari 🧺', 1, 1],
  ]) insertWallet.run(id, name, name.toLowerCase(), included, hidden, stamp, stamp);
  const change = db.prepare('INSERT INTO balance_changes(id,walletId,kind,deltaCentavos,date,reason,targetCentavos,createdAt) VALUES(?,?,?,?,?,?,?,?)');
  for (const [id, amount] of [['wallet-gcash', 100000], ['wallet-cash', 0], ['wallet-maya', 200000], ['wallet-gotyme', -5000], ['household', 12345]]) {
    change.run('opening-' + id, id, 'opening', amount, '2026-11-01', 'Starting balance', null, stamp);
  }
  change.run('old-adjustment', 'wallet-gcash', 'adjustment', -2500, '2026-11-13', "Counted on 11-13-2026: ₱900.00\nDo not change this reason.", 90000, stamp);
  const transaction = db.prepare('INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod,note,walletId) VALUES(?,?,?,?,?,?,?,?)');
  const rows = [
    ['old-expense-gcash', 'expense', 12500, 'Food', '2026-11-12', 'GCash', "Lola's lunch 🧺\n11-12-2026 · keep 100%", 'wallet-gcash'],
    ['old-income-gcash', 'income', 20000, 'Weekend  Pay', '2026-11-10', 'Bank deposit', null, 'wallet-gcash'],
    ['old-zero-cash', 'expense', 15000, 'Tricycle Fare (Old)', '2026-11-11', 'Cash', '', 'wallet-cash'],
    ['old-excluded-maya', 'expense', 10000, 'Groceries', '2026-11-11', 'Maya', 'Hidden and excluded still count in spending', 'wallet-maya'],
    ['old-custom-wallet', 'expense', 2345, 'Lutong Bahay', '2026-11-09', 'Cash', 'Centavos stay exact: 23.45', 'household'],
    ['old-general-expense', 'expense', 4567, 'Everything Else', '2026-11-08', 'Not specified', 'Historical reserved label stays', null],
    ['old-general-income', 'income', 1234, 'Allowance (Old)', '2026-11-07', 'Not specified', '11-07-2026', null],
    ['old-october-expense', 'expense', 2500, 'Obsolete Category', '2026-10-31', 'Cash', '10-31-2026', null],
  ];
  for (const row of rows) transaction.run(...row);
  const transfer = db.prepare('INSERT INTO transfers(id,fromWalletId,toWalletId,amountCentavos,date,note,createdAt) VALUES(?,?,?,?,?,?,?)');
  transfer.run('old-included-transfer', 'wallet-gcash', 'wallet-cash', 15000, '2026-11-11', '11-11-2026 · no income or expense', stamp);
  transfer.run('old-cross-inclusion-transfer', 'wallet-maya', 'household', 5000, '2026-11-09', 'From excluded wallet to hidden included wallet', stamp);
  for (const row of [['2026-10', 0], ['2026-11', 100000], ['2026-12', 56789]]) db.prepare('INSERT INTO monthly_limits VALUES(?,?)').run(...row);
  for (const row of [['2026-10', 'Obsolete Category', 0], ['2026-11', 'Food', 40000], ['2026-11', 'Tricycle Fare (Old)', 10000]]) db.prepare('INSERT INTO category_allocations VALUES(?,?,?)').run(...row);
  for (const row of [['main', 'School Fund 🧺', 100000], ['older-goal', 'Old Goal', 50000]]) db.prepare('INSERT INTO savings_goals VALUES(?,?,?)').run(...row);
  for (const row of [
    ['old-saving-november', 'main', 12345, '2026-11-12', '11-12-2026 · first envelope'],
    ['old-saving-october', 'main', 1000, '2026-10-31', "Lola's spare coins"],
    ['old-saving-other-goal', 'older-goal', 777, '2026-11-01', 'Older contribution must remain'],
  ]) db.prepare('INSERT INTO savings_contributions VALUES(?,?,?,?,?)').run(...row);
  const before = snapshot(db);
  const beforeSchema = jsonRows(db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all());
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name IN ('custom_choices','activity_order')").get().count, 0, 'Fixture must be original v1 schema4, not downgraded current schema');
  db.close();

  const legacy = new DatabaseSync(path.join(folder, legacyName));
  legacy.exec(`CREATE TABLE custom_choices(id TEXT PRIMARY KEY NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('expense','income')),name TEXT NOT NULL,nameKey TEXT NOT NULL,UNIQUE(kind,nameKey))`);
  const choices = [
    ['legacy-reserved', 'expense', ' Everything Else ', 'everything else'],
    ['legacy-food', 'expense', 'Lutong Bahay', 'lutong bahay'],
    ['legacy-income', 'income', '  Weekend  Pay  ', 'weekend  pay'],
    ['legacy-unicode', 'income', 'Padala 🧺', 'padala 🧺'],
  ];
  for (const row of choices) legacy.prepare('INSERT INTO custom_choices VALUES(?,?,?,?)').run(...row);
  const beforeChoices = jsonRows(legacy.prepare('SELECT * FROM custom_choices ORDER BY rowid').all());
  legacy.close();

  const settings = new DatabaseSync(path.join(folder, settingsName));
  settings.exec('CREATE TABLE preferences(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL); PRAGMA user_version=1;');
  const preferenceValue = '{ "displayName": "Sample Household", "appearance": "dark", "onboardingComplete": true }';
  settings.prepare('INSERT INTO preferences(id,value) VALUES(1,?)').run(preferenceValue);
  const beforeSettings = snapshot(settings, ['preferences']);
  settings.close();
  return { before, beforeSchema, beforeChoices, beforeSettings, preferences: JSON.parse(preferenceValue) };
}

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-v1-upgrade-'));
  const connections = new Set();
  const opened = [];
  const allowed = new Set([mainName, legacyName, settingsName]);
  const bridge = { openDatabaseAsync: async name => {
    assert(allowed.has(name), `Never open a user's database: ${name}`);
    opened.push(name);
    const db = new DatabaseSync(path.join(folder, name)); connections.add(db);
    return {
      execAsync: async sql => db.exec(sql),
      getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
      getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
      runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
      withTransactionAsync: async work => { db.exec('BEGIN'); try { await work(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } },
      closeAsync: async () => { if (connections.delete(db)) db.close(); },
    };
  } };
  const fresh = () => createLoader({ 'expo-sqlite': bridge });
  try {
    const fixture = seedVersionOne(folder);
    const legacyBytes = fs.readFileSync(path.join(folder, legacyName));
    const settingsBytes = fs.readFileSync(path.join(folder, settingsName));
    let load = fresh();
    const { deriveBalances, monthlyTotals } = load('src/lib/ledger.ts');
    const { savingsSummary } = load('src/lib/savings-summary.ts');
    const baseline = ledgerFromRows(fixture.before);
    const oldBalances = deriveBalances(baseline);
    assert.deepEqual(Object.fromEntries(oldBalances.wallets.map(w => [w.id, w.balanceCentavos])), {
      'wallet-gcash': 90000, 'wallet-cash': 0, 'wallet-maya': 185000,
      'wallet-gotyme': -5000, 'wallet-maribank': 0, household: 15000,
    });
    assert.equal(oldBalances.generalCentavos, -5833);
    assert.equal(oldBalances.totalCentavos, 94167);
    const months = ['2026-10', '2026-11', '2026-12'];
    const oldMonthly = months.map(month => [month, monthlyTotals(baseline, month)]);
    assert.deepEqual(oldMonthly, [
      ['2026-10', { incomeCentavos: 0, expenseCentavos: 2500 }],
      ['2026-11', { incomeCentavos: 21234, expenseCentavos: 44412 }],
      ['2026-12', { incomeCentavos: 0, expenseCentavos: 0 }],
    ]);
    const oldGoals = fixture.before.savings_goals.map(({ originalRowid, ...goal }) => goal);
    const oldContributions = fixture.before.savings_contributions.map(({ originalRowid, ...record }) => record);
    const oldSavings = oldGoals.map(goal => savingsSummary(goal, oldContributions));
    assert.equal(oldSavings[0].savedCentavos, 13345);
    assert.equal(oldSavings[1].savedCentavos, 777);

    if (process.argv.includes('--keep-fixture')) {
      const workspace = path.resolve(__dirname, '..');
      const destination = path.resolve(workspace, '.expo', 'upgrade-validation', 'fixture');
      assert(destination.startsWith(path.join(workspace, '.expo') + path.sep), 'Keep fixture artifacts inside the ignored workspace folder');
      fs.mkdirSync(destination, { recursive: true });
      for (const [source, target] of [[mainName, 'bulsa.db'], [legacyName, 'bulsa-choices.db'], [settingsName, 'bulsa-settings.db']]) {
        fs.copyFileSync(path.join(folder, source), path.join(destination, target));
      }
      const manifest = {
        sourceVersion: '1.0.0', sourceCommit: '8a5c300', financialSchemaVersion: 4,
        note: 'Fictional sample data only. These three SQLite files were copied after seed connections closed and before any latest-source migration.',
        financialRows: fixture.before, originalSchema: fixture.beforeSchema,
        customChoices: fixture.beforeChoices, preferencesRows: fixture.beforeSettings,
        preferences: fixture.preferences,
        expected: {
          balances: oldBalances,
          monthlyTotals: Object.fromEntries(oldMonthly),
          savings: Object.fromEntries(oldGoals.map((goal, index) => [goal.id, oldSavings[index]])),
        },
      };
      fs.writeFileSync(path.join(destination, 'v1-fixture.json'), JSON.stringify(manifest, null, 2) + '\n');
      console.log(`Kept original schema4 fixture in ${destination}`);
    }
    let db = await load('src/storage/database.ts').openDatabase(mainName, legacyName);
    const raw = () => Object.fromEntries(financialTables.map(table => [table, jsonRows(dbForInspect().prepare(`SELECT rowid AS originalRowid,* FROM ${table} ORDER BY rowid`).all())]));
    // Inspection uses a separate read connection, never the user's app database.
    let inspect;
    function dbForInspect() { if (!inspect) { inspect = new DatabaseSync(path.join(folder, mainName)); connections.add(inspect); } return inspect; }
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 6);
    const originalSchemaStillPresent = () => {
      const current = new Map(jsonRows(dbForInspect().prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all()).map(row => [row.name, row]));
      for (const original of fixture.beforeSchema) assert.deepEqual(current.get(original.name), original, `Original table/index must remain unchanged: ${original.name}`);
    };
    originalSchemaStillPresent();
    assert.deepEqual(raw(), fixture.before, 'Every pre-existing row, ID, date, label, amount, note, flag, timestamp and rowid must remain exact');
    assert.deepEqual(jsonRows(await db.getAllAsync('SELECT * FROM custom_choices ORDER BY rowid')), fixture.beforeChoices, 'Legacy choice identities, spacing, keys and reserved names migrate exactly');
    assert.deepEqual(fs.readFileSync(path.join(folder, legacyName)), legacyBytes, 'Legacy choices file remains byte-identical');
    assert.deepEqual(fs.readFileSync(path.join(folder, settingsName)), settingsBytes, 'Financial migration never writes the settings file');
    assert(!opened.includes(settingsName), 'Financial migration must not open preferences');
    assert.equal((await db.getAllAsync('PRAGMA foreign_key_check')).length, 0);
    const compareDerived = async () => {
      const ledger = await load('src/storage/wallets.ts').getLedger(mainName);
      const { activityOrder } = ledger;
      assert.deepEqual(deriveBalances(ledger), oldBalances, 'Every wallet balance, inclusion/configuration flag, General and Total Budget stay equal');
      assert.deepEqual(months.map(month => [month, monthlyTotals(ledger, month)]), oldMonthly, 'Each month retains identical income and spending');
      const saved = await load('src/storage/savings.ts').getSavings(mainName);
      assert.deepEqual(saved.goals.map(goal => savingsSummary(goal, jsonRows(saved.contributions))), oldSavings, 'All goals, progress, remaining money and contribution history stay equal');
      assert.equal(activityOrder.length, baseline.transactions.length + baseline.changes.length + baseline.transfers.length, 'New order metadata covers every old Activity record once');
      return activityOrder;
    };
    const order = await compareDerived();
    const preferenceStore = load('src/storage/preferences.ts');
    assert.deepEqual(await preferenceStore.getPreferences(settingsName), fixture.preferences);
    const inspectSettings = new DatabaseSync(path.join(folder, settingsName)); connections.add(inspectSettings);
    assert.deepEqual(snapshot(inspectSettings, ['preferences']), fixture.beforeSettings, 'Display preferences preserve the exact stored JSON, not only parsed values');
    assert.equal(inspectSettings.prepare('PRAGMA user_version').get().user_version, 1); inspectSettings.close(); connections.delete(inspectSettings);
    const legacyOpens = opened.filter(name => name === legacyName).length;
    inspect.close(); connections.delete(inspect); inspect = undefined;
    for (const connection of [...connections]) { connection.close(); connections.delete(connection); }
    load = fresh();
    db = await load('src/storage/database.ts').openDatabase(mainName, legacyName);
    assert.equal(opened.filter(name => name === legacyName).length, legacyOpens, 'Reopening schema6 must not import the legacy file again');
    assert.deepEqual(raw(), fixture.before, 'Reopen is idempotent for every original row');
    originalSchemaStillPresent();
    assert.deepEqual(await compareDerived(), order, 'Reopen preserves assigned Activity order');
    assert.deepEqual(jsonRows(await db.getAllAsync('SELECT * FROM custom_choices ORDER BY rowid')), fixture.beforeChoices);
    assert.deepEqual(fs.readFileSync(path.join(folder, legacyName)), legacyBytes);
    inspect.close(); connections.delete(inspect); inspect = undefined;
    const count = Object.values(fixture.before).reduce((sum, rows) => sum + rows.length, 0);
    console.log(`V1 upgrade preservation passed: schema4→6, ${count} exact financial rows across8 tables,4 exact legacy choices, unchanged settings, all balances/months/savings and idempotent reopen. SQLite verification only, not APK upgrade acceptance.`);
  } finally {
    for (const db of connections) db.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
