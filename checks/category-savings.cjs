const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-category-savings-'));
  const connections = new Set();
  let failMigration = false, failAllocation = false, failContribution = false;
  const fresh = () => createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
    assert.notEqual(name, 'bulsa.db', 'never open personal database');
    const db = new DatabaseSync(path.join(folder, name)); connections.add(db);
    return {
      execAsync: async sql => { db.exec(sql); if (failMigration && sql.includes('CREATE TABLE') && sql.includes('savings_goals')) throw Error('migration interrupted'); },
      runAsync: async (sql, ...params) => {
        const result = db.prepare(sql).run(...params);
        if (failAllocation && sql.startsWith('INSERT INTO category_allocations')) throw Error('allocation interrupted');
        if (failContribution && sql.startsWith('INSERT INTO savings_contributions')) throw Error('contribution interrupted');
        return result;
      },
      getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params) ?? null,
      getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
      closeAsync: async () => { db.close(); connections.delete(db); },
      withTransactionAsync: async work => { db.exec('BEGIN'); try { await work(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } },
    };
  } } });
  const filename = 'fixture.db';
  try {
    // Independent v3 fixture includes deleted defaults, arbitrary history and custom choices.
    const legacy = new DatabaseSync(path.join(folder, filename));
    legacy.exec(`CREATE TABLE wallets(id TEXT PRIMARY KEY,name TEXT,nameKey TEXT,included INTEGER,hidden INTEGER);
      CREATE TABLE transactions(id TEXT PRIMARY KEY,type TEXT,amountCentavos INTEGER,category TEXT,date TEXT,paymentMethod TEXT,note TEXT,walletId TEXT);
      CREATE TABLE balance_changes(id TEXT PRIMARY KEY,walletId TEXT,kind TEXT,deltaCentavos INTEGER,date TEXT,reason TEXT,targetCentavos INTEGER,createdAt TEXT DEFAULT '2026-01-01 00:00:00');
      CREATE TABLE transfers(id TEXT PRIMARY KEY,fromWalletId TEXT,toWalletId TEXT,amountCentavos INTEGER,date TEXT,note TEXT,createdAt TEXT DEFAULT '2026-01-01 00:00:00');
      CREATE TABLE custom_choices(id TEXT PRIMARY KEY,name TEXT);
      CREATE TABLE monthly_limits(month TEXT PRIMARY KEY,limitCentavos INTEGER);
      INSERT INTO wallets VALUES('custom','my bank','my bank',0,1);
      INSERT INTO transactions VALUES('old','expense',901,'Old renamed choice','2026-11-01','Other','Keep',NULL);
      INSERT INTO balance_changes(id,walletId,kind,deltaCentavos,date,reason,targetCentavos) VALUES('opening','custom','opening',500,'2026-01-01','Keep',500);
      INSERT INTO transfers(id,fromWalletId,toWalletId,amountCentavos,date,note) VALUES('transfer','custom','deleted',100,'2026-01-02','Keep');
      INSERT INTO custom_choices VALUES('choice','Exact Case');
      INSERT INTO monthly_limits VALUES('2026-11',1000),('2026-10',500);
      PRAGMA user_version=3;`);
    const tables = ['wallets','transactions','balance_changes','transfers','custom_choices'];
    const snapshot = db => JSON.stringify(tables.map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
    const before = snapshot(legacy); legacy.close();
    let load = fresh(), database = load('src/storage/database.ts');
    failMigration = true;
    await assert.rejects(database.openDatabase(filename), /migration interrupted/);
    let inspect = new DatabaseSync(path.join(folder, filename));
    assert.equal(inspect.prepare('PRAGMA user_version').get().user_version, 3);
    assert.equal(inspect.prepare("SELECT name FROM sqlite_master WHERE name='category_allocations'").get(), undefined);
    assert.equal(snapshot(inspect), before); inspect.close(); failMigration = false;
    const db = await database.openDatabase(filename);
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 6);
    let categories = load('src/storage/categories.ts'), savings = load('src/storage/savings.ts');
    const budgets = load('src/storage/budgets.ts');
    assert.deepEqual(await categories.getCategoryPlan('2026-12', filename), { limitCentavos: null, allocations: [], signature: '[null,[]]' });
    const allocations = [{ category: 'Old renamed choice', limitCentavos: 300 }, { category: 'food', limitCentavos: 200 }];
    const saving = categories.saveCategoryAllocations('2026-11', allocations, filename);
    allocations[0].limitCentavos = 999; await saving;
    assert.equal((await categories.getCategoryPlan('2026-11', filename)).allocations.find(a => a.category === 'Old renamed choice').limitCentavos, 300);
    await assert.rejects(categories.saveCategoryAllocations('2026-12', [], filename), /monthly|month.*limit/i);
    for (const invalid of [[{category:'Everything Else',limitCentavos:1}], [{category:'everything else',limitCentavos:1}], [{category:'',limitCentavos:1}], [{category:'Food',limitCentavos:-1}], [{category:'Food',limitCentavos:0.1}], [{category:'Food',limitCentavos:Number.MAX_SAFE_INTEGER+1}], [{category:'Food',limitCentavos:1},{category:'Food',limitCentavos:1}], [{category:'Food',limitCentavos:1001}], [{category:'Food',limitCentavos:Number.MAX_SAFE_INTEGER},{category:'food',limitCentavos:1}]]) {
      await assert.rejects(categories.saveCategoryAllocations('2026-11', invalid, filename));
    }
    await assert.rejects(budgets.setMonthlyLimit('2026-11', 499, filename), /allocation/i);
    assert.equal(await budgets.getMonthlyLimit('2026-11', filename), 1000);
    failAllocation = true;
    await assert.rejects(categories.saveCategoryAllocations('2026-11', [{category:'New',limitCentavos:1}], filename), /allocation interrupted/);
    failAllocation = false;
    assert.equal((await categories.getCategoryPlan('2026-11', filename)).allocations.length, 2);
    await categories.saveCategoryAllocations('2026-10', [{category:'Past',limitCentavos:500}], filename);
    await categories.saveCategoryAllocations('2026-11', [], filename);
    await budgets.setMonthlyLimit('2026-11', 0, filename);
    assert.equal((await categories.getCategoryPlan('2026-10', filename)).allocations[0].category, 'Past');
    const stale = await categories.getCategoryPlan('2026-11', filename);
    await budgets.setMonthlyLimit('2026-11',1,filename);
    await assert.rejects(categories.saveCategoryAllocations('2026-11',[],filename,stale.signature),/changed/i);
    await savings.saveSavingsGoal({id:'main',title:'My Goal',targetCentavos:100}, filename);
    const contribution = {id:'one',goalId:'main',amountCentavos:150,date:'2024-02-29',note:'My casing'};
    await savings.recordSavingsContribution(contribution, filename);
    await assert.rejects(savings.recordSavingsContribution(contribution, filename));
    await savings.saveSavingsGoal({id:'main',title:'New Title',targetCentavos:50}, filename);
    assert.deepEqual((await savings.getSavings(filename)).contributions.map(row => ({ ...row })), [contribution]);
    for (const invalid of [{...contribution,id:'bad',goalId:'absent'}, {...contribution,id:'bad',date:'2026-02-29'}, {...contribution,id:'bad',amountCentavos:0}, {...contribution,id:'bad',amountCentavos:0.5}, {...contribution,id:'bad',amountCentavos:Number.MAX_SAFE_INTEGER}]) await assert.rejects(savings.recordSavingsContribution(invalid, filename));
    for (const targetCentavos of [0,-1,0.5,Number.MAX_SAFE_INTEGER+1]) await assert.rejects(savings.saveSavingsGoal({id:'main',title:'Keep',targetCentavos}, filename));
    failContribution = true;
    await assert.rejects(savings.recordSavingsContribution({...contribution,id:'interrupted'}, filename), /contribution interrupted/);
    failContribution = false;
    await savings.saveSavingsGoal({id:'second',title:'Second',targetCentavos:1}, filename);
    await savings.recordSavingsContribution({...contribution,id:'max',goalId:'second',amountCentavos:Number.MAX_SAFE_INTEGER-150}, filename);
    await assert.rejects(savings.recordSavingsContribution({...contribution,id:'overflow',amountCentavos:1}, filename), /safe|overflow|large/i);
    inspect = new DatabaseSync(path.join(folder, filename)); assert.equal(snapshot(inspect), before); inspect.close();
    const saved = JSON.stringify(await savings.getSavings(filename));
    for (const connection of connections) connection.close(); connections.clear();
    load = fresh(); savings = load('src/storage/savings.ts'); categories = load('src/storage/categories.ts');
    assert.equal(JSON.stringify(await savings.getSavings(filename)), saved);
    assert.equal((await categories.getCategoryPlan('2026-10', filename)).allocations[0].limitCentavos, 500);
    console.log('Category/savings SQLite checks passed: v3 preservation, atomic migration/retry, exact categories, allocations/lowering guards, rollback, stable goal edits, over-target contributions, duplicates/date/aggregate overflow, independent ledger and disk reopen.');
  } finally { for (const db of connections) db.close(); fs.rmSync(folder, {recursive:true,force:true}); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
