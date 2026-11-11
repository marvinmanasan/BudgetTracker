const assert = require('node:assert/strict');
const { createLoader } = require('./load-typescript.cjs');
const { activitySections } = createLoader()('src/lib/activity.ts');
const ledger = {
  wallets: [{ id: 'cash', name: 'Cash', included: true, hidden: true }],
  transactions: [
    { id: 'same', type: 'expense', category: 'Old category', date: '2026-12-31', amountCentavos: 125, walletId: null, paymentMethod: 'Cash', note: 'Keep me' },
    { id: 'income', type: 'income', category: 'Salary', date: '2027-01-01', amountCentavos: 500, walletId: 'cash', paymentMethod: 'Not specified' },
  ],
  transfers: [{ id: 'same', fromWalletId: 'cash', toWalletId: 'missing', date: '2027-01-01', amountCentavos: 200, note: '' }],
  changes: [
    { id: 'zero', kind: 'opening', walletId: 'cash', date: '2026-12-31', deltaCentavos: 0, reason: '', targetCentavos: null },
    { id: 'adjust', kind: 'adjustment', walletId: 'cash', date: '2027-01-01', deltaCentavos: -50, reason: 'Recounted', targetCentavos: 0 },
  ],
};
const original = JSON.stringify(ledger);
const sections = activitySections(ledger);
assert.deepEqual(sections.map(s => s.date), ['2027-01-01', '2026-12-31']);
const rows = sections.flatMap(s => s.data);
assert.equal(new Set(rows.map(r => r.key)).size, 5);
const expense = rows.find(r => r.key === 'transaction-same');
assert.equal(expense.amount, -125);
assert.match(expense.detail, /General/);
assert.equal(expense.title, 'Old category');
assert(expense.fields.some(f => f.value === 'Keep me'));
assert.equal(rows.find(r => r.type === 'income').amount, 500);
assert.match(rows.find(r => r.type === 'transfer').detail, /Cash → Unknown Wallet/);
assert(rows.find(r => r.type === 'adjustment').fields.some(f => f.label === 'Recorded Target' && f.value === '₱0.00'));
assert.equal(rows.find(r => r.type === 'opening').amount, 0);
assert.equal(activitySections(ledger, 'cash').flatMap(s => s.data).length, 4);
assert.equal(activitySections(ledger, 'missing').flatMap(s => s.data).length, 1);
assert.deepEqual(activitySections(ledger, 'unused'), []);
assert.deepEqual(activitySections({ wallets: [], transactions: [], changes: [], transfers: [] }), []);
assert.equal(JSON.stringify(ledger), original);
console.log('Activity checks passed: ISO grouping, stable keys, wallet filters, details and unchanged ledger.');

const { spendingSummary } = createLoader()('src/lib/activity.ts');
assert.deepEqual(spendingSummary(ledger,'2026-12'),{expenseCentavos:125,count:1});
assert.deepEqual(spendingSummary(ledger,'2027-01'),{expenseCentavos:0,count:0});
assert.equal(spendingSummary(ledger,'2026-12').expenseCentavos,125,'wallet inclusion/visibility never hides monthly spending');

const { activityRecord } = createLoader()('src/lib/activity.ts');
for (const row of rows) assert.deepEqual(activityRecord(ledger,row.key),row);
assert.equal(activityRecord(ledger,'missing-key'),undefined);
let formattedRecords=0;
const large={wallets:[],transfers:[],changes:[],transactions:Array.from({length:1000},(_,i)=>({id:String(i),type:'expense',amountCentavos:100,date:'2026-11-01',paymentMethod:'Cash',get category(){formattedRecords++;return 'Food';}}))};
assert.equal(activityRecord(large,'transaction-999').key,'transaction-999');
assert.equal(formattedRecords,1,'detail lookup formats one record, not the entire ledger');

formattedRecords=0;
activitySections(large).flatMap(section=>section.data).find(row=>row.key==='transaction-999');
assert.equal(formattedRecords,1000,'old whole-feed path formats every record');
console.log('Detail formatting work: old path 1000 records; targeted path 1 record.');
