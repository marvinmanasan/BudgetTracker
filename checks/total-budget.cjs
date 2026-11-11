const assert=require('node:assert/strict');
const {createLoader}=require('./load-typescript.cjs');
const {totalBudgetPreview}=createLoader()('src/lib/total-budget.ts');
const data={wallets:[{id:'a',name:'GCash',included:true,hidden:true},{id:'b',name:'Maya',included:false,hidden:false}],transactions:[],transfers:[],changes:[{id:'a0',walletId:'a',kind:'opening',deltaCentavos:100000,date:'2026-11-01',reason:'',targetCentavos:null},{id:'b0',walletId:'b',kind:'opening',deltaCentavos:50000,date:'2026-11-01',reason:'',targetCentavos:null}]};
const copy=JSON.stringify(data);
const p=totalBudgetPreview(data,'a',150000);
assert.equal(p.deltaCentavos,50000);assert.equal(p.walletTargetCentavos,150000);assert.equal(p.after.totalCentavos,150000);assert.equal(p.after.generalCentavos,0);assert.equal(p.after.wallets.find(w=>w.id==='b').balanceCentavos,50000);
assert.equal(totalBudgetPreview(data,'a',0).walletTargetCentavos,0);
assert.equal(totalBudgetPreview(data,'a',-100).after.totalCentavos,-100);
assert.equal(totalBudgetPreview(data,'a',100000).deltaCentavos,0);
assert.throws(()=>totalBudgetPreview(data,'b',150000),/included/i);
assert.throws(()=>totalBudgetPreview(data,'missing',0));
assert.equal(JSON.stringify(data),copy);
console.log('Total Budget preview checks passed: included/hidden wallet, zero/negative, no-change, unchanged other money.');

const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
(async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'bulsa-total-edit-'));const connections=[];let interrupt=false;
 const load=createLoader({'expo-sqlite':{openDatabaseAsync:async name=>{
  const db=new DatabaseSync(path.join(folder,name));connections.push(db);
  return {execAsync:async sql=>db.exec(sql),getAllAsync:async(sql,...args)=>db.prepare(sql).all(...args),getFirstAsync:async(sql,...args)=>db.prepare(sql).get(...args),runAsync:async(sql,...args)=>{const r=db.prepare(sql).run(...args);if(interrupt&&sql.includes('INSERT INTO balance_changes'))throw Error('write interrupted');return r;},closeAsync:async()=>db.close(),withTransactionAsync:async work=>{db.exec('BEGIN');try{await work();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};
 }}});
 try{
  const wallets=load('src/storage/wallets.ts');const store=load('src/storage/total-budget.ts');const preview=load('src/lib/total-budget.ts').totalBudgetPreview;
  const name='total-test.db'; await wallets.setOpening('wallet-gcash',100000,name);await wallets.setWalletFlags('wallet-gcash',{hidden:true},name);
  let ledger=await wallets.getLedger(name);let p=preview(ledger,'wallet-gcash',150000);
  const input={id:'manual-total',walletId:'wallet-gcash',targetCentavos:150000,reason:'Correct amount',date:'2026-11-01'};
  await store.setTotalBudget(input,p.signature,name);
  let current=await wallets.getLedger(name);assert.equal(load('src/lib/ledger.ts').deriveBalances(current).totalCentavos,150000);assert.equal(current.transactions.length,0);assert.equal(current.changes.filter(c=>c.kind==='adjustment').length,1);
  await assert.rejects(store.setTotalBudget({...input,id:'stale'},p.signature,name),/changed/i);
  ledger=await wallets.getLedger(name);p=preview(ledger,'wallet-gcash',150000);await store.setTotalBudget({...input,id:'noop'},p.signature,name);assert.equal((await wallets.getLedger(name)).changes.length,2);
  p=preview(ledger,'wallet-gcash',0);interrupt=true;await assert.rejects(store.setTotalBudget({...input,id:'interrupted',targetCentavos:0},p.signature,name));interrupt=false;assert.equal(JSON.stringify(await wallets.getLedger(name)),JSON.stringify(ledger));
  await wallets.setWalletFlags('wallet-gcash',{included:false},name);await assert.rejects(store.setTotalBudget({...input,id:'changed-inclusion'},p.signature,name),/changed/i);
  console.log('Total Budget SQLite checks passed: hidden included correction, stale guard, no-change and atomic rollback.');
 }finally{for(const db of connections)db.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
