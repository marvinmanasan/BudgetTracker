const assert = require('node:assert/strict');
const { createLoader } = require('./load-typescript.cjs');
const { savingsSummary } = createLoader()('src/lib/savings-summary.ts');
const goal = { id: 'main', title: 'Emergency Fund', targetCentavos: 10000 };
const records = [
  { id: 'a', goalId: 'main', amountCentavos: 7000, date: '2026-10-31', note: '' },
  { id: 'b', goalId: 'main', amountCentavos: 5000, date: '2026-11-01', note: '' },
  { id: 'other', goalId: 'other', amountCentavos: 8000, date: '2026-11-02', note: '' },
];
const original = JSON.stringify(records);
const summary = savingsSummary(goal, records);
assert.equal(summary.savedCentavos, 12000);
assert.equal(summary.remainingCentavos, -2000);
assert.equal(summary.progress, 1);
assert.deepEqual(summary.history.map(r => r.id), ['b', 'a']);
assert.equal(JSON.stringify(records), original);
assert.deepEqual(savingsSummary(goal, []), { savedCentavos: 0, remainingCentavos: 10000, progress: 0, history: [] });
assert.equal(savingsSummary({ ...goal, targetCentavos: 20000 }, records).progress, 0.6);
for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  assert.throws(() => savingsSummary({ ...goal, targetCentavos: value }, records));
  assert.throws(() => savingsSummary(goal, [{ ...records[0], amountCentavos: value }]));
}
assert.throws(() => savingsSummary(goal, [
  { ...records[0], amountCentavos: Number.MAX_SAFE_INTEGER }, records[1],
]));
console.log('Savings summary checks passed: exact sums, overshoot, safe boundaries and ISO history.');
