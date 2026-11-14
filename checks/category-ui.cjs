const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
let state = { resolved:'2026-11', plan:{limitCentavos:null,allocations:[],signature:'[null,[]]'}, loading:false,error:'',reload:async()=>{} };
const jsx = {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const mocks = {
 'react/jsx-runtime':jsx, 'react-native':{Text:'Text'},
 'expo-router':{useLocalSearchParams:()=>({month:'2026-11'}),useRouter:()=>({push(){}})},
 '../components/bulsa-screen':{BulsaScreen:'Screen'}, '../components/bulsa-button':{BulsaButton:'Button'},
 '../components/bulsa-form':{BackButton:'Back',ReadState:'ReadState',useUI:()=>({})},
 '../components/category-limit-form':{CategoryLimitForm:'Editor'},
 '../hooks/use-category-plan':{useCategoryPlan:()=>state}, '../lib/validation':{localDate:()=> '2026-11-12'},
};
const result={exports:{}};
const code=ts.transpileModule(fs.readFileSync('src/app/category-limits.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>mocks[name]??require(name),result,result.exports);
const screen=result.exports.default;
assert.notEqual(screen().type,'Editor','Do not freeze a missing limit inside the draft editor');
state={...state,plan:{limitCentavos:10000,allocations:[],signature:'[10000,[]]'}};
assert.equal(screen().type,'Editor','Returning from monthly setup opens category editor');
state={...state,loading:true};assert.equal(screen().type,'Editor','Focus refresh keeps existing draft mounted');
state={...state,loading:false,error:'Read failed'};assert.equal(screen().type,'Editor','Retry keeps existing draft mounted');
assert.equal(screen().props.sourceError,'Read failed');
console.log('Category route checks passed: no-limit setup return and draft-preserving refresh/error. Native rendering not covered.');
async function categorySaveChecks(){
 let slots=[],cursor=0,writes=[],back=0;
 const nativeMocks={
  'react/jsx-runtime':jsx,
  react:{useState(x){const i=cursor++;if(!(i in slots))slots[i]=typeof x==='function'?x():x;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:x=>({current:x}),useEffect(){},useCallback:f=>f},
  'react-native':{Text:'Text',View:'View'},
  'expo-router':{useRouter:()=>({back(){back++;}}),useFocusEffect(){}},
  '../storage/choices':{getChoices:async()=>[]},
  '../storage/categories':{saveCategoryAllocations:async(...args)=>writes.push(args)},
  '../hooks/use-ledger':{useLedger:()=>({data:null}),useSaveAction:()=>({busy:false,error:'',run:async fn=>{await fn();return true;}})},
  './bulsa-screen':{BulsaScreen:'Screen'},'./bulsa-button':{BulsaButton:'Button'},'./bulsa-form':{BackButton:'Back',Field:'Field',useUI:()=>({})},
 };
 const load=require('./load-typescript.cjs').createLoader();
 for(const lib of ['choices','editing','form-money','money','display-date'])nativeMocks['../lib/'+lib]=load('src/lib/'+lib+'.ts');
 const m={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync('src/components/category-limit-form.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext('(function(require,module,exports){'+compiled+'})')(n=>{assert(n in nativeMocks,n);return nativeMocks[n]},m,m.exports);
 const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
 const button=(t,title)=>nodes(t).find(n=>n.type==='Button'&&n.props.title===title);
 function render(allocations=[]){cursor=0;return m.exports.CategoryLimitForm({month:'2026-11',initial:{limitCentavos:10000,allocations,signature:'original'},sourceError:'',sourceLoading:false,retry(){}});}
 let t=render();button(t,'Food').props.onPress();t=render();nodes(t).find(n=>n.type==='Field').props.onChangeText('60');button(render(),'Save Category Limit').props.onPress();
 await new Promise(r=>setImmediate(r));
 assert.deepEqual(writes[0],['2026-11',[{category:'Food',limitCentavos:6000}],'bulsa.db','original']);
 assert.equal(back,1,'One save persists and exits');
 slots=[];t=render([{category:'Food',limitCentavos:7000}]);button(t,'Transport').props.onPress();t=render();nodes(t).find(n=>n.type==='Field').props.onChangeText('31');button(render(),'Save Category Limit').props.onPress();
 await new Promise(r=>setImmediate(r));assert.equal(writes.length,1,'Over-allocation creates no write');
 assert(nodes(render()).some(n=>n.type==='Text'&&n.props.children==='Category limits cannot exceed the monthly limit.'));
 console.log('Category editor passed: one-action save, signature retained and over-allocation rejected before writing.');
}
categorySaveChecks().catch(e=>{console.error(e);process.exitCode=1;});
