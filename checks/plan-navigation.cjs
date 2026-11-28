const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./load-typescript.cjs').createLoader();
let slots=[],cursor=0,backs=0,hardware,busy=false,writes=0,saveWork=async()=>{};
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(v){const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i];},useCallback:f=>f};
const mocks={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
 'react-native':{Text:'Text',View:'View',BackHandler:{addEventListener:(name,f)=>{hardware=f;return{remove(){}}}}},
 'expo-router':{useCanGoBack:()=>true,useLocalSearchParams:()=>({}),useRouter:()=>({back:()=>backs++,replace:()=>backs++}),useFocusEffect:f=>f()},
 '../components/bulsa-screen':{BulsaScreen:'Screen'},'../components/bulsa-form':{useUI:()=>({}),BackButton:'Back',Field:'Field',ReadState:'ReadState'},'../components/bulsa-button':{BulsaButton:'Button'},'../components/budget-calendar':{BudgetCalendar:'Calendar'},'../components/centered-popup':{CenteredPopup:'Popup'},
 '../hooks/use-current-date':{useCurrentDate:()=> '2026-11-27'},'../hooks/use-budget-periods':{useBudgetPeriods:()=>({loaded:true,periods:[],loading:false,error:''})},
 '../hooks/use-ledger':{useLedger:()=>({data:{transactions:[]},loading:false,error:''}),useSaveAction:()=>({busy,error:'',run:async work=>{await saveWork();await work();return true;}})},
 '../storage/budget-periods':{saveBudgetPeriod:async()=>writes++,deleteBudgetPeriod:async()=>writes++},
};
for(const file of ['budget-periods','validation','display-date','money','form-money','editing'])mocks['../lib/'+file]=load('src/lib/'+file+'.ts');
const moduleResult={exports:{}};
const js=ts.transpileModule(fs.readFileSync('src/app/budget-period.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+js+'})')(name=>{assert(name in mocks,name);return mocks[name]},moduleResult,moduleResult.exports);
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const button=(t,title)=>nodes(t).find(n=>n.props?.title===title);
const field=(t,label)=>nodes(t).find(n=>n.props?.label===label);
let form;const render=()=>{cursor=0;return form.type(form.props)};
function start(original){slots=[];form=moduleResult.exports.default();if(original)form.props={...form.props,original};return render();}
(async()=>{
 let tree=start();assert.equal(typeof tree.props.header.props.onPress,'function','Header Back must share the guarded leave action');
 tree.props.header.props.onPress();assert.equal(backs,1,'Clean form exits directly');
 tree=start();field(tree,'Plan Name').props.onChangeText('QA draft');field(tree,'Spending Limit (PHP)').props.onChangeText('100');tree=render();
 assert.equal(field(tree,'Plan Name').props.maxLength,80);
 button(tree,'Review Spending Plan').props.onPress();tree=render();
 tree.props.header.props.onPress();tree=render();assert(field(tree,'Plan Name'),'Review Back returns to editing');assert.equal(field(tree,'Plan Name').props.value,'QA draft');assert.equal(backs,1);
 assert.equal(hardware(),true);tree=render();assert(button(tree,'Keep Editing'),'Dirty hardware Back asks before discarding');
 nodes(tree).find(n=>n.type==='Popup').props.onClose();tree=render();assert(!button(tree,'Discard Changes'),'Modal dismissal keeps the draft');
 assert.equal(field(tree,'Spending Limit (PHP)').props.value,'100');
 tree.props.header.props.onPress();tree=render();button(tree,'Keep Editing').props.onPress();tree=render();
 button(tree,'Cancel').props.onPress();tree=render();button(tree,'Discard Changes').props.onPress();assert.equal(backs,2);
 tree=start();field(tree,'Plan Name').props.onChangeText('x'.repeat(81));field(tree,'Spending Limit (PHP)').props.onChangeText('1');tree=render();button(tree,'Review Spending Plan').props.onPress();tree=render();assert(!button(tree,'Save Spending Plan'),'Overlong pasted draft cannot reach save');
 tree=start({id:'old',title:'Old plan',startDate:'2026-11-27',endDate:'2026-11-28',limitCentavos:100});
 button(tree,'Delete Plan').props.onPress();tree=render();assert(button(tree,'Keep Plan'));hardware();tree=render();assert(field(tree,'Plan Name'),'Back closes delete confirmation');
 tree=start();field(tree,'Spending Limit (PHP)').props.onChangeText('10');tree=render();button(tree,'Review Spending Plan').props.onPress();tree=render();hardware();tree=render();assert(field(tree,'Plan Name'),'Hardware Back also closes review');
 button(tree,'Review Spending Plan').props.onPress();tree=render();let release;saveWork=()=>new Promise(resolve=>release=resolve);
 const saving=button(tree,'Save Spending Plan').props.onPress();const before=backs;hardware();assert.equal(backs,before,'Synchronous write lock blocks Back before busy rerender');release();await saving;await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,1);
 busy=true;tree=start();hardware();assert.equal(backs,before+1,'Busy form cannot leave');
 console.log('Plan navigation passed: clean/dirty Back, review retention, discard, delete Back, text limit and immediate save guard.');
})().catch(e=>{console.error(e);process.exitCode=1});
