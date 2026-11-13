const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createLoader } = require('./load-typescript.cjs');
const fs = require('node:fs');

async function main() {
  const db = new DatabaseSync(':memory:');
  let failWrite = false;
  const load = createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
    assert.equal(name, 'savings-corrections-fixture.db');
    return {
      execAsync: async sql => db.exec(sql),
      runAsync: async (sql, ...args) => { const result = db.prepare(sql).run(...args); if (failWrite && /^(UPDATE|DELETE FROM) savings_contributions/.test(sql)) throw Error('interrupted'); return result; },
      getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
      getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
      closeAsync: async () => {},
      withTransactionAsync: async work => { db.exec('BEGIN'); try { await work(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } },
    };
  } } });
  try {
    const savings = load('src/storage/savings.ts'), name = 'savings-corrections-fixture.db';
    assert.equal(typeof savings.updateSavingsContribution, 'function', 'saved savings need an edit operation');
    assert.equal(typeof savings.deleteSavingsContribution, 'function', 'saved savings need an individual delete operation');
    const goal = { id: 'main', title: 'Trip', targetCentavos: 30000 };
    await savings.saveSavingsGoal(goal, name);
    const first = { id: 'first', goalId: 'main', amountCentavos: 50000, date: '2026-11-13', note: 'Mistake' };
    const second = { ...first, id: 'second', amountCentavos: 200, note: 'Keep' };
    await savings.recordSavingsContribution(first, name);
    await savings.recordSavingsContribution(second, name);
    const ledger = () => JSON.stringify(['wallets', 'transactions', 'balance_changes', 'transfers', 'monthly_limits', 'category_allocations'].map(table => db.prepare(`SELECT * FROM ${table}`).all()));
    const beforeLedger = ledger();
    const corrected = { ...first, amountCentavos: 5000, date: '2024-02-29', note: 'Corrected' };
    await savings.updateSavingsContribution(corrected, first, name);
    assert.deepEqual({ ...db.prepare('SELECT * FROM savings_contributions WHERE id=?').get('first') }, corrected);
    await assert.rejects(savings.updateSavingsContribution(first, first, name), /changed/i);
    await assert.rejects(savings.deleteSavingsContribution(first, name), /changed/i);
    for (const invalid of [{ ...corrected, amountCentavos: 0 }, { ...corrected, date: '2026-02-29' }, { ...corrected, amountCentavos: Number.MAX_SAFE_INTEGER }, { ...corrected, goalId: 'other' }, { ...corrected, id: 'other' }]) {
      await assert.rejects(savings.updateSavingsContribution(invalid, corrected, name));
      assert.deepEqual({ ...db.prepare('SELECT * FROM savings_contributions WHERE id=?').get('first') }, corrected);
    }
    failWrite = true;
    await assert.rejects(savings.updateSavingsContribution({ ...corrected, amountCentavos: 1 }, corrected, name), /interrupted/);
    await assert.rejects(savings.deleteSavingsContribution(corrected, name), /interrupted/);
    failWrite = false;
    assert.deepEqual({ ...db.prepare('SELECT * FROM savings_contributions WHERE id=?').get('first') }, corrected);
    await savings.deleteSavingsContribution(corrected, name);
    await assert.rejects(savings.deleteSavingsContribution(corrected, name), /changed|found/i);
    const remaining = await savings.getSavings(name);
    assert.deepEqual(remaining.goals.map(row => ({ ...row })), [goal]);
    assert.deepEqual(remaining.contributions.map(row => ({ ...row })), [second]);
    assert.equal(ledger(), beforeLedger);
    const screen = fs.readFileSync('src/app/savings.tsx', 'utf8');
    assert.match(screen, /SavingsCorrectionPopup/);
    assert.match(screen, /title="Edit Savings Record"/);
    assert.match(screen, /title="Delete Savings Record"/);
    const popup = fs.readFileSync('src/components/savings-correction-popup.tsx', 'utf8');
    assert.match(popup, /CenteredPopup/);
    assert.match(popup, /Review Savings Correction/);
    assert.match(popup, /Delete This Savings Record\?/);
    assert.match(popup, /updateSavingsContribution\(review, original\)/);
    assert.match(popup, /deleteSavingsContribution\(original\)/);
    console.log('Savings corrections passed: exact stale guards, edit/delete, validation, overflow rollback, interrupted writes, retained goal/other records, independent ledger.');
  } finally { db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
