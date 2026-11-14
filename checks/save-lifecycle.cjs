const assert = require('node:assert/strict');
const {createLoader} = require('./load-typescript.cjs');

// Small hook runner: real hook code, controlled focus and deferred work; no native claims.
const slots=[]; let cursor=0, effect, cleanup;
const react={
  useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},
  useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],next=>{slots[i]=next;}];},
  useCallback(fn){cursor++;return fn;},
  useMemo(fn){cursor++;return fn();},
};
const {useSaveAction}=createLoader({'./use-bulsa-theme':{},'react':react,'expo-router':{useFocusEffect(fn){effect=fn;}},'../storage/wallets':{getLedger:async()=>{}}})('src/hooks/use-ledger.ts');
const render=()=>{cursor=0;return useSaveAction();};
const focus=()=>{cleanup=effect?.();};
const blur=()=>{cleanup?.();};
async function main(){
  let hook=render();focus();
  let finish;
  const saving=hook.run(()=>new Promise(resolve=>{finish=resolve;}));
  assert.equal(await hook.run(async()=>{}),false,'block repeated taps');
  blur();finish();
  assert.equal(await saving,false,'do not navigate from a screen left during saving');
  hook=render();focus();hook=render();
  assert.equal(hook.busy,false);
  assert.equal(await hook.run(async()=>false),false,'cancelled confirmation is not success');
  assert.equal(await hook.run(async()=>{}),true);
  const rejected=hook.run(async()=>{throw Error('old error');});blur();focus();
  assert.equal(await rejected,false);
  assert.equal(render().error,'','do not put a previous focus error on the returned screen');
  console.log('Save lifecycle checks passed: duplicate prevention, cancellation, focus changes and stale errors.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
