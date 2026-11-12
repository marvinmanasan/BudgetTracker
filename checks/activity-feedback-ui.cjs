const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./load-typescript.cjs').createLoader();
let slots=[],cursor=0,params={wallet:'cash'},routes=[],alertButtons=[],pending=null;
const data={wallets:[{id:'cash',name:'Cash',hidden:false,included:true}],changes:[],transfers:[],transactions:[
 {id:'one',type:'expense',amountCentavos:100,category:'Food',walletId:'cash',date:'2026-11-12',paymentMethod:'Not specified'},
 {id:'two',type:'income',amountCentavos:200,category:'Salary',walletId:'cash',date:'2026-10-12',paymentMethod:'Not specified'},
]};
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const mocks={
 '@/components/centered-popup':{CenteredPopup:'Popup'},
 '@/components/money-review':{MoneyReview:'MoneyReview'},'@/lib/selected-deletion':load('src/lib/selected-deletion.ts'),'@/storage/selected-deletion':{deleteSelectedTransactions:async()=>{}},
 react:{useCallback:fn=>fn,useMemo:fn=>fn(),useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];}},
 'expo-image':{Image:'Image'},'react/jsx-runtime':jsx,'react-native':{BackHandler:{addEventListener:()=>({remove(){}})},Text:'Text',View:'View',Pressable:'Pressable',SectionList:'List',Modal:'Modal',Alert:{alert:(title,message,buttons)=>alertButtons=buttons}},
 'expo-router':{useFocusEffect(){},useLocalSearchParams:()=>params,router:{setParams:p=>Object.assign(params,p),push:r=>routes.push(r)}},
 '@/hooks/use-bulsa-theme':{useBulsaTheme:()=>({colors:{}})},'@/hooks/use-ledger':{useSaveAction:()=>({busy:false,error:'',run:async fn=>{await fn();return true;}}),useLedger:()=>({data,loading:false,error:'',reload(){}})},
 '@/hooks/use-transaction-undo':{useTransactionUndo:()=>({busy:false,record:pending,snapshot:()=>({busy:false,record:pending})})},
 '@/components/pocket-screen':{PocketScreen:'Screen'},'@/components/pocket-button':{PocketButton:'Button'},
 '@/components/bulsa-form':{BackButton:'Back',Field:'Field',ReadState:'ReadState',useUI:()=>({})},'@/components/activity-amount':{ActivityAmount:'Amount'},
 '@/components/activity-filters':{ActivityFilterPanel:'Filters'},'@/components/undo-notice':{UndoNotice:'Undo'},
 '@/lib/activity':load('src/lib/activity.ts'),'@/lib/validation':{localDate:()=> '2026-11-12'},'@/lib/money':load('src/lib/money.ts'),'@/lib/display-date':load('src/lib/display-date.ts'),
};
const moduleObject={exports:{}};
const code=ts.transpileModule(fs.readFileSync('src/app/(tabs)/activity.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+code+'})')(n=>n.endsWith('.svg')?n:mocks[n]??require(n),moduleObject,moduleObject.exports);
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children),...nodes(t.props?.header)]:[];
const render=()=>{cursor=0;return moduleObject.exports.default();};
const find=(t,type)=>nodes(t).find(n=>n.type===type);
const button=(t,title)=>nodes(t).find(n=>n.type==='Button'&&n.props.title===title);
const header=t=>find(t,'List').props.ListHeaderComponent;
let tree=render();button(header(tree),'Filters').props.onPress();tree=render();
find(tree,'Filters').props.onMonth('2026-10');tree=render();assert.equal(find(tree,'List').props.sections.length,2,'Draft month does not alter Activity');
find(tree,'Popup').props.onClose();tree=render();assert.equal(find(tree,'Popup'),undefined);
button(header(tree),'Filters').props.onPress();tree=render();assert.equal(find(tree,'Filters').props.month,'','Cancel discards draft month');
find(tree,'Filters').props.onMonth('2026-10');tree=render();button(tree,'Apply Filters').props.onPress();tree=render();
assert.equal(find(tree,'List').props.sections.length,1);assert.equal(find(tree,'List').props.sections[0].date,'2026-10-12');
button(header(tree),'Filters').props.onPress();tree=render();find(tree,'Filters').props.onClear();tree=render();assert.equal(params.wallet,'cash','Clear remains a draft until Apply');button(tree,'Apply Filters').props.onPress();tree=render();assert.equal(params.wallet,undefined);
const list=find(tree,'List');
assert(button(header(tree),'Select'),'Visible Select makes the gesture discoverable');
let row=list.props.renderItem({item:list.props.sections[0].data[0]});
assert(!nodes(row).some(n=>n.props?.accessibilityLabel?.startsWith('Edit ')),'No repeated per-row actions');
find(row,'Pressable').props.onLongPress();tree=render();
assert(nodes(tree).some(n=>n.type==='Text'&&[].concat(n.props.children).join('').includes('1 Selected')));
assert(button(tree,'Edit'));assert(button(tree,'Delete Selected'));
button(tree,'Select All Matching').props.onPress();tree=render();
assert(!button(tree,'Edit'),'Multiple selected records cannot be edited together');
button(tree,'Delete Selected').props.onPress();tree=render();assert(find(tree,'MoneyReview'),'Multiple deletion shows balance review');assert.equal(routes.filter(r=>r.params?.action==='delete').length,0);
find(tree,'Popup').props.onClose();tree=render();assert(button(header(tree),'Select'),'Back from deletion review clears selection');button(header(tree),'Select').props.onPress();tree=render();button(tree,'Select All Matching').props.onPress();pending={id:'pending'};tree=render();assert.equal(button(tree,'Delete Selected').props.disabled,true);
button(tree,'Done').props.onPress();tree=render();assert(button(header(tree),'Select'));
assert.equal(list.props.showsVerticalScrollIndicator,false);
console.log('Activity feedback UI passed: staged filters, Cancel/Apply/Clear, wallet scope and guarded delete review. Native layout not covered.');
