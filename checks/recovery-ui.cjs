const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let slots=[],cursor=0,focus,selectedExports=[],restoreFails=true;
const snapshots={old:{createdAt:'2026-11-26T00:00:00.000Z',tables:{},id:'A'},new:{createdAt:'2026-11-27T00:00:00.000Z',tables:{},id:'B'}};
let newest='old';
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(v){const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i];},useCallback:f=>f};
const mocks={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'react-native':{Platform:{OS:'android'},Text:'Text',View:'View',BackHandler:{addEventListener:()=>({remove(){}})}},'expo-router':{useRouter:()=>({replace(){}}),useFocusEffect:f=>focus=f},
 '../components/bulsa-form':{BackButton:'Back',Field:'Field',useUI:()=>({})},'../components/bulsa-button':{BulsaButton:'Button'},'../components/bulsa-screen':{BulsaScreen:'Screen'},
 '../hooks/use-transaction-undo':{useTransactionUndo:()=>({record:null,busy:false,snapshot:()=>({record:null,busy:false})})},'../lib/display-date':{displayDate:v=>v},'../lib/backup':{backupCounts:()=>[]},
 '../services/backup-files':{savesToFolder:false,pickFinancialBackup:async()=>snapshots.old,saveFinancialBackup:async()=>true,shareFinancialBackup:async copy=>selectedExports.push(copy.id)},
 '../services/restore-safety':{findRestoreSafetyCopy:async before=>{const uri=before==='new'?'old':before==='old'?null:newest;return uri?{uri,createdAt:snapshots[uri].createdAt}:null;},readRestoreSafetyCopy:async uri=>snapshots[uri],saveRestoreSafetyCopy:async()=>{newest='new';return 'new'}},
 '../storage/backup':{createFinancialBackup:async()=>snapshots.new,financialSignature:()=> 'current',restoreFinancialBackup:async()=>{if(restoreFails)throw Error('injected database failure');}},
};
const mod={exports:{}};const js=ts.transpileModule(fs.readFileSync('src/app/backup.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+js+'})')(name=>{assert(name in mocks,name);return mocks[name]},mod,mod.exports);
const render=()=>{cursor=0;return mod.exports.default()};const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];const button=(t,title)=>nodes(t).find(n=>n.props?.title===title);const flush=()=>new Promise(r=>setImmediate(r));
async function click(title){const b=button(render(),title);assert(b,title);assert(!b.props.disabled,title+' is enabled');b.props.onPress();await flush();}
(async()=>{
 render();focus();await flush();
 assert(nodes(render()).some(n=>JSON.stringify(n.props?.children ?? null).includes('2026-11-26')&&JSON.stringify(n.props?.children ?? null).includes('00:00:00')),'Selected recovery copy has a persistent timestamp');
 await click('Export Previous Records');assert.deepEqual(selectedExports,['A']);
 await click('Choose Backup to Restore');const confirm=nodes(render()).find(n=>n.props?.label==='Type RESTORE to Confirm');confirm.props.onChangeText('RESTORE');
 await click('Replace Financial Records');assert(nodes(render()).some(n=>n.props?.children==='injected database failure'));
 await click('Older Recovery Copy');await click('Export Previous Records');assert.deepEqual(selectedExports,['A','A'],'Earlier successful-restore snapshot remains reachable after a failed attempt');
 await click('Older Recovery Copy');assert(nodes(render()).some(n=>n.props?.children==='There are no earlier recovery copies.'));
 await click('Newest Recovery Copy');await click('Export Previous Records');assert.equal(selectedExports.at(-1),'B');
 console.log('Recovery UI passed: failed restore error, older/newest selection, export targets and end-of-history retention.');
})().catch(e=>{console.error(e);process.exitCode=1});
