const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { createLoader } = require('./load-typescript.cjs');
const load = createLoader();
let slots = [], cursor = 0, busy = false, fail = false, writes = [], backs = 0;
const jsx = { jsx: (type, props) => ({type, props}), jsxs: (type, props) => ({type, props}) };
const mocks = {
  react: { useCallback: fn => fn, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; } },
  'react/jsx-runtime': jsx,
  'react-native': { Text:'Text', BackHandler: {addEventListener: () => ({remove(){}})} },
  'expo-router': {router: {back(){backs++;}}, useFocusEffect(){}},
  './pocket-screen': {PocketScreen:'Screen'}, './pocket-button':{PocketButton:'Button'},
  './bulsa-form': {BackButton:'Back', Field:'Field', ReadState:'ReadState', ui:{}},
  '../hooks/use-ledger': {useSaveAction: () => ({busy, error:'', run: async work => { try { await work(); return true; } catch { return false; } }})},
  '../storage/savings': {saveSavingsGoal: async record => {if(fail) throw Error('write failed'); writes.push(record);}, recordSavingsContribution: async record => {if(fail) throw Error('write failed'); writes.push(record);}},
};
for(const name of ['form-money','money','editing','display-date','validation']) mocks[`../lib/${name}`] = load(`src/lib/${name}.ts`);
const moduleResult = {exports:{}};
const code = ts.transpileModule(fs.readFileSync('src/components/savings-form.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+code+'})')(name => mocks[name] ?? require(name), moduleResult, moduleResult.exports);
function nodes(tree) { if(Array.isArray(tree)) return tree.flatMap(nodes); if(!tree || typeof tree !== 'object') return []; return [tree,...nodes(tree.props?.children)]; }
const goal = {id:'main',title:'My Goal',targetCentavos:10000};
let props = {initial:goal,contribution:true,loading:false,readError:'',retry(){}};
const render = () => {cursor=0;return moduleResult.exports.SavingsForm(props);};
const field = (tree,label) => nodes(tree).find(n => n.type === 'Field' && n.props.label === label);
const save = tree => nodes(tree).find(n => n.type === 'Button' && /^Save Savings/.test(n.props.title));
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  let tree = render(); save(tree).props.onPress(); await tick(); assert.equal(writes.length,0);
  field(tree,'Amount Saved (PHP)').props.onChangeText('12.34');
  field(tree,'Date (MM-DD-YYYY)').props.onChangeText('02-29-2026');
  tree=render(); save(tree).props.onPress(); await tick(); assert.equal(writes.length,0);
  field(tree,'Date (MM-DD-YYYY)').props.onChangeText('02-29-2024');
  tree=render(); const originalId=slots[6];
  props={...props,loading:true}; tree=render(); assert(save(tree).props.disabled);
  assert.equal(field(tree,'Amount Saved (PHP)').props.value,'12.34');
  props={...props,loading:false,readError:'Read failed'}; tree=render(); assert(save(tree).props.disabled);
  props={...props,readError:''}; fail=true; tree=render(); save(tree).props.onPress(); await tick(); assert.equal(backs,0);
  assert.equal(field(render(),'Amount Saved (PHP)').props.value,'12.34');
  fail=false; tree=render(); save(tree).props.onPress(); await tick();
  assert.equal(writes.length,1); assert.equal(writes[0].amountCentavos,1234); assert.equal(writes[0].date,'2024-02-29'); assert.equal(writes[0].goalId,'main'); assert.equal(writes[0].id,originalId); assert.equal(backs,1);
  busy=true; tree=render(); assert(tree.props.header.props.disabled); assert(nodes(tree).filter(n=>n.type==='Button').every(n=>n.props.disabled));
  busy=false; slots=[]; props={...props,contribution:false}; tree=render();
  field(tree,'Goal Name').props.onChangeText('Updated Goal'); field(tree,'Savings Target (PHP)').props.onChangeText('5.00');
  tree=render(); save(tree).props.onPress(); await tick(); assert.deepEqual(writes[1],{id:'main',title:'Updated Goal',targetCentavos:500});
  console.log('Savings form checks passed: amount/date validation, draft preservation, failed-save retry with stable ID, goal ID preservation and blocked controls. Native rendering not covered.');
})().catch(error => {console.error(error);process.exitCode=1;});
