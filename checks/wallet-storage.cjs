const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bulsa-wallets-'));
  const connections = [];
  let interrupt = false;
  function fresh() {
    return createLoader({'expo-sqlite': {openDatabaseAsync: async name => {
      const db = new DatabaseSync(path.join(folder, name)); connections.push(db);
      return {
        execAsync: async sql => { db.exec(sql); if (interrupt && sql.includes('ALTER TABLE')) throw Error('migration interrupted'); },
        runAsync: async (sql,...args) => db.prepare(sql).run(...args),
        getAllAsync: async (sql,...args) => db.prepare(sql).all(...args),
        getFirstAsync: async (sql,...args) => db.prepare(sql).get(...args) ?? null,
        closeAsync: async () => { db.close(); connections.splice(connections.indexOf(db),1); },
        withTransactionAsync: async fn => { db.exec('BEGIN'); try { await fn(); db.exec('COMMIT'); } catch(e) { db.exec('ROLLBACK'); throw e; } },
      };
    }}});
  }
  try {
    const legacy = new DatabaseSync(path.join(folder,'legacy.db'));
    legacy.exec(`CREATE TABLE transactions(id TEXT PRIMARY KEY NOT NULL,type TEXT NOT NULL,amountCentavos INTEGER NOT NULL,category TEXT NOT NULL,date TEXT NOT NULL,paymentMethod TEXT NOT NULL,note TEXT); PRAGMA user_version=1;`);
    legacy.prepare('INSERT INTO transactions VALUES(?,?,?,?,?,?,?)').run('old','expense',123,'Food','2026-11-01','Cash',"O'Brien"); legacy.close();
    let load = fresh(), database=load('src/storage/database.ts');
    interrupt=true;
    await assert.rejects(database.openDatabase('legacy.db'), /interrupted/);
    const inspect=new DatabaseSync(path.join(folder,'legacy.db'));
    assert.equal(inspect.prepare('PRAGMA user_version').get().user_version,1);
    assert.equal(inspect.prepare('SELECT amountCentavos FROM transactions').get().amountCentavos,123);
    assert.equal(inspect.prepare("SELECT name FROM sqlite_master WHERE name='wallets'").get(),undefined); inspect.close();
    interrupt=false;
    await database.openDatabase('legacy.db');
    let store=load('src/storage/wallets.ts');
    assert.equal((await store.getLedger('legacy.db')).transactions[0].walletId,undefined);
    assert.equal((await store.getLedger('legacy.db')).wallets.length,5);
    const {deriveBalances}=load('src/lib/ledger.ts');
    assert.equal(deriveBalances(await store.getLedger('legacy.db')).generalCentavos,-123);
    const dbName='money.db';
    await store.setOpening('wallet-gcash',100000,dbName);
    await store.setOpening('wallet-cash',50000,dbName);
    await store.setOpening('wallet-maya',200000,dbName);
    await store.setWalletFlags('wallet-maya',{included:false},dbName);
    const balances=async()=>deriveBalances(await store.getLedger(dbName));
    assert.equal((await balances()).totalCentavos,150000);
    await store.createWallet({id:'custom',name:'My bank',openingCentavos:50000,included:false},dbName);
    await assert.rejects(store.createWallet({id:'duplicate-name',name:' my BANK ',openingCentavos:0,included:true},dbName), /already.*name/i);
    assert.equal((await balances()).totalCentavos,150000);
    for(const name of ['my BANK',' General ','','Not specified']) await assert.rejects(store.createWallet({id:'bad-'+name,name,openingCentavos:0,included:true},dbName));
    await assert.rejects(store.setOpening('wallet-gcash',0,dbName));
    await assert.rejects(store.removeWallet('wallet-gcash',dbName));
    await store.removeWallet('wallet-maribank',dbName);
    const tx=load('src/storage/transactions.ts');
    const record={id:'expense',type:'expense',amountCentavos:10000,category:'Food',date:'2026-11-08',paymentMethod:'Not specified'};
    await tx.saveTransaction(record,dbName);
    assert.equal((await balances()).totalCentavos,140000);
    await tx.updateTransaction({...record,walletId:'wallet-gcash'},dbName);
    assert.equal((await balances()).totalCentavos,140000);
    assert.equal((await balances()).generalCentavos,0);
    await tx.updateTransaction({...record,walletId:'wallet-maya'},dbName);
    assert.equal((await balances()).totalCentavos,150000);
    await store.setWalletFlags('wallet-gcash',{hidden:true},dbName);
    assert.equal((await balances()).totalCentavos,150000);
    await assert.rejects(tx.saveTransaction({...record,id:'hidden',walletId:'wallet-gcash'},dbName));
    await store.setWalletFlags('wallet-gcash',{hidden:false},dbName);
    await tx.deleteTransaction(record.id,dbName);
    const transfer={id:'transfer',fromWalletId:'wallet-gcash',toWalletId:'wallet-maya',amountCentavos:20000,date:'2026-11-08',note:''};
    await store.recordTransfer(transfer,dbName);
    assert.equal((await balances()).totalCentavos,130000);
    await assert.rejects(store.recordTransfer({...transfer,id:'same',toWalletId:'wallet-gcash'},dbName));
    await assert.rejects(store.recordTransfer({...transfer,id:'zero',amountCentavos:0},dbName));
    const competing=await Promise.allSettled(['one','two'].map(id=>store.recordTransfer({...transfer,id,amountCentavos:70000},dbName)));
    assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await store.getLedger(dbName)).transfers.length,2);
    await store.adjustWallet({id:'adjust',walletId:'wallet-cash',targetCentavos:45000,reason:'Counted cash',date:'2026-11-08'},dbName);
    assert.equal((await balances()).wallets.find(w=>w.id==='wallet-cash').balanceCentavos,45000);
    await store.adjustWallet({id:'noop',walletId:'wallet-cash',targetCentavos:45000,reason:'Already right',date:'2026-11-08'},dbName);
    assert.equal((await store.getLedger(dbName)).changes.filter(c=>c.kind==='adjustment').length,1);
    const h='history.db';
    for(const id of ['wallet-gcash','wallet-cash']) await store.setOpening(id,0,h);
    const income={...record,id:'funding',type:'income',walletId:'wallet-gcash',amountCentavos:100000};
    await tx.saveTransaction(income,h);
    await store.recordTransfer({...transfer,id:'history-transfer',toWalletId:'wallet-cash',amountCentavos:80000},h);
    await tx.updateTransaction({...income,amountCentavos:30000},h);
    assert.equal(deriveBalances(await store.getLedger(h)).wallets.find(w=>w.id==='wallet-gcash').balanceCentavos,-50000);
    assert.equal((await store.getLedger(h)).transfers[0].amountCentavos,80000);
    await assert.rejects(store.recordTransfer({...transfer,id:'blocked',toWalletId:'wallet-cash',amountCentavos:1},h));
    await store.renameWallet('wallet-gcash','Everyday',h);
    assert.equal((await store.getLedger(h)).transactions[0].walletId,'wallet-gcash');
    await assert.rejects(tx.saveTransaction({...record,id:'fk',walletId:'missing'},h));
    const before=JSON.stringify(await store.getLedger(h));
    await assert.rejects(store.createWallet({id:'overflow',name:'Overflow',openingCentavos:Number.MAX_SAFE_INTEGER,included:true},h));
    assert.equal(JSON.stringify(await store.getLedger(h)),before,'failed combined write rolls back wallet and opening');
    const hiddenHistory='hidden-history.db';
    await store.setOpening('wallet-gcash',0,hiddenHistory);
    await tx.saveTransaction({...record,walletId:'wallet-gcash'},hiddenHistory);
    await store.setWalletFlags('wallet-gcash',{hidden:true},hiddenHistory);
    await tx.updateTransaction({...record,walletId:'wallet-gcash',amountCentavos:20000},hiddenHistory);
    assert.equal(deriveBalances(await store.getLedger(hiddenHistory)).totalCentavos,-20000,'editing keeps an existing hidden assignment');
    for(const db of [...connections]) { db.close(); connections.splice(connections.indexOf(db),1); }
    load=fresh(); store=load('src/storage/wallets.ts');
    assert.equal((await store.getLedger(dbName)).wallets.some(w=>w.id==='wallet-maribank'),false,'deleted defaults do not reseed on reopen');
    assert.equal((await store.getLedger(dbName)).wallets.some(w=>w.id==='custom'),true,'custom wallet and opening persist');
    assert.equal(deriveBalances(await store.getLedger(h)).totalCentavos,30000);
    assert.equal((await store.getLedger(h)).wallets.find(w=>w.id==='wallet-gcash').name,'Everyday');
    assert.equal((await store.getLedger(h)).wallets.length,5,'defaults seed once');
    console.log('Wallet SQLite checks passed: v1 preservation/rollback/retry, openings, inclusion, hiding, safe delete, reassignment, concurrent transfers, adjustments, negative historical edits, overflow rollback and reopen.');
  } finally {
    for(const db of connections) db.close();
    fs.rmSync(folder,{recursive:true,force:true});
  }
}
main().catch(e=>{ console.error(e); process.exitCode=1; });
