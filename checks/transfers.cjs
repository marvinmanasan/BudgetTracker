const assert=require('node:assert/strict');const {createLoader}=require('./load-typescript.cjs');const {transferPreview}=createLoader()('src/lib/transfers.ts');
const data={wallets:[{id:'a',name:'Cash',included:true,hidden:false},{id:'b',name:'Maya',included:false,hidden:false}],transactions:[],transfers:[],changes:['a','b'].map(id=>({id:'o'+id,walletId:id,kind:'opening',deltaCentavos:100000,date:'2026-11-01',reason:'',targetCentavos:null}))};
const record={id:'move',fromWalletId:'a',toWalletId:'b',amountCentavos:20000,date:'2026-11-01',note:''};
const original=JSON.stringify(data);const p=transferPreview(data,record);assert.equal(p.after.totalCentavos,80000);assert.equal(p.after.wallets[0].balanceCentavos,80000);assert.equal(p.after.wallets[1].balanceCentavos,120000);assert.equal(JSON.stringify(data),original);
for(const bad of [{...record,toWalletId:'a'},{...record,amountCentavos:0},{...record,amountCentavos:100001},{...record,fromWalletId:'General'}])assert.throws(()=>transferPreview(data,bad));
assert.throws(()=>transferPreview({...data,wallets:data.wallets.map(w=>({...w,hidden:true}))},record));
console.log('Transfer preview checks passed: exclusions, validation and unchanged ledger.');
