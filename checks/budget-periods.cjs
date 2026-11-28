const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-periods-'));
  const connections = new Set();
  let failMigration = false, failWrite = false;
  function fresh() {
    return createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
      assert(name.startsWith('test-'), 'Use only fictional databases');
      const db = new DatabaseSync(path.join(folder, name));
      connections.add(db);
      return {
        execAsync: async sql => { db.exec(sql); if (failMigration && sql.includes('CREATE TABLE budget_periods')) throw Error('injected migration failure'); },
        runAsync: async (sql, ...params) => { const result = db.prepare(sql).run(...params); if (failWrite && sql.startsWith('INSERT INTO budget_periods')) throw Error('injected write failure'); return result; },
        getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params) ?? null,
        getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
        closeAsync: async () => { db.close(); connections.delete(db); },
        withTransactionAsync: async work => { db.exec('BEGIN'); try { await work(); db.exec('COMMIT'); } catch(error) { db.exec('ROLLBACK'); throw error; } },
      };
    } } });
  }
  function close() { for (const db of connections) db.close(); connections.clear(); }
  try {
    const name = 'test-periods.db';
    let load = fresh();
    let database = load('src/storage/database.ts');
    const db = await database.openDatabase(name);
    await db.runAsync("INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod,note) VALUES('old','expense',123,'Food','2026-11-10','Cash','Keep')");
    await db.runAsync("INSERT INTO savings_goals(id,title,targetCentavos) VALUES('main','Trip',300000)");
    await db.execAsync('DROP TABLE budget_periods; ALTER TABLE savings_goals DROP COLUMN deadline; PRAGMA user_version=6;');
    close();
    failMigration = true;
    load = fresh(); database = load('src/storage/database.ts');
    await assert.rejects(database.openDatabase(name), /injected migration failure/);
    let raw = new DatabaseSync(path.join(folder,name));
    assert.equal(raw.prepare('PRAGMA user_version').get().user_version,6);
    assert.equal(raw.prepare("SELECT name FROM sqlite_master WHERE name='budget_periods'").get(),undefined);
    assert.equal(raw.prepare("SELECT note FROM transactions WHERE id='old'").get().note,'Keep');
    raw.close();
    failMigration = false;
    await database.openDatabase(name);
    let storage = load('src/storage/budget-periods.ts');
    const lib = load('src/lib/budget-periods.ts');
    const period = {id:'payday',title:'Payday',startDate:'2026-11-16',endDate:'2026-11-30',limitCentavos:300000};
    const titleName='test-plan-titles.db';
    await assert.rejects(storage.saveBudgetPeriod({...period,title:'a'.repeat(81)},undefined,titleName),/80 characters/);
    await storage.saveBudgetPeriod({...period,title:'a'.repeat(80)},undefined,titleName);
    const titleDb=await database.openDatabase(titleName);
    await titleDb.runAsync('UPDATE budget_periods SET title=? WHERE id=?','Legacy '.repeat(15),period.id);
    const legacyTitle=(await storage.getBudgetPeriods(titleName))[0];
    assert.equal(legacyTitle.title,'Legacy '.repeat(15),'Reading does not truncate legacy titles');
    await storage.saveBudgetPeriod({...legacyTitle,limitCentavos:100},legacyTitle,titleName);
    const refreshedTitle=(await storage.getBudgetPeriods(titleName))[0];
    await assert.rejects(storage.saveBudgetPeriod({...refreshedTitle,title:'b'.repeat(81)},refreshedTitle,titleName),/80 characters/);
    await storage.saveBudgetPeriod({...refreshedTitle,title:'旅行 💰'},refreshedTitle,titleName);
    const ledger = {wallets:[],changes:[],transfers:[{amountCentavos:100}],transactions:[
      {type:'expense',date:'2026-11-16',amountCentavos:25000},
      {type:'expense',date:'2026-11-30',amountCentavos:60000},
      {type:'expense',date:'2026-11-15',amountCentavos:1},
      {type:'expense',date:'2026-12-01',amountCentavos:1},
      {type:'income',date:'2026-11-16',amountCentavos:1000},
    ]};
    assert.equal(lib.periodSpending(ledger,period),85000);
    assert.equal(lib.activeBudgetPeriod([period],'2026-11-16').id,'payday');
    assert.equal(lib.activeBudgetPeriod([period],'2026-11-30').id,'payday');
    assert.equal(lib.activeBudgetPeriod([period],'2026-12-01'),undefined);
    for (const invalid of [{...period,startDate:'2026-02-29'}, {...period,endDate:'2026-11-15'}, {...period,limitCentavos:-1}, {...period,limitCentavos:0.1}]) await assert.rejects(storage.saveBudgetPeriod(invalid,undefined,name));
    await storage.saveBudgetPeriod(period,undefined,name);
    await storage.saveBudgetPeriod({...period},undefined,name);
    assert.equal((await storage.getBudgetPeriods(name)).length,1,'Retry creates one row');
    await assert.rejects(storage.saveBudgetPeriod({...period,id:'overlap',startDate:'2026-11-30',endDate:'2026-12-01'},undefined,name),/overlap/);
    const edited={...period,title:'Payday updated'};
    await storage.saveBudgetPeriod(edited,period,name);
    await assert.rejects(storage.saveBudgetPeriod({...edited,limitCentavos:1},period,name),/changed/);
    failWrite=true;
    await assert.rejects(storage.saveBudgetPeriod({...edited,title:'Fail'},edited,name),/injected write/);
    failWrite=false;
    assert.equal((await storage.getBudgetPeriods(name))[0].title,'Payday updated');
    const concurrent=await Promise.allSettled([
      storage.saveBudgetPeriod({...period,id:'first',startDate:'2027-01-01',endDate:'2027-01-31'},undefined,name),
      storage.saveBudgetPeriod({...period,id:'second',startDate:'2027-01-15',endDate:'2027-02-15'},undefined,name),
    ]);
    assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1,'Queued overlap checks serialize saves');
    const crossYear={...period,startDate:'2026-12-31',endDate:'2027-01-01'};
    assert.equal(lib.periodSpending({...ledger,transactions:[{type:'expense',date:'2026-12-31',amountCentavos:1},{type:'expense',date:'2027-01-01',amountCentavos:2}]},crossYear),3);
    assert.throws(()=>lib.periodSpending({...ledger,transactions:[{type:'expense',date:'2026-11-20',amountCentavos:Number.MAX_SAFE_INTEGER},{type:'expense',date:'2026-11-20',amountCentavos:1}]},period),/range/);
    let savings=load('src/storage/savings.ts');
    const goal={id:'main',title:'Trip',targetCentavos:300000};
    await savings.saveSavingsGoal({...goal,deadline:'2027-02-28'},name);
    await savings.saveSavingsGoal({...goal,title:'Edited title'},name);
    assert.equal((await savings.getSavings(name)).goals[0].deadline,'2027-02-28','Old callers preserve deadline');
    await assert.rejects(savings.saveSavingsGoal({...goal,deadline:'2027-02-29'},name));
    const backup=load('src/storage/backup.ts'), validation=load('src/lib/backup.ts');
    const saved=await backup.createFinancialBackup(name);
    assert.equal(saved.version,2);
    assert.equal(saved.tables.budget_periods.length,2);
    assert.equal(saved.tables.savings_goals[0].deadline,'2027-02-28');
    const legacy=JSON.parse(JSON.stringify(saved));
    legacy.version=1; delete legacy.tables.budget_periods;
    for (const row of legacy.tables.savings_goals) delete row.deadline;
    const normalized=validation.validateBackup(legacy);
    assert.equal(normalized.version,2);
    assert.deepEqual(normalized.tables.budget_periods,[]);
    assert.equal(normalized.tables.savings_goals[0].deadline,null);
    const bad=JSON.parse(JSON.stringify(saved));
    bad.tables.budget_periods.push({...bad.tables.budget_periods[0],id:'bad'});
    assert.throws(()=>validation.validateBackup(bad),/backup/);
    const signature=backup.financialSignature(saved);
    const replacement=JSON.parse(JSON.stringify(saved));
    replacement.tables.budget_periods[0].title='Replacement plan';
    replacement.tables.savings_goals[0].deadline='2027-03-01';
    failWrite=true;
    await assert.rejects(backup.restoreFinancialBackup(replacement,signature,()=>true,name),/injected write/);
    failWrite=false;
    assert.equal(backup.financialSignature(await backup.createFinancialBackup(name)),signature,'Failed restore preserves populated plans and the original savings deadline');
    await backup.restoreFinancialBackup(saved,signature,()=>true,name);
    assert.equal(backup.financialSignature(await backup.createFinancialBackup(name)),signature,'Custom dates and deadlines survive exact restore');
    await savings.saveSavingsGoal({...goal,deadline:null},name);
    assert.equal((await savings.getSavings(name)).goals[0].deadline,undefined);
    const leapPlan={...period,id:'leap-zero',startDate:'2028-02-29',endDate:'2028-02-29',limitCentavos:0};
    const boundaryName='test-period-boundaries.db';
    await storage.saveBudgetPeriod(leapPlan,undefined,boundaryName);
    assert.deepEqual((await storage.getBudgetPeriods(boundaryName)).map(row=>({...row})),[leapPlan],'Same-day leap-date zero-limit plan survives storage');
    assert.equal(lib.periodSpending({...ledger,transactions:[{type:'expense',date:'2028-02-29',amountCentavos:1}]},leapPlan),1);
    close(); load=fresh(); storage=load('src/storage/budget-periods.ts');
    assert.equal((await storage.getBudgetPeriods(name)).length,2,'Periods persist across reopened connections');
    const reopenedBackup=load('src/storage/backup.ts');
    const beforeDelete=(await reopenedBackup.createFinancialBackup(name)).tables;
    await assert.rejects(storage.deleteBudgetPeriod(period,name),/changed/);
    await storage.deleteBudgetPeriod(edited,name);
    const afterDelete=(await reopenedBackup.createFinancialBackup(name)).tables;
    assert.deepEqual(afterDelete,{...beforeDelete,budget_periods:beforeDelete.budget_periods.filter(row=>row.id!==edited.id)});
    await assert.rejects(storage.deleteBudgetPeriod(edited,name),/already deleted/);
    console.log('Timeline SQLite checks passed: schema6 rollback/retry/preservation, inclusive and cross-year dates, exact money, overlap serialization, stable retry, stale edits, write rollback, savings deadline preservation/removal, v1 normalization, v2 roundtrip, populated restore rollback, leap-day zero limit and reopen.');
  } finally {
    close(); fs.rmSync(folder,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
