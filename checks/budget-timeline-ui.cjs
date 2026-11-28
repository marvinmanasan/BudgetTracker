const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./load-typescript.cjs').createLoader();
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
let slots=[],cursor=0,params={},pushes=[],writes=[],backs=0;
let today='2026-11-20';
const period={id:'p',title:'Payday',startDate:'2026-11-16',endDate:'2026-11-30',limitCentavos:300000};
const ledger={wallets:[],changes:[],transfers:[],transactions:[{id:'e',type:'expense',date:'2026-11-20',amountCentavos:85000}]};
let periodState={loaded:true,periods:[period],loading:false,error:'',reload:async()=>{}};
const mocks={
 '../hooks/use-bulsa-theme':{useBulsaTheme:()=>({colors:{}})},
 '../components/budget-calendar':{BudgetCalendar:'Calendar'},
 '../components/centered-popup':{CenteredPopup:'Popup'},
 '../hooks/use-current-date':{useCurrentDate:()=>today},
 react:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useCallback:f=>f,useRef:v=>({current:v})},
 'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View',BackHandler:{addEventListener:()=>({remove(){}})}},
 'expo-router':{useLocalSearchParams:()=>params,useRouter:()=>({push:x=>pushes.push(x),replace:x=>pushes.push(x),setParams:x=>params={...params,...x},back:()=>backs++}),useCanGoBack:()=>true,useFocusEffect(){}},
 '../hooks/use-budget-periods':{useBudgetPeriods:()=>periodState},
 '../hooks/use-ledger':{useLedger:()=>({data:ledger,loading:false,error:'',reload(){}}),useSaveAction:()=>({busy:false,error:'',run:async f=>{await f();return true;}})},
 '../storage/budget-periods':{saveBudgetPeriod:async(...x)=>writes.push(x)},
 '../lib/budget-periods':load('src/lib/budget-periods.ts'),
 '../lib/validation':{localDate:()=> '2026-11-20'},
 '../lib/display-date':load('src/lib/display-date.ts'),
 '../lib/money':load('src/lib/money.ts'),
 '../lib/form-money':{parseBalance:load('src/lib/form-money.ts').parseBalance,newRecordId:()=> 'new'},
 '../lib/editing':load('src/lib/editing.ts'),
};
for(const prefix of ['./','../components/']){
 mocks[prefix+'bulsa-form']={useUI:()=>({}),ReadState:'ReadState',BackButton:'Back',Field:'Field'};
 mocks[prefix+'bulsa-button']={BulsaButton:'Button'};
 mocks[prefix+'bulsa-screen']={BulsaScreen:'Screen'};
 mocks[prefix+'budget-period-card']={BudgetPeriodCard:'Period'};
 mocks[prefix+'monthly-limit-notice']={MonthlyLimitNotice:'Monthly'};
}
function read(file){const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInThisContext('(function(require,module,exports){'+js+'})')(k=>{if(!(k in mocks))throw Error(k);return mocks[k]},m,m.exports);return m.exports;}
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const text=t=>Array.isArray(t)?t.map(text).join(''):t&&typeof t==='object'?text(t.props?.children):typeof t==='string'?t:'';
const button=(tree,title)=>nodes(tree).find(n=>n.props?.title===title);
const card=read('src/components/budget-period-card.tsx').BudgetPeriodCard;
assert(text(card({period,data:ledger})).includes('₱2,150.00'));
button(card({period,data:ledger,compact:true}),'View Spending Plan').props.onPress();
assert.deepEqual(pushes.pop(),{pathname:'/budgets',params:{period:'p'}});
const preview=read('src/components/spending-plan-preview.tsx').SpendingPlanPreview;
assert.equal(preview({data:ledger,month:'2026-11',spent:85000}).type,'Period');
const overviewCard=preview({data:ledger,month:'2026-11',spent:85000});
assert(text(card(overviewCard.props)).includes('₱2,150.00'),'Overview and Budgets show the same range total');
const movedExpense={...ledger,transactions:[{...ledger.transactions[0],date:'2026-12-01'}]};
assert(text(card({period,data:movedExpense})).includes('₱3,000.00'),'Moving an expense outside the range updates remaining money');
assert(text(card({period,data:ledger})).includes('Left in This Plan₱2,150.00'));
assert(text(card({period:{...period,limitCentavos:85000},data:ledger})).includes('You have reached your spending limit'));
assert(text(card({period:{...period,limitCentavos:80000},data:ledger})).includes('₱50.00 over your limit'));
today='2026-11-15';
assert(text(card({period,data:ledger})).includes('Upcoming · 11-16-2026'));
assert(text(card({period,data:ledger})).includes('Spending Limit'));
assert(!text(card({period,data:ledger})).includes('left in this spending plan'));
assert.equal(preview({data:ledger,month:'2026-11',spent:85000}).type,'Monthly');
today='2026-12-01';
assert(text(card({period,data:ledger})).includes('Ended ·'));
assert(text(card({period,data:ledger})).includes('You spent ₱2,150.00 less than planned'));
assert(text(card({period:{...period,limitCentavos:85000},data:ledger})).includes('You spent exactly your limit'));
assert(text(card({period:{...period,limitCentavos:80000},data:ledger})).includes('You spent ₱50.00 over your limit'));
assert(text(card({period:{...period,limitCentavos:0},data:{...ledger,transactions:[]}})).includes('You spent exactly your limit'));
assert(text(card({period:{...period,limitCentavos:0},data:ledger})).includes('You spent ₱850.00 over your limit'));
assert.equal(preview({data:ledger,month:'2026-12',spent:0}).type,'Monthly');
today='2026-11-20';
assert(text(card({period:{...period,limitCentavos:0},data:{...ledger,transactions:[]}})).includes('You have reached your spending limit'));
assert(text(card({period:{...period,limitCentavos:0},data:ledger})).includes('₱850.00 over your limit'));

