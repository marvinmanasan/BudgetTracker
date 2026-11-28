const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const db = new DatabaseSync(':memory:');
  let failAfterDelete = '';
  const load = createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
    assert.equal(name, 'test-goal-deletion.db');
    return {
      execAsync: async sql => db.exec(sql),
      runAsync: async (sql, ...args) => {
        const result = db.prepare(sql).run(...args);
        if (failAfterDelete && sql.startsWith(failAfterDelete)) throw Error('Interrupted deletion');
        return result;
      },
      getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
      getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
      closeAsync: async () => {},
      withTransactionAsync: async work => { db.exec('BEGIN'); try { await work(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } },
    };
  } } });
  try {
    const savings = load('src/storage/savings.ts'), name = 'test-goal-deletion.db';
    assert.equal(typeof savings.deleteSavingsGoal, 'function', 'A savings goal needs a safe delete operation');
    const goal = { id: 'main', title: 'Emergency Fund', targetCentavos: 100000, deadline: '2026-12-31' };
    const otherGoal = { id: 'other', title: 'Keep', targetCentavos: 50000 };
    const first = { id: 'a', goalId: 'main', amountCentavos: 25025, date: '2026-11-28', note: 'First' };
    const second = { ...first, id: 'b', amountCentavos: 10000, note: 'Second' };
    const other = { ...first, id: 'other', goalId: 'other', note: 'Keep' };
    await savings.saveSavingsGoal(goal, name);
    await savings.saveSavingsGoal(otherGoal, name);
    for (const record of [first, second, other]) await savings.recordSavingsContribution(record, name);
    db.prepare('INSERT INTO wallets(id,name,nameKey,included,hidden) VALUES(?,?,?,?,?)').run('audit-wallet', 'Audit Wallet', 'audit wallet', 1, 0);
    const unrelated = () => JSON.stringify(['wallets','transactions','balance_changes','transfers','monthly_limits','category_allocations','budget_periods','activity_order'].map(table => db.prepare(`SELECT * FROM ${table}`).all()));
    const before = unrelated();
    const snapshot = () => savings.getSavings(name);
    const stable = JSON.stringify(await snapshot());
    for (const staleGoal of [{ ...goal, title: 'Old name' }, { ...goal, targetCentavos: 1 }, { ...goal, deadline: null }, { ...goal, id: 'missing' }]) {
      await assert.rejects(savings.deleteSavingsGoal(staleGoal, [first, second], name), /changed|deleted/i);
      assert.equal(JSON.stringify(await snapshot()), stable);
    }
    for (const staleRecords of [[first], [first, second, other], [first, first], [{ ...first, note: 'Changed' }, second], [{ ...first, amountCentavos: 1 }, second], [{ ...first, date: '2026-11-27' }, second]]) {
      await assert.rejects(savings.deleteSavingsGoal(goal, staleRecords, name), /changed|deleted/i);
      assert.equal(JSON.stringify(await snapshot()), stable);
    }
    for (const boundary of ['DELETE FROM savings_contributions', 'DELETE FROM savings_goals']) {
      failAfterDelete = boundary;
      await assert.rejects(savings.deleteSavingsGoal(goal, [first, second], name), /Interrupted/);
      assert.equal(JSON.stringify(await snapshot()), stable, 'Both children and goal survive a failed transaction');
    }
    failAfterDelete = '';
    const results = await Promise.allSettled([
      savings.deleteSavingsGoal(goal, [second, first], name),
      savings.deleteSavingsGoal(goal, [first, second], name),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(await snapshot())), { goals: [otherGoal], contributions: [other] });
    assert.equal(unrelated(), before, 'No wallet, activity, or spending-plan rows change');
    await savings.saveSavingsGoal(goal, name);
    assert.equal((await snapshot()).contributions.filter(row => row.goalId === 'main').length, 0, 'Fresh goal inherits no old progress');
    await savings.deleteSavingsGoal({ ...goal, deadline: '2026-12-31' }, [], name);
    assert.deepEqual(JSON.parse(JSON.stringify(await snapshot())), { goals: [otherGoal], contributions: [other] });
    console.log('Savings goal deletion passed: populated/empty goals, stale snapshots, exact scope, atomic rollback, queued duplicate requests and fresh-start progress.');
  } finally { db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
