const assert = require('node:assert/strict');
const {createLoader} = require('./load-typescript.cjs');
const {createUndoController} = createLoader()('src/lib/transaction-undo.ts');
(async () => {
  const record = {id:'one',type:'expense',amountCentavos:100,category:'Food',date:'2026-11-01',paymentMethod:'Cash'};
  let release, fail = true, deletes = 0, restores = 0;
  const controller = createUndoController({
    remove: async () => { deletes++; await new Promise(r => {release = r;}); return {...record}; },
    restore: async () => { restores++; if(fail) throw Error('Disk failure'); },
  });
  const pending = controller.remove(record);
  assert.equal(await controller.remove(record),false);
  assert.equal(controller.snapshot().busy,true);
  release(); assert.equal(await pending,true);
  assert.equal(deletes,1);
  assert.equal(controller.snapshot().record.id,'one');
  assert.equal(await controller.remove(record),false,'pending Undo must not be silently replaced');
  assert.equal(await controller.undo(),false);
  assert.equal(controller.snapshot().record.id,'one','failure keeps recoverable record');
  assert.match(controller.snapshot().error,/Disk failure/);
  fail=false;
  assert.equal(await controller.undo(),true);
  assert.equal(controller.snapshot().record,null);
  assert.equal(await controller.undo(),false);
  assert.equal(restores,2);
  console.log('Undo controller checks passed: duplicate actions, pending protection, failure retry and restore once.');
})().catch(e=>{console.error(e);process.exitCode=1;});
