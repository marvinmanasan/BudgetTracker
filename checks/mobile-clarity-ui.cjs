const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./load-typescript.cjs').createLoader();
let slots=[],cursor=0,writes=[],back=0;
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next];},useCallback:f=>f,useMemo:f=>f()};
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const data={wallets:[{id:'cash',name:'Cash',included:true,hidden:false}],transactions:[],transfers:[],changes:[{id:'opening',walletId:'cash',kind:'opening',deltaCentavos:50000,date:'2026-11-01',reason:'',targetCentavos:null}]};
const mocks={react,'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View',ScrollView:'Scroll',Pressable:'Pressable',useWindowDimensions:()=>({width:390,fontScale:1}),BackHandler:{addEventListener:()=>({remove(){}})}},'expo-router':{useRouter:()=>({back(){back++},push(){}}),useFocusEffect(){}},'../hooks/use-current-date':{useCurrentDate:()=> '2026-11-27'},'../hooks/use-ledger':{useLedger:()=>({data,balances:load('src/lib/ledger.ts').deriveBalances(data),loading:false,error:''}),useSaveAction:()=>({busy:false,error:'',run:async f=>{await f();return true;}})},'../storage/total-budget':{setTotalBudget:async(...args)=>writes.push(args)}};
for(const prefix of ['./','../components/']){
 mocks[prefix+'bulsa-screen']={BulsaScreen:'Screen'};mocks[prefix+'bulsa-button']={BulsaButton:'Button'};mocks[prefix+'bulsa-form']={useUI:()=>({}),BackButton:'Back',Field:'Field'};mocks[prefix+'centered-popup']={CenteredPopup:'Popup'};mocks[prefix+'money-review']={MoneyReview:'Money'};
}
for(const name of ['total-budget','money','form-money','validation','display-date','spending-statistics'])mocks['../lib/'+name]=load('src/lib/'+name+'.ts');
function component(path,name){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'})')(n=>{assert(n in mocks,n);return mocks[n]},m,m.exports);return (...args)=>{cursor=0;return m.exports[name](...args)}}
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children),...nodes(t.props?.footer)]:[];
const button=(t,title)=>nodes(t).find(n=>(n.type==='Button'&&n.props.title===title)||n.props.accessibilityLabel===title);
const field=(t,label)=>nodes(t).find(n=>n.type==='Field'&&n.props.label===label);
const edit=component('src/app/edit-total-budget.tsx','default');
(async()=>{
 for(const [mode,label,input,expected] of [['Add Amount','Amount to Add (PHP)','200',70000],['Subtract Amount','Amount to Subtract (PHP)','200',30000],['Set Exact Balance','New Total Budget (PHP)','0',0]]){
  slots=[];button(edit(),mode).props.onPress();field(edit(),label).props.onChangeText(input);field(edit(),'Reason').props.onChangeText('Correction');button(edit(),'Cash').props.onPress();button(edit(),'Review Change').props.onPress();let t=edit();const money=nodes(t).find(n=>n.type==='Money');assert.equal(money.props.after.totalCentavos,expected);const before=writes.length;button(t,'Keep Editing').props.onPress();assert.equal(writes.length,before);assert.equal(field(edit(),label).props.value,input);button(edit(),'Review Change').props.onPress();await button(edit(),'Confirm Adjustment').props.onPress();assert.equal(writes.at(-1)[0].targetCentavos,expected);assert.equal(writes.at(-1)[1],JSON.stringify(data));
 }
 slots=[];
 mocks['./summary-card']={SummaryCard:'Summary'};mocks['../hooks/use-bulsa-theme']={useBulsaTheme:()=>({colors:{accent:'#8A533A',onAccent:'#fff',soft:'#F2E4D4',text:'#382D29'}})};
 const stats=component('src/components/period-summary.tsx','PeriodSummary');
 const render=()=>stats({data});
 const text=t=>nodes(t).filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
 assert(text(render()).includes('Today'));assert.equal(nodes(render()).filter(n=>n.type==='Summary').length,2,'One income/expense pair replaces the monthly summary');assert(!button(render(),'View All Statistics'));assert(button(render(),'Day').props.accessibilityState.checked);button(render(),'Week').props.onPress();assert(button(render(),'Week').props.accessibilityState.checked);assert(text(render()).includes('November 23–29, 2026'));button(render(),'Previous Week').props.onPress();assert(text(render()).includes('November 16–22, 2026'));button(render(),'Back to Today').props.onPress();assert(text(render()).includes('November 23–29, 2026'));button(render(),'Year').props.onPress();assert(text(render()).includes('January 1 – December 31, 2026'));
 console.log('Clarity UI passed: reviewed add/subtract/exact payloads, cancel retention, default daily statistics and period navigation.');
})().catch(e=>{console.error(e);process.exitCode=1});
