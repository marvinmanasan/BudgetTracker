const assert = require('node:assert/strict');
const { createLoader } = require('./load-typescript.cjs');
const load = createLoader();
const { deriveBalances, monthlyTotals } = load('src/lib/ledger.ts');
const { parseBalance } = load('src/lib/form-money.ts');
for (const [text,expected] of [['0',0],['-0.00',0],['-1.25',-125],['1.01',101],['',null],['1.234',null],['-1e3',null],['Infinity',null],['90071992547409.92',null],['-90071992547409.91',-Number.MAX_SAFE_INTEGER]]) assert.equal(parseBalance(text),expected);
const wallets = ['GCash', 'Cash', 'Maya'].map(name => ({ id: name, name, included: name !== 'Maya', hidden: false }));
const snapshot = () => ({ wallets, transactions: [], transfers: [], changes: [
  { id: 'a', walletId: 'GCash', kind: 'opening', deltaCentavos: 100000 },
  { id: 'b', walletId: 'Cash', kind: 'opening', deltaCentavos: 50000 },
  { id: 'c', walletId: 'Maya', kind: 'opening', deltaCentavos: 200000 },
] });
let data = snapshot();
assert.equal(deriveBalances(data).totalCentavos, 150000);
const monthData = { ...data, transactions: [{walletId:'Maya',type:'expense',amountCentavos:10000,date:'2026-11-08'},{walletId:null,type:'income',amountCentavos:20000,date:'2026-10-08'}] };
const { monthlyTotalsByMonth } = load('src/lib/ledger.ts');
assert.equal(monthlyTotalsByMonth(monthData).get('2026-11').expenseCentavos,10000);
assert.equal(monthlyTotalsByMonth(monthData).get('2026-10').incomeCentavos,20000);
assert.throws(() => monthlyTotalsByMonth({...monthData,transactions:[{type:'income',amountCentavos:Number.MAX_SAFE_INTEGER,date:'2026-11-01'},{type:'income',amountCentavos:1,date:'2026-11-02'}]}),/range|large|safe/i);
assert.equal(monthlyTotals(monthData,'2026-11').expenseCentavos,10000,'excluded wallet spending still counts');
assert.equal(monthlyTotals(monthData,'2026-11').incomeCentavos,0);
data.transactions.push({ walletId: null, type: 'expense', amountCentavos: 10000 });
assert.equal(deriveBalances(data).generalCentavos, -10000);
assert.equal(deriveBalances(data).totalCentavos, 140000);
data.transactions[0].walletId = 'GCash';
assert.equal(deriveBalances(data).totalCentavos, 140000);
assert.equal(deriveBalances(data).generalCentavos, 0);
data.transactions[0].walletId = 'Maya';
assert.equal(deriveBalances(data).totalCentavos, 150000);
data = snapshot(); data.transfers.push({ fromWalletId: 'GCash', toWalletId: 'Cash', amountCentavos: 20000 });
assert.equal(deriveBalances(data).totalCentavos, 150000);
assert.equal(deriveBalances(data).wallets.find(w => w.id === 'Cash').balanceCentavos, 70000);
data.transfers[0].toWalletId = 'Maya';
assert.equal(deriveBalances(data).totalCentavos, 130000);
data = { wallets: wallets.slice(0,2), changes: [], transfers: [{fromWalletId:'GCash',toWalletId:'Cash',amountCentavos:80000}], transactions:[{walletId:'GCash',type:'income',amountCentavos:30000}] };
assert.equal(deriveBalances(data).wallets[0].balanceCentavos, -50000);
assert.equal(deriveBalances(data).totalCentavos, 30000);
data.wallets = data.wallets.map(w => ({...w, hidden:true}));
assert.equal(deriveBalances(data).totalCentavos, 30000, 'hiding does not exclude');
data = snapshot(); data.changes.push({walletId:'Cash',kind:'adjustment',deltaCentavos:5000});
data.transactions.push({walletId:'Cash',type:'expense',amountCentavos:15000});
assert.equal(deriveBalances(data).wallets[1].balanceCentavos, 40000);
data.changes[0].deltaCentavos = Number.MAX_SAFE_INTEGER;
assert.throws(() => deriveBalances(data), /range|large|safe/i);
console.log('Ledger checks passed: General, inclusion, transfers, historical corrections, fixed adjustments and overflow.');
