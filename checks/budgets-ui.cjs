const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {createLoader}=require('./load-typescript.cjs'),load=createLoader();
let state={data:{wallets:[],transactions:[],transfers:[],changes:[]},loading:false,error:'',reload:async()=>{}};
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const mocks={react:{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]},'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View'},'expo-router':{router:{push(){}}},
 '@/components/bulsa-screen':{BulsaScreen:'Screen'},'@/components/bulsa-button':{BulsaButton:'Button'},'@/components/bulsa-form':{Field:'Field',ReadState:'ReadState',useUI:()=>({})},
 '@/components/category-budget-panel':{CategoryBudgetPanel:'CategoryPanel'},'@/components/period-summary':{PeriodSummary:'PeriodSummary'},'@/components/savings-preview':{SavingsPreview:'Savings'},'@/components/monthly-limit-history':{MonthlyLimitHistory:'History'},'@/components/monthly-limit-notice':{MonthlyLimitNotice:'Limit'},
 '@/hooks/use-ledger':{useLedger:()=>state},'@/lib/ledger':load('src/lib/ledger.ts'),'@/lib/validation':{localDate:()=> '2026-11-12'},'@/lib/display-date':load('src/lib/display-date.ts'),'@/lib/activity':load('src/lib/activity.ts'),
};
mocks['@/components/month-picker'] = {MonthPicker:'MonthPicker'};
mocks['@/components/budget-plans']={BudgetPlans:'BudgetPlans'};
const result={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/app/(tabs)/budgets.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>mocks[name]??require(name),result,result.exports);
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const render=()=>nodes(result.exports.default());
assert(render().some(n=>n.type==='CategoryPanel'));
state={...state,error:'Read failed'};assert(!render().some(n=>n.type==='CategoryPanel'),'Do not show category spending as current when source ledger refresh failed');assert(render().some(n=>n.type==='ReadState'&&n.props.error==='Read failed'));
state={...state,error:'',loading:true};assert(!render().some(n=>n.type==='CategoryPanel'),'Hide stale category spending during source reload');
console.log('Budgets boundary checks passed: source loading/errors do not show stale category spending as current. Native rendering not covered.');
const pushes=[];
let limitState={value:null,loading:false,error:'',reload:async()=>{}};
const componentMocks={
 react:{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]},
 'react/jsx-runtime':jsx,
 'react-native':{Text:'Text',View:'View',Pressable:'Pressable'},
 'expo-router':{useRouter:()=>({push:route=>pushes.push(route)})},
 '../hooks/use-monthly-limit':{useMonthlyLimit:()=>limitState},
 '../lib/money':load('src/lib/money.ts'),
 '../lib/display-date':load('src/lib/display-date.ts'),
 '../lib/validation':{localDate:()=> '2026-11-15'},
 './bulsa-button':{BulsaButton:'Button'},
 './bulsa-form':{useUI:()=>({}),ReadState:'ReadState'},
};
function component(path,name,props){
 const module={exports:{}};
 const output=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext('(function(require,module,exports){'+output+'})')(key=>componentMocks[key]??require(key),module,module.exports);
 return module.exports[name](props);
}
function texts(tree){
 if(Array.isArray(tree)) return tree.map(texts).join('');
 if(tree&&typeof tree==='object') return texts(tree.props?.children);
 return typeof tree==='string'||typeof tree==='number'?String(tree):'';
}
const notice=props=>component('src/components/monthly-limit-notice.tsx','MonthlyLimitNotice',{month:'2026-12',spent:180000,budgetSummary:true,...props});
assert(texts(notice()).includes('₱1,800.00 spent so far'));
assert(texts(notice()).includes('A spending limit helps you track what you spend. Your wallet balance stays the same.'));
nodes(notice()).find(n=>n.props?.title==='Set Monthly Limit').props.onPress();
assert.deepEqual(pushes.pop(),{pathname:'/monthly-limit',params:{month:'2026-12'}});
assert(nodes(notice()).some(n=>n.type==='Button'&&n.props.title==='Set Monthly Limit'&&n.props.secondary===false));
for(const [value,spent,expected] of [[500000,180000,'₱3,200.00 left'],[0,0,'At Your Limit'],[0,100,'₱1.00 Over Limit'],[500000,500000,'At Your Limit']]){
 limitState={...limitState,value};
 assert(texts(notice({spent})).includes(expected));
}
nodes(notice()).find(n=>n.type==='Button').props.onPress();
assert.deepEqual(pushes.pop(),{pathname:'/monthly-limit',params:{month:'2026-12'}});
limitState={...limitState,loading:true};
assert(!texts(notice()).includes('Over Limit'));
assert(!nodes(notice()).some(n=>n.type==='Button'));
limitState={...limitState,loading:false,error:'Read failed'};
assert(texts(notice()).includes('Read failed'));
assert(!texts(notice()).includes('spent of'));
limitState={value:500000,loading:false,error:'',reload:async()=>{}};
assert(texts(notice({budgetSummary:false,projected:510000})).includes('After Saving'));
assert(texts(notice({budgetSummary:false,compact:true})).includes('Left to Spend'));
const picker=(value,compact=true,allowAll=false)=>component('src/components/month-picker.tsx','MonthPicker',{value,compact,allowAll,onChange:value=>pushes.push(value)});
assert(!nodes(picker('2026-11')).some(n=>n.props?.title==='Back to This Month'));
const december=picker('2026-12');
assert(nodes(december).some(n=>n.props?.accessibilityLabel==='Choose Month, December 2026'));
nodes(december).find(n=>n.props?.title==='Back to This Month').props.onPress();
assert.equal(pushes.pop(),'2026-11');
assert(nodes(picker('',false,true)).some(n=>n.props?.title==='All Months'));
console.log('Batch 1 summary and month navigation checks passed.');
let historySlots=[],historyCursor=0;
componentMocks.react={
 useState(initial){const i=historyCursor++;if(!(i in historySlots))historySlots[i]=typeof initial==='function'?initial():initial;return [historySlots[i],v=>historySlots[i]=typeof v==='function'?v(historySlots[i]):v];},
 useRef:value=>({current:value}),useCallback:fn=>fn,
};
componentMocks['expo-router'].useFocusEffect=()=>{};
componentMocks['../storage/budgets']={getMonthlyLimits:async()=>[]};
const history=()=>{historyCursor=0;return component('src/components/monthly-limit-history.tsx','MonthlyLimitHistory',{});};
historySlots=[false,[],false,''];
assert.equal(history(),null,'Empty history has no competing action');
historySlots=[false,[{month:'2026-10',limitCentavos:10000}],false,''];
let h=history();
assert(!texts(h).includes('October 2026'),'Saved rows stay collapsed initially');
nodes(h).find(n=>n.props?.title==='Monthly Limit History').props.onPress();
h=history();
nodes(h).find(n=>n.props?.title==='Edit October 2026').props.onPress();
assert.deepEqual(pushes.pop(),{pathname:'/monthly-limit',params:{month:'2026-10'}});
historySlots=[true,historySlots[1],false,'History read failed'];
assert.equal(history().type,'ReadState','Failed refresh hides stale history');
componentMocks['../hooks/use-bulsa-theme']={useBulsaTheme:()=>({colors:{}})};
componentMocks['./savings-deadline']={SavingsDeadline:'Deadline'};
let savings={data:{goals:[],contributions:[]},loading:false,error:'',reload:async()=>{}};
componentMocks['../hooks/use-savings']={useSavings:()=>savings};
componentMocks['../lib/savings-summary']=load('src/lib/savings-summary.ts');
const savingsLink=()=>component('src/components/savings-preview.tsx','SavingsPreview',{compact:true});
let link=savingsLink();assert.equal(link.props.title,'Set Savings Goal');link.props.onPress();assert.equal(pushes.pop(),'/savings-goal');
savings.data.goals=[{id:'main',title:'Trip',targetCentavos:10000}];
link=savingsLink();assert.equal(link.props.title,'View Savings');link.props.onPress();assert.equal(pushes.pop(),'/savings');
savings.error='Read failed';assert.equal(savingsLink().type,'ReadState');
componentMocks.react.useMemo=fn=>fn();
let categoryState={plan:{limitCentavos:10000,allocations:[]},loading:false,error:'',reload:async()=>{}};
componentMocks['../hooks/use-category-plan']={useCategoryPlan:()=>categoryState};
componentMocks['../lib/category-budgets']=load('src/lib/category-budgets.ts');
const panel=()=>component('src/components/category-budget-panel.tsx','CategoryBudgetPanel',{data:{transactions:[],wallets:[],changes:[],transfers:[]},month:'2026-12'});
let c=panel(),cn=nodes(c);
assert(cn.findIndex(n=>n.props?.title==='Set Category Limits')<cn.findIndex(n=>n.props?.children==='Everything Else'));
cn.find(n=>n.props?.title==='Set Category Limits').props.onPress();
assert.deepEqual(pushes.pop(),{pathname:'/category-limits',params:{month:'2026-12'}});
categoryState.plan.allocations=[{category:'Food',limitCentavos:6000}];
assert(nodes(panel()).some(n=>n.props?.title==='Edit Category Limits'));
categoryState.error='Read failed';assert(!nodes(panel()).some(n=>n.type==='Button'));
console.log('Batch 2 passed: history visibility/expansion/error, category action placement and Savings destinations.');

let categoryScans=0;
const realCategorySummary=componentMocks['../lib/category-budgets'].categoryBudgetSummary;
componentMocks['../lib/category-budgets']={categoryBudgetSummary(...args){categoryScans++;return realCategorySummary(...args);}};
categoryState.error='';categoryState.loading=true;panel();assert.equal(categoryScans,0,'Do not calculate hidden stale category results while loading a month');
categoryState.loading=false;panel();assert.equal(categoryScans,1,'Loaded category results still calculate');
