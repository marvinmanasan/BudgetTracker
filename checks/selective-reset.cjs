const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

// Each assertion catches a wrong scope/kind, lost endpoint, stale approval, or
// unsafe partial write. Only the native bridge is replaced; SQL and rollback are real.
const kinds = { expenses: true, income: true, transfers: true, adjustments: true };
const selection = (scope = 'wallet', overrides = {}) => ({
  scope, ...(scope === 'wallet' ? { walletId: 'a' } : {}),
  kinds: { ...kinds }, resetStartingBalances: false, ...overrides,
});
const fixture = () => ({
  wallets: [
    { id: 'a', name: "A's cash", included: true, hidden: false },
    { id: 'b', name: 'Hidden savings', included: false, hidden: true },
    { id: 'c', name: 'Untouched', included: true, hidden: false },
  ],
  transactions: [
    { id: 'ea', type: 'expense', amountCentavos: 100, walletId: 'a', category: 'Food', date: '2026-11-01', paymentMethod: 'Cash' },
    { id: 'ia', type: 'income', amountCentavos: 200, walletId: 'a', category: 'Pay', date: '2026-11-01', paymentMethod: 'Cash' },
    { id: 'eb', type: 'expense', amountCentavos: 20, walletId: 'b', category: 'Food', date: '2026-10-01', paymentMethod: 'Cash' },
    { id: 'ib', type: 'income', amountCentavos: 50, walletId: 'b', category: 'Pay', date: '2026-10-01', paymentMethod: 'Cash' },
    { id: 'eg', type: 'expense', amountCentavos: 30, category: 'Food', date: '2026-11-01', paymentMethod: 'Not specified' },
    { id: 'ig', type: 'income', amountCentavos: 70, category: 'Pay', date: '2026-11-01', paymentMethod: 'Not specified' },
  ],
  changes: [
    { id: 'oa', walletId: 'a', kind: 'opening', deltaCentavos: 1000, date: '2026-11-01', reason: 'Starting balance', targetCentavos: null },
    { id: 'ob', walletId: 'b', kind: 'opening', deltaCentavos: 500, date: '2026-11-01', reason: 'Starting balance', targetCentavos: null },
    { id: 'oc', walletId: 'c', kind: 'opening', deltaCentavos: 0, date: '2026-11-01', reason: 'Starting balance', targetCentavos: null },
    { id: 'aa', walletId: 'a', kind: 'adjustment', deltaCentavos: -25, date: '2026-11-01', reason: 'Correction', targetCentavos: 1075 },
    { id: 'ab', walletId: 'b', kind: 'adjustment', deltaCentavos: 15, date: '2026-11-01', reason: 'Correction', targetCentavos: 545 },
  ],
  transfers: [
    { id: 'atob', fromWalletId: 'a', toWalletId: 'b', amountCentavos: 300, date: '2026-11-01', note: 'Across exclusion' },
    { id: 'btoa', fromWalletId: 'b', toWalletId: 'a', amountCentavos: 40, date: '2026-11-01', note: 'Back again' },
  ],
});
function pureChecks(previewReset) {
  const data = fixture(), saved = JSON.stringify(data);
  let result = previewReset(data, selection());
  assert.deepEqual(result.counts, { expenses: 1, income: 1, transfers: 2, adjustments: 1, startingBalances: 0 });
  assert.equal(result.before.totalCentavos, 855);
  assert.equal(result.before.generalCentavos, 40);
  assert.equal(result.after.totalCentavos, 1040);
  assert.equal(result.after.wallets.find(w => w.id === 'a').balanceCentavos, 1000);
  assert.equal(result.before.wallets.find(w => w.id === 'b').balanceCentavos, 805);
  assert.equal(result.after.wallets.find(w => w.id === 'b').balanceCentavos, 545);
  assert.deepEqual(result.affectedWalletIds, ['a', 'b']);
  assert.equal(result.hasChanges, true);
  assert.equal(JSON.stringify(data), saved, 'preview must not mutate history');
  result = previewReset(data, selection('general', { kinds: { ...kinds, transfers: false, adjustments: false } }));
  assert.deepEqual(result.counts, { expenses: 1, income: 1, transfers: 0, adjustments: 0, startingBalances: 0 });
  assert.equal(result.after.generalCentavos, 0);
  assert.equal(result.after.totalCentavos, 815);
  assert.deepEqual(result.affectedWalletIds, []);
  result = previewReset(data, selection('all'));
  assert.deepEqual(result.counts, { expenses: 3, income: 3, transfers: 2, adjustments: 2, startingBalances: 0 });
  assert.equal(result.after.totalCentavos, 1000);
  assert.equal(result.after.wallets.find(w => w.id === 'b').balanceCentavos, 500);
  assert.equal(result.after.wallets.every(w => w.configured), true);
  result = previewReset(data, selection('wallet', { resetStartingBalances: true }));
  assert.equal(result.counts.startingBalances, 1);
  assert.equal(result.after.wallets.find(w => w.id === 'a').configured, false);
  assert.equal(result.after.wallets.find(w => w.id === 'b').configured, true);
  result = previewReset(data, selection('all', { resetStartingBalances: true }));
  assert.equal(result.counts.startingBalances, 3);
  assert.equal(result.after.totalCentavos, 0);
  assert.equal(result.after.wallets.every(w => !w.configured), true);
  result = previewReset(data, selection('wallet', { walletId: 'c' }));
  assert.equal(result.hasChanges, false);
  assert.equal(result.after.totalCentavos, 855);
  const expenseOnly = selection('wallet', { kinds: { expenses: true, income: false, transfers: false, adjustments: false } });
  assert.equal(previewReset(data, expenseOnly).after.totalCentavos, 955);
  const incomeOnly = selection('wallet', { kinds: { expenses: false, income: true, transfers: false, adjustments: false } });
  assert.equal(previewReset(data, incomeOnly).after.totalCentavos, 655);
  const negative = { ...data, transactions: [{ ...data.transactions[0], amountCentavos: 1400 }], transfers: [], changes: data.changes.filter(c => c.kind === 'opening') };
  assert.equal(previewReset(negative, selection('wallet', { kinds: { expenses: false, income: true, transfers: false, adjustments: false } })).after.wallets[0].balanceCentavos, -400);
  const reordered = Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, [...rows].reverse()]));
  assert.equal(previewReset(reordered, selection()).signature, previewReset(data, selection()).signature, 'snapshot ordering is deterministic');
  const changed = structuredClone(data); changed.wallets[2].name = 'Renamed';
  assert.notEqual(previewReset(changed, selection()).signature, previewReset(data, selection()).signature, 'even untouched wallet metadata invalidates approval');
  assert.notEqual(previewReset(data, expenseOnly).signature, previewReset(data, selection()).signature, 'selection is part of approval');
  for (const bad of [
    null, {}, selection('unknown'), selection('wallet', { walletId: '' }), selection('wallet', { walletId: 'missing' }),
    selection('all', { walletId: 'a' }), selection('all', { kinds: { ...kinds, savings: true } }),
    selection('all', { kinds: { ...kinds, expenses: 1 } }), selection('all', { kinds: {} }),
    selection('all', { kinds: { expenses: false, income: false, transfers: false, adjustments: false } }),
    selection('all', { resetStartingBalances: 'yes' }), selection('general'),
    selection('general', { resetStartingBalances: true }),
    selection('wallet', { resetStartingBalances: true, kinds: { ...kinds, income: false } }),
  ]) assert.throws(() => previewReset(data, bad));
  const max = Number.MAX_SAFE_INTEGER;
  const overflow = { wallets: [data.wallets[0]], transactions: [], transfers: [], changes: [
    { ...data.changes[0], deltaCentavos: max }, { ...data.changes[3], deltaCentavos: 1 },
  ] };
  assert.throws(() => previewReset(overflow, selection()), /range|large/i);
  const unsafeAfter = { ...overflow, changes: [{ ...data.changes[0], deltaCentavos: max }], transactions: [
    { ...data.transactions[0], amountCentavos: 1 }, { ...data.transactions[1], amountCentavos: 1 },
  ] };
  assert.throws(() => previewReset(unsafeAfter, expenseOnly), /range|large/i, 'reset must not produce unsupported balances');
  const unsafeMonth = { wallets: [data.wallets[0]], changes: [], transfers: [], transactions: [
    { ...data.transactions[0], amountCentavos: max }, { ...data.transactions[0], id: 'extra', amountCentavos: 1 },
    { ...data.transactions[1], amountCentavos: max }, { ...data.transactions[1], id: 'extra-income', amountCentavos: 1 },
  ] };
  assert.throws(() => previewReset(unsafeMonth, selection()), /range|large/i, 'monthly totals need the same safe-money checks');
}

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'bulsa-reset-'));
  const connections = new Map(); let failRead = false;
  const load = createLoader({ 'expo-sqlite': { openDatabaseAsync: async name => {
    assert.ok(!['bulsa.db', 'bulsa-choices.db'].includes(name), 'never open user data in checks');
    const db = new DatabaseSync(path.join(folder, name)); connections.set(name, db);
    return {
      execAsync: async sql => db.exec(sql),
      getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
      getAllAsync: async (sql, ...args) => { if (failRead) throw Error('read interrupted'); return db.prepare(sql).all(...args); },
      runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
      closeAsync: async () => { db.close(); connections.delete(name); },
      withTransactionAsync: async work => { db.exec('BEGIN'); try { await work(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } },
    };
  } } });
  try {
    pureChecks(load('src/lib/selective-reset.ts').previewReset);
    const store = load('src/storage/selective-reset.ts');
    const database = load('src/storage/database.ts');
    async function seed(name) {
      const db = await database.openDatabase(name); const data = fixture();
      await db.execAsync('DELETE FROM wallets');
      for (const w of data.wallets) await db.runAsync('INSERT INTO wallets(id,name,nameKey,included,hidden) VALUES(?,?,?,?,?)', w.id, w.name, w.name.toLowerCase(), +w.included, +w.hidden);
      for (const t of data.transactions) await db.runAsync('INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod,note,walletId) VALUES(?,?,?,?,?,?,?,?)', t.id, t.type, t.amountCentavos, t.category, t.date, t.paymentMethod, t.note ?? null, t.walletId ?? null);
      for (const c of data.changes) await db.runAsync('INSERT INTO balance_changes(id,walletId,kind,deltaCentavos,date,reason,targetCentavos) VALUES(?,?,?,?,?,?,?)', c.id, c.walletId, c.kind, c.deltaCentavos, c.date, c.reason, c.targetCentavos);
      for (const t of data.transfers) await db.runAsync('INSERT INTO transfers(id,fromWalletId,toWalletId,amountCentavos,date,note) VALUES(?,?,?,?,?,?)', t.id, t.fromWalletId, t.toWalletId, t.amountCentavos, t.date, t.note);
      await db.execAsync(`CREATE TABLE IF NOT EXISTS monthly_limits(month TEXT PRIMARY KEY,limitCentavos INTEGER NOT NULL);
        INSERT INTO monthly_limits(month,limitCentavos) VALUES('2026-11',45000);
        CREATE TABLE custom_choices(id TEXT PRIMARY KEY, name TEXT); INSERT INTO custom_choices VALUES('food','My food');
        CREATE TABLE savings(id TEXT PRIMARY KEY,amountCentavos INTEGER); INSERT INTO savings VALUES('kept',800);
        CREATE TABLE settings(id TEXT PRIMARY KEY,value TEXT); INSERT INTO settings VALUES('theme','dark');`);
      return db;
    }
    const ledger = name => load('src/storage/wallets.ts').getLedger(name);
    const dump = db => JSON.stringify(['wallets','transactions','transfers','balance_changes','monthly_limits','custom_choices','savings','settings'].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()));
    const preserved = db => JSON.stringify(['wallets','monthly_limits','custom_choices','savings','settings'].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()));
    for (const [name, pick, remaining] of [
      ['wallet.db', selection(), { transactions: ['eb','ib','eg','ig'], transfers: [], changes: ['oa','ob','oc','ab'] }],
      ['expense.db', selection('wallet', { kinds: { expenses: true, income: false, transfers: false, adjustments: false } }), { transactions: ['ia','eb','ib','eg','ig'], transfers: ['atob','btoa'], changes: ['oa','ob','oc','aa','ab'] }],
      ['transfer.db', selection('wallet', { kinds: { expenses: false, income: false, transfers: true, adjustments: false } }), { transactions: ['ea','ia','eb','ib','eg','ig'], transfers: [], changes: ['oa','ob','oc','aa','ab'] }],
      ['general.db', selection('general', { kinds: { ...kinds, transfers: false, adjustments: false } }), { transactions: ['ea','ia','eb','ib'], transfers: ['atob','btoa'], changes: ['oa','ob','oc','aa','ab'] }],
      ['hidden.db', selection('wallet', { walletId: 'b' }), { transactions: ['ea','ia','eg','ig'], transfers: [], changes: ['oa','ob','oc','aa'] }],
      ['all.db', selection('all'), { transactions: [], transfers: [], changes: ['oa','ob','oc'] }],
      ['openings.db', selection('all', { resetStartingBalances: true }), { transactions: [], transfers: [], changes: [] }],
      ['one-opening.db', selection('wallet', { resetStartingBalances: true }), { transactions: ['eb','ib','eg','ig'], transfers: [], changes: ['ob','oc','ab'] }],
    ]) {
      const db = await seed(name), kept = preserved(connections.get(name));
      const preview = await store.getResetPreview(pick, name);
      const committed = await store.applyReset(pick, preview.signature, name);
      assert.equal(committed.signature, preview.signature);
      assert.equal(preserved(connections.get(name)), kept, 'choices, limits, savings, settings and wallet metadata stay byte-for-byte');
      const actual = await ledger(name);
      for (const [key, ids] of Object.entries(remaining)) assert.deepEqual(actual[key].map(row => row.id).sort(), [...ids].sort(), `${name}: preserve every unselected row`);
      assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM wallets')).n, 3);
    }
    const name = 'guard.db', db = await seed(name), raw = connections.get(name), initial = dump(raw);
    const pick = selection(); let preview = await store.getResetPreview(pick, name);
    await assert.rejects(store.applyReset(selection('all'), preview.signature, name), /changed|review/i);
    assert.equal(dump(raw), initial);
    await assert.rejects(store.applyReset(pick, '', name));
    assert.equal(dump(raw), initial);
    await assert.rejects(store.applyReset(selection('general'), preview.signature, name));
    assert.equal(dump(raw), initial, 'invalid kinds never delete any rows');
    await db.runAsync('UPDATE transactions SET note=? WHERE id=?', 'Changed an unselected historical record', 'eb');
    const changed = dump(raw);
    await assert.rejects(store.applyReset(pick, preview.signature, name), /changed|review/i);
    assert.equal(dump(raw), changed, 'stale review deletes nothing');
    preview = await store.getResetPreview(pick, name);
    // Failure on a later table must restore earlier transaction deletions too.
    await db.execAsync("CREATE TRIGGER stop_reset BEFORE DELETE ON transfers BEGIN SELECT RAISE(ABORT,'reset interrupted'); END;");
    await assert.rejects(store.applyReset(pick, preview.signature, name), /interrupted/);
    assert.equal(dump(raw), changed, 'a later deletion failure rolls the whole reset back');
    await db.execAsync('DROP TRIGGER stop_reset');
    await db.execAsync(`CREATE TRIGGER corrupt_remaining AFTER DELETE ON transactions BEGIN UPDATE balance_changes SET deltaCentavos=${Number.MAX_SAFE_INTEGER} WHERE id='ob'; END;`);
    await assert.rejects(store.applyReset(pick, preview.signature, name), /range|large/i);
    assert.equal(dump(raw), changed, 'post-delete money validation failure rolls every write back');
    await db.execAsync('DROP TRIGGER corrupt_remaining');
    failRead = true;
    await assert.rejects(store.getResetPreview(pick, name), /read interrupted/);
    await assert.rejects(store.applyReset(pick, preview.signature, name), /read interrupted/);
    failRead = false;
    assert.equal(dump(raw), changed);
    const noChange = selection('wallet', { walletId: 'c' });
    const empty = await store.getResetPreview(noChange, name);
    assert.equal(empty.hasChanges, false);
    await store.applyReset(noChange, empty.signature, name);
    assert.equal(dump(raw), changed);
    // Inputs are snapshotted before they wait for the shared database queue.
    let release; const wait = database.withDatabase(name, async () => new Promise(resolve => { release = resolve; }));
    await new Promise(resolve => setImmediate(resolve));
    const mutable = selection(); const queued = store.applyReset(mutable, preview.signature, name);
    mutable.scope = 'all'; mutable.kinds.expenses = false; release(); await wait; await queued;
    assert.equal((await ledger(name)).transactions.length, 4, 'queued operation uses the originally approved selection');
    const negativeDb = await seed('negative.db');
    await negativeDb.execAsync("DELETE FROM transfers; DELETE FROM balance_changes WHERE kind='adjustment'; UPDATE balance_changes SET deltaCentavos=0 WHERE id='oa'; UPDATE transactions SET amountCentavos=250 WHERE id='ea'; UPDATE transactions SET amountCentavos=500 WHERE id='ia';");
    const incomeOnly = selection('wallet', { kinds: { expenses: false, income: true, transfers: false, adjustments: false } });
    const negativePreview = await store.getResetPreview(incomeOnly, 'negative.db');
    assert.equal(negativePreview.before.wallets.find(w => w.id === 'a').balanceCentavos, 250);
    assert.equal(negativePreview.after.wallets.find(w => w.id === 'a').balanceCentavos, -250);
    await store.applyReset(incomeOnly, negativePreview.signature, 'negative.db');
    assert.equal(load('src/lib/ledger.ts').deriveBalances(await ledger('negative.db')).wallets.find(w => w.id === 'a').balanceCentavos, -250);
    const bulkDb = await seed('bulk.db');
    const quotedId = "quoted'); DROP TABLE wallets; --";
    await bulkDb.runAsync('UPDATE transactions SET id=? WHERE id=?', quotedId, 'ea');
    for (let i = 0; i < 405; i++) await bulkDb.runAsync('INSERT INTO transactions(id,type,amountCentavos,category,date,paymentMethod,walletId) VALUES(?,?,?,?,?,?,?)', 'bulk-' + i, 'expense', 1, 'Food', '2026-11-01', 'Cash', 'a');
    const expensesOnly = selection('wallet', { kinds: { expenses: true, income: false, transfers: false, adjustments: false } });
    const bulk = await store.getResetPreview(expensesOnly, 'bulk.db');
    assert.equal(bulk.counts.expenses, 406);
    await store.applyReset(expensesOnly, bulk.signature, 'bulk.db');
    assert.deepEqual((await ledger('bulk.db')).transactions.map(t => t.id).sort(), ['eb','eg','ia','ib','ig']);
    assert.equal((await bulkDb.getFirstAsync('SELECT COUNT(*) AS n FROM wallets')).n, 3, 'quoted IDs remain bound values across parameter batches');
    console.log('Selective reset checks passed: scopes/kinds, hidden/excluded wallets, crossed transfers, openings, safe limits, deterministic/stale signatures, queued snapshots, preservation and real SQLite rollback.');
  } finally {
    for (const db of connections.values()) db.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