periodState={...periodState,periods:[]};assert.equal(preview({data:ledger,month:'2026-11',spent:85000}).type,'Monthly');
periodState={...periodState,error:'Read failed'};assert.equal(preview({data:ledger,month:'2026-11',spent:85000}).type,'ReadState');
periodState={loaded:true,periods:[period],loading:false,error:'',reload:async()=>{}};
const plans=read('src/components/budget-plans.tsx').BudgetPlans;
cursor=0;let tree=plans({data:ledger,children:'monthly content'});
assert(nodes(tree).some(n=>n.type==='Period'));
button(tree,'Switch Plan').props.onPress();cursor=0;
tree=plans({data:ledger,children:'monthly content'});
button(tree,'Monthly Plan').props.onPress();cursor=0;
tree=plans({data:ledger,children:'monthly content'});assert(text(tree).includes('monthly content'));
assert(button(tree,'Start a Plan for Other Dates'));
button(tree,'Switch Plan').props.onPress();cursor=0;
tree=plans({data:ledger,children:'monthly content'});
const savedPlan=nodes(tree).find(n=>n.props?.title?.startsWith('Payday ·'));
savedPlan.props.onPress();cursor=0;
tree=plans({data:ledger,children:'monthly content'});
assert(nodes(tree).some(n=>n.type==='Period'));
assert(!button(tree,'Close Plan List'),'Selecting a plan closes the list');
periodState={...periodState,periods:[]};cursor=0;
assert(!button(plans({data:ledger,children:'monthly content'}),'Switch Plan'));
periodState={...periodState,periods:[period]};
const customSetup=button(tree,'New Plan');
assert(customSetup?.props.secondary,'Custom setup should be quieter than the monthly setup');
customSetup.props.onPress();
assert.equal(pushes.pop(),'/budget-period');
params={};const route=read('src/app/budget-period.tsx').default;
let form=route();slots=[];cursor=0;
let newTree=form.type(form.props);
assert(!button(newTree,'Use a Monthly Plan'),'The custom editor must not offer a shortcut that discards a draft');
params={period:'p'};form=route();slots=[];
const render=()=>{cursor=0;return form.type(form.props);};
periodState={...periodState,loading:true};
assert.equal(route().type,form.type,'A source refresh must keep the existing draft form mounted');
periodState={...periodState,loading:false,error:'Read failed'};
assert.equal(route().type,form.type,'A failed source refresh must keep the existing draft form mounted');
periodState={...periodState,error:''};

