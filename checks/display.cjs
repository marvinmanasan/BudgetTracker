const assert = require('node:assert/strict');
const { createLoader } = require('./load-typescript.cjs');
const load = createLoader();
const { displayDate, parseDisplayDate, displayMonth } = load('src/lib/display-date.ts');
for (const [stored, shown] of [['2026-11-11','11-11-2026'], ['2024-02-29','02-29-2024'], ['0001-01-01','01-01-0001'], ['2026-12-31','12-31-2026']]) {
  assert.equal(displayDate(stored), shown);
  assert.equal(parseDisplayDate(shown), stored);
}
for (const bad of ['13-45-2026','02-29-2026','04-31-2026','00-01-2026','11-00-2026','11-11-0000']) {
  assert.throws(() => parseDisplayDate(bad), /date doesn’t exist/i);
}
for (const bad of ['2026-11-11','1-2-2026','11-11-2026x']) {
  assert.throws(() => parseDisplayDate(bad), /valid date.*MM-DD-YYYY/i);
}
assert.equal(displayMonth('2026-11'), '11-2026');
const stored = ['2026-12-01','2027-01-01','2026-11-30'];
assert.deepEqual(stored.map(displayDate).map(parseDisplayDate).sort(), ['2026-11-30','2026-12-01','2027-01-01']);
const { monthlyTotals } = load('src/lib/ledger.ts');
const data = { wallets: [], changes: [], transfers: [], transactions: stored.map((date,i) => ({id:String(i),type:'expense',amountCentavos:100,category:'Food',date:parseDisplayDate(displayDate(date)),paymentMethod:'Cash'})) };
assert.equal(monthlyTotals(data,'2026-11').expenseCentavos,100);
console.log('Date display, validation, ISO sorting and monthly totals passed.');

const { readableDateRange } = load('src/lib/display-date.ts');
for(const [start,end,expected] of [
 ['2026-11-27','2026-11-27','November 27, 2026'],
 ['2026-11-01','2026-11-30','November 1–30, 2026'],
 ['2026-11-27','2026-12-01','November 27 – December 1, 2026'],
 ['2026-12-28','2027-01-03','December 28, 2026 – January 3, 2027'],
 ['2024-02-29','2024-03-01','February 29 – March 1, 2024'],
 ['0001-01-01','0001-01-01','January 1, 0001'],
]) assert.equal(readableDateRange(start,end),expected);
assert.throws(()=>readableDateRange('2026-02-30','2026-03-01'));
assert.throws(()=>readableDateRange('2026-12-01','2026-11-01'));
