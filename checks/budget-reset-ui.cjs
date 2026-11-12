const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {createLoader}=require('./load-typescript.cjs');
const load=createLoader();
const ledger={wallets:[{id:'cash',name:'Cash',included:true,hidden:false}],transactions:[{id:'general-income',type:'income',amountCentavos:5000,category:'Allowance',date:'2026-11-01',paymentMethod:'Cash',walletId:null}],transfers:[],changes:[{id:'opening',walletId:'cash',kind:'opening',deltaCentavos:100000,date:'2026-11-01',reason:'',targetCentavos:null}]};
const slots=[];let cursor=0,pending=null,commits=0,limitState={value:null,loading:false,error:'',reload:async()=>{}};
const react={useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];}};
const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
const fade={duration(){return this},reduceMotion(){return this}};
const common={
 '../components/centered-popup':{CenteredPopup:'Popup'},
 'react-native-reanimated':{default:{View:'AnimatedView'},FadeIn:fade,ReduceMotion:{System:'system'}},
 'react':react,'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View',Pressable:'Pressable',Switch:'Switch',BackHandler:{addEventListener:()=>({remove(){}})}},
 'expo-router':{router:{push(){},replace(){},back(){}},useFocusEffect(){}},
 '../components/pocket-screen':{PocketScreen:'Screen'},'../components/pocket-button':{PocketButton:'Button'},'./pocket-button':{PocketButton:'Button'},
 '../components/bulsa-form':{BackButton:'Back',Field:'Field',ReadState:'ReadState',useUI:()=>({})},'./bulsa-form':{useUI:()=>({})},
 '../components/money-review':{MoneyReview:'MoneyReview'},'../components/undo-notice':{UndoNotice:'UndoNotice'},
 '../hooks/use-ledger':{useLedger:()=>({data:ledger,loading:false,error:'',reload:async()=>{}}),useSaveAction:()=>({busy:false,error:'',run:async work=>{try{return await work()!==false;}catch{return false;}}})},
 '../hooks/use-transaction-undo':{useTransactionUndo:()=>({busy:false,record:pending,snapshot:()=>({busy:false,record:pending})})},
 '../hooks/use-monthly-limit':{useMonthlyLimit:()=>limitState},
 '../lib/selective-reset':load('src/lib/selective-reset.ts'),
 '../storage/selective-reset':{applyReset:async()=>{commits++;}},
 '../lib/money':load('src/lib/money.ts'),'../lib/display-date':load('src/lib/display-date.ts'),
 '../constants/pocket':{PocketColors:{}}, '../hooks/use-bulsa-theme':{useBulsaTheme:()=>({colors:{}})},
};
function component(path){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>common[name]??require(name),module,module.exports);return module.exports;}
function nodes(tree){if(!tree)return[];if(Array.isArray(tree))return tree.flatMap(nodes);if(typeof tree!=='object')return[];return[tree,...nodes(tree.props?.children)];}
const notice=component('src/components/monthly-limit-notice.tsx').MonthlyLimitNotice;
let tree=notice({month:'2026-11',spent:100,disabled:true});
assert(nodes(tree).filter(n=>n.type==='Button').every(n=>n.props.disabled===true),'limit links disabled while parent saves');
limitState={...limitState,error:'read failed'};tree=notice({month:'2026-11',spent:100,disabled:true});assert(nodes(tree).filter(n=>n.type==='Button').every(n=>n.props.disabled===true));
limitState={...limitState,value:1000,error:''};tree=notice({month:'2026-11',spent:100,compact:true,disabled:true});
const compactLink=nodes(tree).find(n=>n.type==='Pressable');assert(compactLink,'Home limit is one compact, accessible link');assert.equal(compactLink.props.disabled,true);assert(compactLink.props.accessibilityLabel.includes('₱9.00'));
limitState={...limitState,value:null};tree=notice({month:'2026-11',spent:100,compact:true});assert(!nodes(tree).find(n=>n.type==='Pressable').props.accessibilityLabel.toLowerCase().includes('remaining'),'Unset limit never calculates remaining');
const screen=component('src/app/reset-data.tsx').default;
const render=()=>{cursor=0;return screen();};
const button=(tree,title)=>nodes(tree).find(n=>n.type==='Button'&&n.props.title===title);
tree=render();assert(!button(tree,'Delete Selected Records'));
button(tree,'General').props.onPress();tree=render();
button(tree,'General').props.onPress();tree=render();
assert.equal(nodes(tree).filter(n=>n.type==='Switch').length,0,'Tapping selected scope clears it');
button(tree,'General').props.onPress();tree=render();
assert.deepEqual(nodes(tree).filter(n=>n.type==='Switch').map(n=>n.props.value),[false,false]);
nodes(tree).find(n=>n.type==='Switch'&&n.props.accessibilityLabel==='Remove income').props.onValueChange(true);
tree=render();button(tree,'Preview Selection').props.onPress();tree=render();
assert.equal(nodes(tree).find(n=>n.type==='Popup').props.stepKey,'review','Preview starts at the top inside popup');assert(nodes(tree).some(n=>n.type==='Text'&&String(n.props.children).includes('Nothing has been deleted')));assert(button(tree,'Continue to Confirmation'));assert(!button(tree,'Delete Selected Records'));
button(tree,'Continue to Confirmation').props.onPress();tree=render();assert.equal(button(tree,'Delete Selected Records').props.disabled,true);
nodes(tree).find(n=>n.type==='Field'&&n.props.label==='Type RESET to Confirm').props.onChangeText('reset');tree=render();assert.equal(button(tree,'Delete Selected Records').props.disabled,true);
nodes(tree).find(n=>n.type==='Field').props.onChangeText('RESET');tree=render();assert.equal(button(tree,'Delete Selected Records').props.disabled,false);
(async()=>{
 pending={id:'old-undo'};button(tree,'Delete Selected Records').props.onPress();await new Promise(r=>setImmediate(r));assert.equal(commits,0,'late pending Undo blocks reset');
 pending=null;tree=render();button(tree,'Delete Selected Records').props.onPress();await new Promise(r=>setImmediate(r));assert.equal(commits,1);
 console.log('Budget/reset UI checks passed: blocked links, no default deletion, review, exact confirmation and pending Undo. Native rendering not covered.');
})().catch(e=>{console.error(e);process.exitCode=1;});
