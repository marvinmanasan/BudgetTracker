const assert=require('node:assert/strict');const {createLoader}=require('./load-typescript.cjs');
const load=createLoader();const preview=load('src/lib/selected-deletion.ts').previewSelectedDeletion;
assert.equal(typeof preview,'function','Explicit-ID deletion preview must exist');
const data={wallets:[{id:'cash',name:'Cash',included:true,hidden:false}],changes:[{id:'opening',walletId:'cash',kind:'opening',deltaCentavos:10000,date:'2026-11-01',reason:'Opening',targetCentavos:null}],transfers:[],transactions:[{id:'a',type:'expense',amountCentavos:100,category:'Food',date:'2026-11-01',paymentMethod:'Cash',walletId:'cash'},{id:'b',type:'income',amountCentavos:500,category:'Pay',date:'2026-11-02',paymentMethod:'Cash'},{id:'c',type:'expense',amountCentavos:20,category:'Food',date:'2026-11-03',paymentMethod:'Cash'}]};
const original=JSON.stringify(data);const p=preview(data,['a','b']);assert.equal(p.before.totalCentavos,10380);assert.equal(p.after.totalCentavos,9980);assert.deepEqual(p.ids,['a','b']);assert.deepEqual(p.walletIds,['cash']);assert.equal(JSON.stringify(data),original);
assert.equal(p.signature,preview({...data,transactions:[...data.transactions].reverse()},['b','a']).signature,'Input order does not change approval');
assert.notEqual(p.signature,preview({...data,wallets:[{...data.wallets[0],included:false}]},['a','b']).signature,'Inclusion changes invalidate approval');
assert.notEqual(p.signature,preview({...data,transactions:data.transactions.map(t=>t.id==='c'?{...t,note:'changed'}:t)},['a','b']).signature,'Unselected record changes invalidate balance approval');
for(const ids of [[],['a','a'],['opening'],['missing']])assert.throws(()=>preview(data,ids));
console.log('Selected deletion preview passed: exact IDs, canonical stale approval, no mutation, balance effects and invalid IDs.');
const {DatabaseSync}=require('node:sqlite'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
async function storageChecks(){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'bulsa-selected-'));const connections=[];let deletes=0,failSecond=false;
 const load=createLoader({'expo-sqlite':{openDatabaseAsync:async name=>{
  assert(name.startsWith('test-'),'Never touch user database');const db=new DatabaseSync(path.join(folder,name));connections.push(db);
  return {execAsync:async sql=>db.exec(sql),getFirstAsync:async(sql,...args)=>db.prepare(sql).get(...args)??null,getAllAsync:async(sql,...args)=>db.prepare(sql).all(...args),runAsync:async(sql,...args)=>{if(sql.startsWith('DELETE FROM transactions')){deletes++;if(failSecond&&deletes===2)throw Error('injected second batch failure');}return db.prepare(sql).run(...args)},withTransactionAsync:async work=>{db.exec('BEGIN');try{await work();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}},closeAsync:async()=>{}};
 }}});
 try{
 const db=await load('src/storage/database.ts').openDatabase('test-selection.db');
 for(let i=0;i<205;i++)await db.runAsync('INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod) VALUES(?,?,?,?,?,?)','record-'+i,'expense',1,'Food','2026-11-12','Cash');
 const read=()=>load('src/storage/wallets.ts').getLedger('test-selection.db');const preview=load('src/lib/selected-deletion.ts').previewSelectedDeletion;const remove=load('src/storage/selected-deletion.ts').deleteSelectedTransactions;
 const ids=(await read()).transactions.map(t=>t.id);let approved=preview(await read(),ids);
 await db.runAsync('UPDATE transactions SET note=? WHERE id=?','changed','record-204');await assert.rejects(()=>remove(ids,approved.signature,'test-selection.db'),/changed/i);assert.equal((await read()).transactions.length,205);
 approved=preview(await read(),ids);deletes=0;failSecond=true;await assert.rejects(()=>remove(ids,approved.signature,'test-selection.db'),/injected/);assert.equal((await read()).transactions.length,205,'Failed second batch rolls back first batch');
 failSecond=false;deletes=0;await remove(ids,approved.signature,'test-selection.db');assert.equal((await read()).transactions.length,0);await assert.rejects(()=>remove(ids,approved.signature,'test-selection.db'),/changed/);
 console.log('Selected deletion SQLite passed: full-ledger stale guard, 200-ID batches, partial-write rollback, exact deletion and duplicate protection.');
 }finally{for(const db of connections)db.close();fs.rmSync(folder,{recursive:true,force:true})}
}
storageChecks().catch(e=>{console.error(e);process.exitCode=1});
