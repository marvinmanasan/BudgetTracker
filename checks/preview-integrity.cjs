const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bulsa-preview-'));
  const connections = [];
  const load = createLoader({ react: { useSyncExternalStore: (_subscribe, snapshot) => snapshot() }, 'expo-sqlite': { openDatabaseAsync: async name => {
    const db = new DatabaseSync(path.join(folder, name)); connections.push(db);
    return {
      // All names, including the default legacy name, resolve inside this temporary folder.
      closeAsync: async () => {},
      execAsync: async sql => db.exec(sql),
      runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
      getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
      getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
      withTransactionAsync: async fn => { db.exec('BEGIN'); try { await fn(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } },
    };
  } } });
  const wallets = load('src/storage/wallets.ts');
  const transactions = load('src/storage/transactions.ts');
  const { adjustmentPreview, editPreview, deletionPreview } = load('src/lib/editing.ts');
  const { deriveBalances } = load('src/lib/ledger.ts');
  const signature = preview => JSON.stringify({ before: preview.before, after: preview.after });
  const date = '2026-11-13';
  const original = { id: 'expense', type: 'expense', amountCentavos: 10000, category: 'Food', date, paymentMethod: 'Not specified', walletId: 'wallet-gcash' };
  try {
    for (const operation of ['adjustment', 'edit', 'delete']) {
      for (const change of ['inclusion', 'other-balance', 'excluded-balance', 'general']) {
        const name = `${operation}-${change}.db`;
        await wallets.setOpening('wallet-gcash', 100000, name);
        await wallets.setOpening('wallet-cash', 50000, name);
        await wallets.setOpening('wallet-maya', 200000, name);
        await wallets.setWalletFlags('wallet-maya', { included: false }, name);
        if (operation !== 'adjustment') await transactions.saveTransaction(original, name);
        const data = await wallets.getLedger(name);
        const edited = { ...original, amountCentavos: 15000 };
        const preview = operation === 'adjustment' ? adjustmentPreview(data, 'wallet-gcash', 95000)
          : operation === 'edit' ? editPreview(data, edited)
          : { before: deriveBalances(data), after: deriveBalances({ ...data, transactions: [] }) };
        const approved = signature(preview);
        // Queue the competing write before confirmation without awaiting it. The
        // guard must read after it inside the database write queue.
        const competing = change === 'inclusion' ? wallets.setWalletFlags('wallet-gcash', { included: false }, name)
          : transactions.saveTransaction({ ...original, id: 'competing', type: 'income', amountCentavos: 100, walletId: change === 'general' ? null : change === 'excluded-balance' ? 'wallet-maya' : 'wallet-cash' }, name);
        const save = () => operation === 'adjustment'
          ? wallets.adjustWallet({ id: 'adjustment', walletId: 'wallet-gcash', targetCentavos: 95000, reason: 'Counted', date, expectedBalanceCentavos: preview.currentCentavos, expectedPreviewSignature: approved }, name)
          : operation === 'edit' ? transactions.updateTransaction(edited, name, original, approved)
          : transactions.deleteTransaction(original.id, name, original, approved);
        const rejected = assert.rejects(save(), /changed.*review|review.*again/i, `${operation}: ${change} must invalidate the approved money preview`);
        await competing;
        await rejected;
        const after = await wallets.getLedger(name);
        assert.equal(after.changes.filter(row => row.kind === 'adjustment').length, 0);
        if (operation !== 'adjustment') assert.equal(after.transactions.find(row => row.id === original.id).amountCentavos, 10000);
        // Reviewing the fresh effects permits precisely the requested write.
        const freshPreview = operation === 'adjustment' ? adjustmentPreview(after, 'wallet-gcash', 95000)
          : operation === 'edit' ? editPreview(after, edited)
          : { before: deriveBalances(after), after: deriveBalances({ ...after, transactions: after.transactions.filter(row => row.id !== original.id) }) };
        const fresh = signature(freshPreview);
        // An altered proposal must also fail when the before balances still
        // match: both halves of the approved review are required.
        if (operation === 'adjustment') await assert.rejects(wallets.adjustWallet({ id: 'different-proposal', walletId: 'wallet-gcash', targetCentavos: 94000, reason: 'Counted', date, expectedPreviewSignature: fresh }, name), /changed.*review/i);
        if (operation === 'edit') await assert.rejects(transactions.updateTransaction({ ...edited, amountCentavos: 16000 }, name, original, fresh), /changed.*review/i);
        if (operation === 'adjustment') await wallets.adjustWallet({ id: 'adjustment', walletId: 'wallet-gcash', targetCentavos: 95000, reason: 'Counted', date, expectedPreviewSignature: fresh }, name);
        else if (operation === 'edit') await transactions.updateTransaction(edited, name, original, fresh);
        else await transactions.deleteTransaction(original.id, name, original, fresh);
        const saved = deriveBalances(await wallets.getLedger(name));
        assert.deepEqual(saved, freshPreview.after);
      }
    }
    // Exercise the real hook -> Undo controller -> storage forwarding, replacing
    // only React's subscription boundary and Expo's native SQLite bridge.
    await wallets.setOpening('wallet-gcash', 100000);
    await transactions.saveTransaction(original);
    const approvedDeletion = signature(deletionPreview(await wallets.getLedger(), original.id));
    const undo = load('src/hooks/use-transaction-undo.ts').useTransactionUndo();
    await wallets.setWalletFlags('wallet-gcash', { included: false });
    assert.equal(await undo.remove(original, approvedDeletion), false);
    assert.equal(undo.snapshot().record, null, 'stale deletion must not offer Undo for a record that still exists');
    assert.match(undo.snapshot().error, /changed.*review/i);
    const reviewed = signature(deletionPreview(await wallets.getLedger(), original.id));
    assert.equal(await undo.remove(original, reviewed), true);
    assert.equal((await wallets.getLedger()).transactions.length, 0);
    assert.equal(await undo.undo(), true);
    assert.equal((await wallets.getLedger()).transactions.length, 1);
    assert.equal(await undo.undo(), false);
    console.log('Preview integrity passed: queued inclusion, included/excluded wallet and General changes reject all three stale approvals; changed proposals reject; fresh reviews save exact effects; Undo forwards approvals and restores once.');
  } finally {
    for (const db of connections) db.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
