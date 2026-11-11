const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { createLoader } = require('./load-typescript.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bulsa-choices-'));
  const connections = [];
  function fresh() {
    return createLoader({'expo-sqlite': {openDatabaseAsync: async name => {
      assert.equal(name, 'bulsa-choices.db');
      const db = new DatabaseSync(path.join(folder,name)); connections.push(db);
      return {
        execAsync: async sql => db.exec(sql),
        runAsync: async (sql,...args) => db.prepare(sql).run(...args),
        getAllAsync: async (sql,...args) => db.prepare(sql).all(...args),
        getFirstAsync: async (sql,...args) => db.prepare(sql).get(...args) ?? null,
        closeAsync: async () => db.close(),
      };
    }}})('src/storage/choices.ts');
  }
  try {
    const moneyPath = path.join(folder,'bulsa.db');
    const money = new DatabaseSync(moneyPath);
    money.exec('CREATE TABLE transactions(id TEXT PRIMARY KEY, category TEXT, amountCentavos INTEGER, date TEXT);');
    money.prepare('INSERT INTO transactions VALUES(?,?,?,?)').run('old','my lunch',18050,'2026-11-11'); money.close();
    const before = fs.readFileSync(moneyPath);
    let store = fresh();
    assert.deepEqual(await store.getChoices('expense'),[]);
    await store.addChoice({id:'lunch',kind:'expense',name:'my lunch'});
    await store.addChoice({id:'income-lunch',kind:'income',name:'my lunch'});
    await assert.rejects(store.addChoice({id:'dupe',kind:'expense',name:' MY LUNCH '}), /already/i);
    await assert.rejects(store.addChoice({id:'preset',kind:'expense',name:'food'}), /already/i);
    for (const name of ['', '   ', 'a'.repeat(81)]) await assert.rejects(store.addChoice({id:'bad',kind:'expense',name}), /name/i);
    await store.renameChoice('lunch','expense','school snacks');
    assert.equal((await store.getChoices('expense'))[0].name,'school snacks');
    await assert.rejects(store.renameChoice('lunch','expense','Other'), /already/i);
    await assert.rejects(store.renameChoice('lunch','income','wrong kind'), /no longer/i);
    store = fresh();
    assert.equal((await store.getChoices('expense'))[0].name,'school snacks');
    await store.removeChoice('lunch','expense');
    assert.deepEqual(await store.getChoices('expense'),[]);
    assert.equal((await store.getChoices('income'))[0].name,'my lunch');
    await store.addChoice({id:'quotes',kind:'expense',name:"o'Brien's Food"});
    assert.equal((await store.getChoices('expense'))[0].name,"o'Brien's Food");
    const longName = 'my Custom Name '.repeat(5);
    await store.addChoice({id:'long',kind:'expense',name:longName});
    assert.equal((await store.getChoices('expense')).find(choice=>choice.id==='long').name,longName);
    await store.removeChoice('long','expense');
    const duplicates = await Promise.allSettled(['dupe-one','dupe-two'].map(id=>store.addChoice({id,kind:'income',name:'same new choice'})));
    assert.equal(duplicates.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(duplicates.filter(result=>result.status==='rejected').length,1);
    const many = Array.from({length:40},(_,i)=>store.addChoice({id:'many'+i,kind:'expense',name:'choice '+i}));
    await Promise.all(many);
    assert.equal((await store.getChoices('expense')).length,41);
    assert.deepEqual(fs.readFileSync(moneyPath),before);
    const inspect = new DatabaseSync(moneyPath);
    assert.deepEqual({...inspect.prepare('SELECT * FROM transactions').get()}, {id:'old',category:'my lunch',amountCentavos:18050,date:'2026-11-11'}); inspect.close();
    console.log('Custom choices CRUD, persistence, validation and financial data isolation passed.');
  } finally { for (const db of connections) db.close(); fs.rmSync(folder,{recursive:true,force:true}); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
