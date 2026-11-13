const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
let nav=[],slots=[],cursor=0;
let onFocus;
const scopedRouter = { push: path => nav.push(path) };
const Tabs=Object.assign(()=>{}, {Screen:'Tab'}),Stack=Object.assign(()=>{}, {Screen:'StackScreen'});
const mocks={
 'react/jsx-runtime':jsx,react:{useCallback:fn=>fn,useRef(value){const i=cursor++;return slots[i]??={current:value};},useState(x){let i=cursor++;if(!(i in slots))slots[i]=typeof x==='function'?x():x;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];}},
 'expo-router':{Tabs,Stack,router:{push(){throw Error('The imperative router is unavailable before the first render has finished.');}},useRouter:()=>scopedRouter,useFocusEffect(fn){onFocus=fn;},useLocalSearchParams:()=>({})},
 'react-native':{Text:'Text',View:'View',Pressable:'Pressable',Switch:'Switch',StyleSheet:{create:x=>x}},
 'expo-image':{Image:'Image'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:0})},
 'hooks/use-bulsa-theme':{useBulsaTheme:()=>({colors:{},dark:false}),useBulsaStyles:()=>({})},
 'components/bulsa-form':{BackButton:'Back',ReadState:'Read',useUI:()=>({})},'components/bulsa-button':{BulsaButton:'Button'},'components/bulsa-screen':{BulsaScreen:'Screen'},
 'hooks/use-ledger':{useLedger:()=>({balances:{wallets:[],totalCentavos:0,generalCentavos:0},loading:false,reload:async()=>{}}),useSaveAction:()=>({busy:false,run:fn=>fn()})},
 'lib/money':{formatCentavos:()=> '₱0.00'},'storage/wallets':{setWalletFlags:async()=>{}},
};
function load(p){let m={exports:{}};let c=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInThisContext('(function(require,module,exports){'+c+'})')(n=>{if(n.endsWith('.svg'))return n;const key=n.replace(/^(@\/|(\.\.\/)+|\.\/)/,'');assert(n in mocks||key in mocks,n);return mocks[n]??mocks[key]},m,m.exports);return m.exports;}
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const tabs=load('src/components/bulsa-tabs.tsx').default();
assert.deepEqual(nodes(tabs).filter(n=>n.type==='Tab').map(n=>n.props.options.title),['Overview','Wallets','Budgets','Activity']);
const file='src/app/(tabs)/wallets.tsx';
const Wallets=load(file).default;let tree=Wallets();assert.equal(tree.props.header,undefined,'Wallets tab root has no misleading Back button');
const list=nodes(tree);const transfer=list.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Transfer Money Between Wallets');assert(transfer);const total=list.find(n=>n.type==='Text'&&n.props.children==='Total Budget');assert(list.indexOf(transfer)<list.indexOf(total),'Transfer is reachable before wallet cards');
assert.equal(transfer.props.disabled, true, 'A Transfer press must wait until the Wallets navigator has focus');
assert.equal(transfer.props.accessibilityState.disabled, true);
transfer.props.onPress();
assert.equal(nav.length, 0);
const blur = onFocus();
cursor=0;
const readyTransfer = nodes(Wallets()).find(n => n.props?.accessibilityLabel === 'Transfer Money Between Wallets');
assert.equal(readyTransfer.props.disabled, false);
assert.equal(readyTransfer.props.accessibilityState.disabled, false);
transfer.props.onPress();
transfer.props.onPress();
assert.deepEqual(nav, ['/transfer'], 'Two quick presses open one Transfer on the mounted router');
blur();
transfer.props.onPress();
assert.equal(nav.length, 1, 'A stale press after leaving Wallets cannot navigate');
onFocus();
transfer.props.onPress();
assert.deepEqual(nav, ['/transfer', '/transfer'], 'Returning to Wallets enables the next visit');
assert.equal(list.filter(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Transfer Money Between Wallets').length,1);
const add=list.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Add Wallet');assert(add,'Compact Add Wallet action stays named and accessible');add.props.onPress();assert.equal(nav.at(-1),'/wallets/add');assert(!list.some(n=>n.type==='Button'&&['Add Wallet','Transfer Money Between Wallets'].includes(n.props.title)),'No competing filled action buttons');
assert(list.some(n=>n.type==='Text'&&n.props.children==='From one wallet to another'));
list.find(n=>n.type==='Button'&&n.props.title==='Manage Hidden Wallets').props.onPress();cursor=0;tree=Wallets();assert.equal(tree.props.header.type,'Back');tree.props.header.props.onPress();cursor=0;assert.equal(Wallets().props.header,undefined);
assert(fs.existsSync('src/app/wallets/[id].tsx')&&fs.existsSync('src/app/wallets/add.tsx'),'Wallet editors stay in the root stack so entry drafts retain their return path');
assert(!fs.existsSync('src/app/(tabs)/wallets/_layout.tsx'),'Wallet editor navigation must not switch away from an entry draft');
assert(!fs.existsSync('src/app/wallets/index.tsx'),'No duplicate public Wallets route');
assert(!fs.readFileSync('src/app/(tabs)/index.tsx','utf8').includes('StorageCheck'),'No training widget in Overview');
console.log('Wallet navigation passed: four tabs, early transfer action and route, no duplicate action/route, correct hidden-list Back and no training widget.');
