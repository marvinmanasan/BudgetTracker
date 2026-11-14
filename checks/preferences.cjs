const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');
async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),'bulsa-prefs-'));
  const opened = new Set(); let failWrite = false, failRead = false;
  const fresh = () => createLoader({'expo-sqlite': {openDatabaseAsync: async name => {
    assert.equal(name,'settings-test.db','Settings must not open financial or personal databases');
    const db = new DatabaseSync(path.join(folder,name)); opened.add(db);
    return {
      execAsync: async sql => db.exec(sql), closeAsync: async () => {db.close();opened.delete(db);},
      getFirstAsync: async (sql,...params) => {if(failRead) throw Error('read failed');return db.prepare(sql).get(...params)??null;},
      runAsync: async (sql,...params) => {const r=db.prepare(sql).run(...params);if(failWrite)throw Error('write failed');return r;},
      withTransactionAsync: async work => {db.exec('BEGIN');try{await work();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}},
    };
  }}});
  try {
    let load=fresh(), prefs=load('src/storage/preferences.ts');
    const name='settings-test.db';
    assert.deepEqual(await prefs.getPreferences(name),{displayName:'',appearance:'light',onboardingComplete:false});
    await prefs.updatePreferences({displayName:"A'; DROP TABLE preferences;--",appearance:'dark'},name);
    await Promise.all([prefs.updatePreferences({onboardingComplete:true},name),prefs.updatePreferences({displayName:'Ana'},name)]);
    assert.deepEqual(await prefs.getPreferences(name),{displayName:'Ana',appearance:'dark',onboardingComplete:true});
    for(const invalid of [{appearance:'blue'},{displayName:'x'.repeat(61)},{onboardingComplete:1},{secret:'ignored?'}]) await assert.rejects(prefs.updatePreferences(invalid,name));
    failWrite=true;await assert.rejects(prefs.updatePreferences({displayName:'Lost',appearance:'light'},name),/write failed/);failWrite=false;
    assert.deepEqual(await prefs.getPreferences(name),{displayName:'Ana',appearance:'dark',onboardingComplete:true});
    failRead=true;await assert.rejects(prefs.getPreferences(name),/read failed/);failRead=false;
    for(const db of opened)db.close();opened.clear();load=fresh();prefs=load('src/storage/preferences.ts');
    assert.deepEqual(await prefs.getPreferences(name),{displayName:'Ana',appearance:'dark',onboardingComplete:true});
    const savedOrder = ['wallet-maya', 'wallet-gcash', 'missing'];
    await prefs.updatePreferences({walletOrder:savedOrder},name);
    for(const db of opened)db.close();opened.clear();load=fresh();prefs=load('src/storage/preferences.ts');
    const {orderWallets} = load('src/lib/wallet-order.ts');
    const wallets = ['wallet-gcash','new','wallet-cash','wallet-maya'].map(id => ({id}));
    const reopened = await prefs.getPreferences(name);
    assert.deepEqual(reopened.walletOrder,savedOrder);
    assert.deepEqual(orderWallets(wallets,reopened.walletOrder).map(w=>w.id),['wallet-cash','wallet-maya','wallet-gcash','new']);
    await prefs.updatePreferences({appearance:'system'},name);
    assert.equal((await prefs.getPreferences(name)).appearance,'system');
    console.log('Preferences SQLite checks passed: defaults, independent database, validation, bound values, concurrent patches, rollback/read errors and reopen.');
  } finally {for(const db of opened)db.close();fs.rmSync(folder,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