tree=render();
const field=(tree,label)=>nodes(tree).find(n=>n.props?.label===label);
field(tree,'Start Date (MM-DD-YYYY)').props.onChangeText('02-30-2026');
tree=render();button(tree,'Review Spending Plan').props.onPress();tree=render();
assert(field(tree,'Start Date (MM-DD-YYYY)').props.issue.includes('doesn’t exist'));
field(tree,'Start Date (MM-DD-YYYY)').props.onChangeText('11-16-2026');
field(tree,'End Date (MM-DD-YYYY)').props.onChangeText('11-15-2026');
tree=render();button(tree,'Review Spending Plan').props.onPress();tree=render();
assert.equal(field(tree,'End Date (MM-DD-YYYY)').props.issue,'Choose 11-16-2026 or later.');
field(tree,'End Date (MM-DD-YYYY)').props.onChangeText('11-30-2026');
tree=render();
const originalProps=form.props;
form={...form,props:{...form.props,periods:[period,{...period,id:'other',title:'Trip',startDate:'2026-11-25',endDate:'2026-11-26'}]}};
button(tree,'Review Spending Plan').props.onPress();
tree=render();
// Re-prepare with the refreshed source so overlap checking uses the latest plans.
button(tree,'Change Details').props.onPress();tree=render();
button(tree,'Review Spending Plan').props.onPress();tree=render();
assert(field(tree,'End Date (MM-DD-YYYY)').props.issue.includes('Trip (11-25-2026 – 11-26-2026)'));
assert.equal(field(tree,'Plan Name').props.value,'Payday');
assert.equal(field(tree,'Spending Limit (PHP)').props.value,'3000.00');
form={...form,props:originalProps};
for(const endDate of ['11-16-2026','12-01-2026']){
 field(tree,'End Date (MM-DD-YYYY)').props.onChangeText(endDate);
 tree=render();button(tree,'Review Spending Plan').props.onPress();tree=render();
 assert(button(tree,'Save Spending Plan'),'Valid one-day and cross-month ranges reach review');
 button(tree,'Change Details').props.onPress();tree=render();
}
field(tree,'End Date (MM-DD-YYYY)').props.onChangeText('11-30-2026');tree=render();
field(tree,'Spending Limit (PHP)').props.onChangeText('800');
tree=render();button(tree,'Review Spending Plan').props.onPress();tree=render();
assert(text(tree).includes('₱50.00 over your limit'));
assert(text(tree).includes('11-16-2026 – 11-30-2026'));
assert(text(tree).includes('₱850.00 already spent during these dates'));
assert.equal(writes.length,0);
button(tree,'Change Details').props.onPress();tree=render();
assert.equal(field(tree,'Spending Limit (PHP)').props.value,'800');
assert.equal(field(tree,'Plan Name').props.value,'Payday');
assert.equal(field(tree,'Start Date (MM-DD-YYYY)').props.value,'11-16-2026');
assert.equal(field(tree,'End Date (MM-DD-YYYY)').props.value,'11-30-2026');
button(tree,'Cancel').props.onPress();
assert.equal(writes.length,0,'Cancel must not save the draft');
assert.equal(period.limitCentavos,300000,'Editing must preserve the original until Save');
backs=0;
for(const [amount,expected] of [
 ['850','You have reached your spending limit'],
 ['0','₱850.00 over your limit'],
 ['3000','₱2,150.00 left in this spending plan'],
]){
 field(tree,'Spending Limit (PHP)').props.onChangeText(amount);
 tree=render();button(tree,'Review Spending Plan').props.onPress();tree=render();
 assert(text(tree).includes(expected));
 button(tree,'Change Details').props.onPress();tree=render();
}
today='2026-12-01';
button(tree,'Review Spending Plan').props.onPress();tree=render();
assert(text(tree).includes('You spent ₱2,150.00 less than planned'));
today='2026-11-20';
tree=render();
button(tree,'Save Spending Plan').props.onPress();
setImmediate(()=>{
 assert.deepEqual(writes[0],[period,period]);assert.equal(backs,1);
 const deadline=read('src/components/savings-deadline.tsx').SavingsDeadline;
 assert(text(deadline({deadline:'2026-11-19',remaining:100})).includes('Target Date Passed'));
 assert(text(deadline({deadline:'2026-11-20',remaining:100})).includes('Target Date Today'));
 assert(text(deadline({deadline:'2026-11-19',remaining:0})).includes('Goal Reached'));
 assert.equal(deadline({remaining:100}),null);
 console.log('Timeline UI checks passed: shared totals, active/fallback/error, plan selection, review/save and deadline status.');
});
let calendar='2026-11-20',listener,timerCallback,cleanup,latest,removed=false;
let keyboardDismissed=0,chosenDate='';
mocks['react-native'].Keyboard={dismiss:()=>keyboardDismissed++};
mocks['@expo/ui/community/datetime-picker']={DateTimePicker:'NativeDatePicker'};
mocks['../hooks/use-bulsa-theme']={useBulsaTheme:()=>({dark:false,colors:{}})};
const calendarComponent=read('src/components/budget-calendar.android.tsx').BudgetCalendar;
const calendarProps={label:'Choose Start Date',value:'11-16-2026',disabled:false,onChange:value=>{chosenDate=value;}};
slots=[];
const renderCalendar=()=>{cursor=0;return calendarComponent(calendarProps);};
let calendarTree=renderCalendar();
nodes(calendarTree).find(n=>n.props?.accessibilityLabel==='Choose Start Date').props.onPress();
calendarTree=renderCalendar();
let nativePicker=nodes(calendarTree).find(n=>n.type==='NativeDatePicker');
assert.equal(nativePicker.props.value.getDate(),16);
nativePicker.props.onDismiss();
assert.equal(chosenDate,'','Cancel leaves the typed date intact');
assert(!nodes(renderCalendar()).some(n=>n.type==='NativeDatePicker'));
nodes(renderCalendar()).find(n=>n.props?.accessibilityLabel==='Choose Start Date').props.onPress();
nativePicker=nodes(renderCalendar()).find(n=>n.type==='NativeDatePicker');
const leapDay=new Date(2028,1,29,12);
nativePicker.props.onValueChange({},leapDay);
assert.equal(chosenDate,'02-29-2028','Selected calendar days use local date parts');
assert.equal(keyboardDismissed,2);
assert(!nodes(renderCalendar()).some(n=>n.type==='NativeDatePicker'));
const dateMocks={
 react:{useState:()=>[calendar,value=>{latest=value;}],useEffect:fn=>{cleanup=fn();}},
 'react-native':{AppState:{addEventListener:(_,fn)=>{listener=fn;return{remove(){removed=true;}};}}},
 '../lib/validation':{localDate:()=>calendar},
};
const hookModule={exports:{}};
const hookCode=ts.transpileModule(fs.readFileSync('src/hooks/use-current-date.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInThisContext('(function(require,module,exports,setTimeout,clearTimeout){'+hookCode+'})')(k=>dateMocks[k],hookModule,hookModule.exports,(fn,ms)=>{assert(ms>0&&ms<=90000000);timerCallback=fn;return 1;},()=>{});
assert.equal(hookModule.exports.useCurrentDate(),'2026-11-20');
calendar='2026-11-21';timerCallback();assert.equal(latest,calendar,'Foreground midnight updates date');
calendar='2026-11-23';listener('active');assert.equal(latest,calendar,'Resume updates date after multiple days');
cleanup();assert(removed);
console.log('Calendar rollover checks passed: foreground midnight, app resume and subscription cleanup.');
