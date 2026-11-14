const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs').createLoader();
const { expenseWalletChoices, expenseAvailable } = load('src/lib/expense-wallets.ts');
const wallets = [
 {id:'bank',name:'Bank',configured:true,hidden:false,balanceCentavos:1000},
 {id:'cash',name:'Cash',configured:true,hidden:false,balanceCentavos:500},
 {id:'empty',name:'Empty',configured:true,hidden:false,balanceCentavos:0},
 {id:'hidden',name:'Hidden',configured:true,hidden:true,balanceCentavos:1000},
];
assert.deepEqual(expenseWalletChoices(wallets).map(w=>w.id),['bank','cash']);
assert.equal(expenseAvailable(wallets[0],{type:'expense',walletId:'bank',amountCentavos:200}),1200);
assert.equal(expenseAvailable(wallets[0],{type:'income',walletId:'bank',amountCentavos:200}),800);
assert.equal(expenseAvailable(wallets[0],{type:'expense',walletId:'cash',amountCentavos:200}),1000);
assert.equal(expenseAvailable({...wallets[0],balanceCentavos:Number.MAX_SAFE_INTEGER},{type:'expense',walletId:'bank',amountCentavos:1}),Number.MAX_SAFE_INTEGER);
const {monthName, shiftMonth} = load('src/lib/display-date.ts');
assert.equal(monthName('2026-11'),'November 2026');
assert.equal(shiftMonth('2026-12',1),'2027-01');
assert.equal(shiftMonth('2026-01',-1),'2025-12');
assert.equal(shiftMonth('0001-01',-1),'0001-01');
assert.equal(shiftMonth('9999-12',1),'9999-12');
console.log('Mobile feedback logic passed: funded-wallet choices, edit funds and month navigation.');
