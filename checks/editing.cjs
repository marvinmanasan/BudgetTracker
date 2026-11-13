const assert = require('node:assert/strict');
const { createLoader } = require('./load-typescript.cjs');
const load = createLoader();
const { transactionDraft, editedTransaction, editPreview, adjustmentPreview } = load('src/lib/editing.ts');
const original = { id: 'fund', type: 'income', amountCentavos: 100000, category: 'Old source', date: '2026-11-01', walletId: 'a', paymentMethod: 'Cash', note: 'Keep' };
const data = { wallets: [{id:'a',name:'A',included:true,hidden:true},{id:'b',name:'B',included:true,hidden:false}], transactions:[original], changes:[{id:'o',walletId:'a',kind:'opening',deltaCentavos:0,date:'2026-11-01',reason:'',targetCentavos:null}], transfers:[{id:'t',fromWalletId:'a',toWalletId:'b',amountCentavos:80000,date:'2026-11-02',note:''}] };
const snapshot = JSON.stringify(data);
const draft = transactionDraft(original);
assert.equal(draft.amount, '1000.00');
const changed = editedTransaction(original, {...draft, amount:'300'});
assert.equal(changed.id, original.id);
assert.equal(changed.type, 'income');
const preview = editPreview(data, changed);
assert.equal(preview.after.wallets.find(w=>w.id==='a').balanceCentavos, -50000);
assert.equal(preview.after.wallets.find(w=>w.id==='b').balanceCentavos, 80000);
assert.equal(preview.after.totalCentavos, 30000);
assert.throws(()=>editedTransaction(original,{...draft,amount:'0'}));
assert.throws(()=>editedTransaction(original,{...draft,date:'02-30-2026'}));
assert.equal(editedTransaction(original,{...draft,walletId:null}).walletId,null);
assert.throws(()=>editPreview({...data,transactions:[]},changed),/not found/i);
assert.equal(adjustmentPreview(data,'a',10000).deltaCentavos,-10000);
assert.equal(adjustmentPreview(data,'a',20000).deltaCentavos,0);
assert.throws(()=>adjustmentPreview(data,'missing',0),/wallet/i);
assert.equal(JSON.stringify(data),snapshot);
const { filterActivitySections, parseActivityMonth } = load('src/lib/activity.ts');
assert.equal(parseActivityMonth('11-2026'),'2026-11');
assert.equal(parseActivityMonth(''),undefined);
assert.throws(()=>parseActivityMonth('13-2026'));
assert.throws(()=>parseActivityMonth('11-0000'));
const all = f=>filterActivitySections(data,f).flatMap(s=>s.data);
assert.equal(all({query:'keep',type:'income',month:'2026-11',category:'Old source',payment:'Cash'}).length,1);
assert.equal(all({query:'old SOURCE'}).length,1);
assert.equal(all({type:'transfer'}).length,1);
assert.equal(all({payment:'Cash',type:'transfer'}).length,0);
assert.equal(all({month:'2026-12'}).length,0);
assert.equal(all({query:'absent'}).length,0);
assert.equal(all({wallet:'b'}).length,1);
assert.equal(JSON.stringify(data),snapshot);
console.log('Editing/filter checks passed: historical negatives, immutable records, previews and combined filters.');

// Render the actual editor route with native boundaries replaced. A transient
// source refresh failure must keep the same editor mounted after initial load.
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
let screenState;
const EntryForm = () => null;
const stubs = {
  'expo-router': { useLocalSearchParams: () => ({ id: original.id }) },
  'react-native': { Text: 'Text' },
  '../components/entry-form': { EntryForm, EntryFields: EntryForm },
  '../components/bulsa-screen': { BulsaScreen: 'Screen' },
  '../components/bulsa-form': { BackButton: 'Back', ReadState: 'ReadState', useUI: () => ({}) },
  '../hooks/use-ledger': { useLedger: () => screenState },
  'react/jsx-runtime': { jsx: (type, props, key) => ({type, props, key}), jsxs: (type, props, key) => ({type, props, key}) },
};
const routeModule = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync('src/app/edit-entry.tsx','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
vm.runInThisContext('(function(require,module,exports){'+compiled+'})')(name => stubs[name] ?? require(name),routeModule,routeModule.exports);
const renderEditor = routeModule.exports.default;
screenState = {data:null,loading:true,error:'',reload:()=>{}};
assert.notEqual(renderEditor().type,EntryForm);
screenState = {data,loading:false,error:'',reload:()=>{}};
const mountedEditor = renderEditor();
assert.equal(mountedEditor.type,EntryForm);
assert.equal(mountedEditor.props.ledger,screenState,'Editor shares its loaded ledger rather than issuing duplicate queries');
screenState = {...screenState,loading:false,error:'Temporary read failure'};
assert.equal(renderEditor().type,mountedEditor.type,'refresh failure must not unmount an existing draft');
assert.equal(renderEditor().key,mountedEditor.key);
assert.equal(renderEditor().props.ledger.error,'Temporary read failure');
screenState = {...screenState,loading:true,error:''};
assert.equal(renderEditor().type,mountedEditor.type);
console.log('Editor route checks passed: loading and retry preserve mounted draft identity.');
