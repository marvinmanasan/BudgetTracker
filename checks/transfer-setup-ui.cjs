const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./load-typescript.cjs').createLoader();const {deriveBalances}=load('src/lib/ledger.ts');
let slots=[],cursor=0,routes=[],written=[],loading=false,readError='';
let ledger={wallets:[{id:'mari',name:'MariBank',included:true,hidden:false},{id:'go',name:'GoTyme',included:true,hidden:false}],transactions:[],transfers:[],changes:[{id:'open-mari',walletId:'mari',kind:'opening',deltaCentavos:100000,date:'2026-11-13',reason:'Starting balance',targetCentavos:null}]};
const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
const mocks={react:{useCallback:f=>f,useState(x){let i=cursor++;if(!(i in slots))slots[i]=typeof x==='function'?x():x;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];}},'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View',Pressable:'WalletRow',BackHandler:{addEventListener:()=>({remove(){}})}},'expo-router':{useRouter:()=>({push:r=>routes.push(r),replace:r=>routes.push(r)}),useFocusEffect(){}},'../components/centered-popup':{CenteredPopup:'Popup'},'../components/bulsa-screen':{BulsaScreen:'Screen'},'../components/bulsa-button':{BulsaButton:'Button'},'../components/bulsa-form':{BackButton:'Back',Field:'Field',ReadState:'Read',useUI:()=>({})},'../components/money-review':{MoneyReview:'Money'},'../hooks/use-bulsa-theme':{useBulsaTheme:()=>({colors:{track:'#777',accent:'#aaa'}})},'../hooks/use-ledger':{useLedger:()=>({data:ledger,balances:deriveBalances(ledger),loading,error:readError,reload:async()=>{}}),useSaveAction:()=>({busy:false,error:'',run:async f=>{await f();return true;}})},'../storage/wallets':{recordTransfer:async r=>written.push(r)}};
for(const n of ['transfers','form-money','money','display-date','validation'])mocks['../lib/'+n]=load('src/lib/'+n+'.ts');
const m={exports:{}};const c=ts.transpileModule(fs.readFileSync('src/app/transfer.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInThisContext('(function(require,module,exports){'+c+'})')(n=>{assert(n in mocks,n);return mocks[n]},m,m.exports);
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];const render=()=>{cursor=0;return m.exports.default();};const button=(t,title)=>nodes(t).find(n=>(n.type==='Button'&&n.props.title===title)||(n.type==='WalletRow'&&n.props.accessibilityLabel===title));const field=(t,label)=>nodes(t).find(n=>n.type==='Field'&&n.props.label===label);
const entrySource = fs.readFileSync('src/components/entry-form.tsx', 'utf8');
const entryMocks = {
  ...mocks,
  './bulsa-form': mocks['../components/bulsa-form'],
  './bulsa-screen': mocks['../components/bulsa-screen'],
  './bulsa-button': mocks['../components/bulsa-button'],
  './category-picker': { CategoryPicker: 'Category' },
  './monthly-limit-notice': { MonthlyLimitNotice: 'Limit' },
  './centered-popup': mocks['../components/centered-popup'],
  './money-review': mocks['../components/money-review'],
  '../storage/transactions': { saveTransaction: async row => written.push(row) },
};
for (const name of ['expense-wallets', 'editing', 'ledger']) entryMocks['../lib/'+name] = load('src/lib/'+name+'.ts');
const entryModule = { exports: {} };
const compiled = ts.transpileModule(entrySource, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+compiled+'})')(name => entryMocks[name], entryModule, entryModule.exports);
async function checkIncomeSetup() {
  slots = []; written = [];
  ledger = { wallets: [{ id:'cash', name:'Cash', included:true, hidden:false }], changes:[], transactions:[], transfers:[] };
  function form() {
    cursor = 0;
    return entryModule.exports.EntryFields({initialType:'income',ledger:entryMocks['../hooks/use-ledger'].useLedger()});
  }
  let tree = form();
  field(tree,'Amount (PHP)').props.onChangeText('200.50');
  field(tree,'Date (MM-DD-YYYY)').props.onChangeText('11-13-2026');
  nodes(tree).find(n => n.type === 'Category').props.onChange('Bonus');
  button(tree,'More Details · Optional').props.onPress();
  field(form(),'Note · Optional').props.onChangeText('My Note');
  button(form(),'Wallet: General  ›').props.onPress();
  const setup = () => nodes(form()).find(n => n.props.accessibilityRole === 'radio' && nodes(n).some(t => t.props.children?.[0] === 'Set Up Cash'));
  setup().props.onPress();
  assert.deepEqual(routes.at(-1), {pathname:'/wallets/[id]',params:{id:'cash',setup:'entry'}});
  ledger = {...ledger}; // A canceled setup returns with no opening.
  form();
  setup().props.onPress();
  ledger = {...ledger,changes:[{walletId:'cash',kind:'opening',deltaCentavos:0,date:'2026-11-13',id:'open-cash'}]};
  form(); tree = form();
  assert(button(tree,'Wallet: Cash  ›'));
  assert.equal(written.length,0);
  assert.equal(field(tree,'Amount (PHP)').props.value,'200.50');
  assert.equal(field(tree,'Note · Optional').props.value,'My Note');
  button(tree,'Save Income').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(written.length,1);
  assert.deepEqual([written[0].walletId,written[0].amountCentavos,written[0].date,written[0].category,written[0].note],
    ['cash',20050,'2026-11-13','Bonus','My Note']);
  console.log('Income setup return passed with cancellation, zero opening, draft retention and one save.');
}
(async()=>{
 ledger={...ledger,wallets:[...ledger.wallets].reverse()};
 let t=render();assert(field(t,'Amount (PHP)'),'One configured source must not block the whole transfer form');
 field(t,'Amount (PHP)').props.onChangeText('250');button(t,'From: Choose Wallet').props.onPress();t=render();assert.equal(nodes(t).find(n=>n.type==='WalletRow').props.accessibilityLabel,'Set Up GoTyme','Transfer retains wallet order even when the first wallet needs setup');button(t,'MariBank').props.onPress();t=render();button(t,'To: Choose Wallet').props.onPress();t=render();
 assert.equal(t.key,'to','Picker remounts its scroll view independently of the form');assert(nodes(t).filter(n=>n.type==='Text'&&String(n.props.children).includes('If it was empty')).length<=1,'Setup explanation is not repeated per wallet');assert(!button(t,'MariBank'),'Destination excludes its own source');button(t,'Set Up GoTyme').props.onPress();assert.deepEqual(routes.at(-1),{pathname:'/wallets/[id]',params:{id:'go'}});assert.equal(written.length,0,'Opening setup never fabricates a transfer or balance');
 ledger={...ledger,changes:[...ledger.changes,{id:'open-go',walletId:'go',kind:'opening',deltaCentavos:0,date:'2026-11-13',reason:'Starting balance',targetCentavos:null}]};t=render();assert.equal(button(t,'GoTyme').props.disabled,false,'A zero-balance destination can receive money');button(t,'GoTyme').props.onPress();t=render();assert.equal(field(t,'Amount (PHP)').props.value,'250','Wallet setup return retains draft amount');button(t,'Review Transfer').props.onPress();t=render();let money=nodes(t).find(n=>n.type==='Money');assert.equal(money.props.after.wallets.find(w=>w.id==='mari').balanceCentavos,75000);assert.equal(money.props.after.wallets.find(w=>w.id==='go').balanceCentavos,25000);assert.equal(money.props.after.totalCentavos,100000);assert.equal(written.length,0,'Review must not save');
 button(t,'Keep Editing').props.onPress();t=render();button(t,'From: MariBank').props.onPress();t=render();assert(!button(t,'GoTyme'),'Source picker excludes selected destination');loading=true;t=render();assert(nodes(t).some(n=>n.type==='Read'));assert(!button(t,'MariBank'),'Loading picker cannot offer stale wallets');loading=false;
 slots=[];t=render();button(t,'From: Choose Wallet').props.onPress();t=render();assert.equal(button(t,'GoTyme').props.disabled,true,'Zero balance cannot fund a transfer');t.props.header.props.onPress();t=render();button(t,'To: Choose Wallet').props.onPress();t=render();assert.equal(button(t,'GoTyme').props.disabled,false,'Zero balance can receive a transfer');
 await checkIncomeSetup();
 console.log('Transfer setup UI passed: one configured source, inline setup navigation, zero destination, retained draft, MariBank250→GoTyme exact review, no premature write, distinct wallets and loading guard.');
})().catch(e=>{console.error(e);process.exitCode=1});
