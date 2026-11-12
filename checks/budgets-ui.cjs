const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {createLoader}=require('./load-typescript.cjs'),load=createLoader();
let state={data:{wallets:[],transactions:[],transfers:[],changes:[]},loading:false,error:'',reload:async()=>{}};
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const mocks={react:{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]},'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View'},'expo-router':{router:{push(){}}},
 '@/components/pocket-screen':{PocketScreen:'Screen'},'@/components/pocket-button':{PocketButton:'Button'},'@/components/bulsa-form':{Field:'Field',ReadState:'ReadState',useUI:()=>({})},
 '@/components/category-budget-panel':{CategoryBudgetPanel:'CategoryPanel'},'@/components/savings-preview':{SavingsPreview:'Savings'},'@/components/monthly-limit-history':{MonthlyLimitHistory:'History'},'@/components/monthly-limit-notice':{MonthlyLimitNotice:'Limit'},
 '@/hooks/use-ledger':{useLedger:()=>state},'@/lib/ledger':load('src/lib/ledger.ts'),'@/lib/validation':{localDate:()=> '2026-11-12'},'@/lib/display-date':load('src/lib/display-date.ts'),'@/lib/activity':load('src/lib/activity.ts'),
};
const result={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/app/(tabs)/budgets.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>mocks[name]??require(name),result,result.exports);
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const render=()=>nodes(result.exports.default());
assert(render().some(n=>n.type==='CategoryPanel'));
state={...state,error:'Read failed'};assert(!render().some(n=>n.type==='CategoryPanel'),'Do not show category spending as current when source ledger refresh failed');assert(render().some(n=>n.type==='ReadState'&&n.props.error==='Read failed'));
state={...state,error:'',loading:true};assert(!render().some(n=>n.type==='CategoryPanel'),'Hide stale category spending during source reload');
console.log('Budgets boundary checks passed: source loading/errors do not show stale category spending as current. Native rendering not covered.');
