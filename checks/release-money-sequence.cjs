const assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createLoader}=require('./load-typescript.cjs');
async function main(){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'bulsa-acceptance-')),connections=[];
 function fresh(){return createLoader({'expo-sqlite':{openDatabaseAsync:async name=>{
  assert(name.startsWith('qa-'));
  const db=new DatabaseSync(path.join(folder,name));connections.push(db);
  return {execAsync:async sql=>db.exec(sql),getAllAsync:async(sql,...p)=>db.prepare(sql).all(...p),
   getFirstAsync:async(sql,...p)=>db.prepare(sql).get(...p),runAsync:async(sql,...p)=>db.prepare(sql).run(...p),
   closeAsync:async()=>db.close(),withTransactionAsync:async work=>{db.exec('BEGIN');try{await work();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};
 }}});}
 let load=fresh();const name='qa-acceptance.db',date='2026-11-14';
 const w=load('src/storage/wallets.ts'),tx=load('src/storage/transactions.ts'),budgets=load('src/storage/budgets.ts'),
 cats=load('src/storage/categories.ts'),savings=load('src/storage/savings.ts'),backups=load('src/storage/backup.ts');
 const {deriveBalances,monthlyTotals}=load('src/lib/ledger.ts'),{transferPreview}=load('src/lib/transfers.ts');
 const {spendingLimitStatus}=load('src/lib/money.ts');
 assert.equal(spendingLimitStatus(5025),'₱50.25 Left to Spend');
 assert.equal(spendingLimitStatus(0),'At Your Limit');
 assert.equal(spendingLimitStatus(-5025),'₱50.25 Over Limit');
 async function expect(label,g,c,total){
  const data=await w.getLedger(name),b=deriveBalances(data);
  const actual=[b.wallets.find(x=>x.id==='wallet-gcash').balanceCentavos,b.wallets.find(x=>x.id==='wallet-cash').balanceCentavos,b.totalCentavos];
  assert.deepEqual(actual,[g,c,total]);console.log(label,actual);
 }
 try{
  await w.setOpening('wallet-gcash',100000,name);await w.setOpening('wallet-cash',0,name);await expect('Opening',100000,0,100000);
  const expense={id:'expense',type:'expense',amountCentavos:15025,category:'Food',walletId:'wallet-gcash',date,paymentMethod:'Not specified'};
  await tx.saveTransaction(expense,name);await expect('Expense',84975,0,84975);
  await tx.saveTransaction({id:'income',type:'income',amountCentavos:20050,category:'Salary',walletId:'wallet-cash',date,paymentMethod:'Not specified'},name);
  await expect('Income',84975,20050,105025);


  async function transfer(id,amount){
   const record={id,fromWalletId:'wallet-gcash',toWalletId:'wallet-cash',amountCentavos:amount,date,note:''};
   const preview=transferPreview(await w.getLedger(name),record);await w.recordTransfer(record,name,preview.signature);
  }
  await transfer('transfer1',10025);await expect('Transfer',74950,30075,105025);
  await w.setWalletFlags('wallet-gcash',{included:false},name);await expect('Exclude',74950,30075,30075);
  await transfer('transfer2',5000);await expect('Boundary transfer',69950,35075,35075);
  await w.adjustWallet({id:'adjust',walletId:'wallet-gcash',targetCentavos:70000,date,reason:'QA'},name);await expect('Adjustment',70000,35075,35075);
  assert.deepEqual(monthlyTotals(await w.getLedger(name),'2026-11'),{incomeCentavos:20050,expenseCentavos:15025});
  await w.createWallet({id:'travel',name:'Travel',openingCentavos:2500,included:true},name);await expect('Travel',70000,35075,37575);
  await budgets.setMonthlyLimit('2026-11',10000,name);
  assert.equal(spendingLimitStatus(10000-monthlyTotals(await w.getLedger(name),'2026-11').expenseCentavos),'₱50.25 Over Limit');
  await savings.saveSavingsGoal({id:'goal',title:'Trip',targetCentavos:50000},name);
  await savings.recordSavingsContribution({id:'saving',goalId:'goal',amountCentavos:2000,date,note:''},name);
  await expect('Savings',70000,35075,37575);
  let plan=await cats.getCategoryPlan('2026-11',name);
  await cats.saveCategoryAllocations('2026-11',[{category:'Food',limitCentavos:6000}],name,plan.signature);
  plan=await cats.getCategoryPlan('2026-11',name);
  assert.equal(10000-plan.allocations[0].limitCentavos,4000);
  await cats.saveCategoryAllocations('2026-11',[{category:'Food',limitCentavos:7000}],name,plan.signature);
  plan=await cats.getCategoryPlan('2026-11',name);
  await assert.rejects(cats.saveCategoryAllocations('2026-11',[...plan.allocations,{category:'Travel',limitCentavos:3100}],name,plan.signature),/exceed/);
  assert.equal((await cats.getCategoryPlan('2026-11',name)).signature,plan.signature);
  const before=await w.getLedger(name);
  await tx.updateTransaction({...expense,amountCentavos:10000},name,expense);
  await tx.deleteTransaction(expense.id,name);await tx.restoreTransaction(expense,name);
  assert.deepEqual((await w.getLedger(name)).transactions,before.transactions);
  const backup=await backups.createFinancialBackup(name),signature=backups.financialSignature(backup);
  const clean='qa-restored.db',empty=await backups.createFinancialBackup(clean);
  await backups.restoreFinancialBackup(backup,backups.financialSignature(empty),()=>true,clean);
  assert.equal(backups.financialSignature(await backups.createFinancialBackup(clean)),signature);
  for(const db of connections)db.close();connections.length=0;
  load=fresh();assert.deepEqual(await load('src/storage/wallets.ts').getLedger(name),before);
  console.log('PASS exact money sequence, category rollback, edit/delete/restore, clean database restore and persistence after reopen.');
 }finally{for(const db of connections)db.close();fs.rmSync(folder,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
