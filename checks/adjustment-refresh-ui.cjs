const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const load = require('./load-typescript.cjs').createLoader();
const { adjustmentPreview, balanceEffectsSignature } = load('src/lib/editing.ts');
const { deriveBalances } = load('src/lib/ledger.ts');
let slots = [], cursor = 0, saveError = '', busy = false, reloads = 0, writes = 0;
const starting = { wallets: [{ id: 'cash', name: 'Cash', included: true, hidden: false }], transactions: [], transfers: [], changes: [{ id: 'opening', walletId: 'cash', kind: 'opening', deltaCentavos: 100000, date: '2026-11-13', reason: 'Starting balance', targetCentavos: null }] };
let displayed = starting, current = starting;
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const mocks = {
  react: { useCallback: fn => fn, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; } },
  'react/jsx-runtime': jsx,
  'react-native': { Text: 'Text', View: 'View', BackHandler: { addEventListener: () => ({ remove() {} }) } },
  'expo-router': { useRouter:()=>({ back: () => assert.fail('A rejected adjustment must not navigate away') }), useFocusEffect() {}, useLocalSearchParams: () => ({ wallet: 'cash' }) },
  '../components/centered-popup': { CenteredPopup: 'Popup' },
  '../components/bulsa-screen': { BulsaScreen: 'Screen' },
  '../components/bulsa-button': { BulsaButton: 'Button' },
  '../components/bulsa-form': { BackButton: 'Back', Field: 'Field', ReadState: 'ReadState', useUI: () => ({}) },
  '../hooks/use-ledger': {
    useLedger: () => ({ data: displayed, balances: deriveBalances(displayed), loading: false, error: '', reload: async () => { reloads++; displayed = current; } }),
    useSaveAction: () => ({ busy, error: saveError, run: async work => { try { await work(); return true; } catch (cause) { saveError = cause.message; return false; } } }),
  },
  '../storage/wallets': { adjustWallet: async proposal => {
    const fresh = adjustmentPreview(current, proposal.walletId, proposal.targetCentavos);
    if (balanceEffectsSignature(fresh) !== proposal.expectedPreviewSignature) throw Error('Your balances changed. Refresh and review this adjustment again.');
    writes++;
  } },
};
for (const name of ['editing', 'form-money', 'money', 'validation']) mocks[`../lib/${name}`] = load(`src/lib/${name}.ts`);
const moduleObject = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/app/adjust-balance.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
vm.runInThisContext('(function(require,module,exports){' + code + '})')(name => { assert(name in mocks, name); return mocks[name]; }, moduleObject, moduleObject.exports);
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
const render = () => { cursor = 0; return moduleObject.exports.default(); };
const button = (tree, title) => nodes(tree).find(n => n.type === 'Button' && n.props.title === title);
const popup = tree => nodes(tree).find(n => n.type === 'Popup');
const text = tree => nodes(tree).filter(n => n.type === 'Text').map(n => [].concat(n.props.children).join('')).join('\n');
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  let tree = render();
  nodes(tree).find(n => n.type === 'Field' && n.props.label === 'Actual Balance (PHP)').props.onChangeText('950');
  nodes(tree).find(n => n.type === 'Field' && n.props.label === 'Reason').props.onChangeText('Counted cash');
  tree = render(); button(tree, 'Review Adjustment').props.onPress(); tree = render();
  assert(text(popup(tree)).includes('Total Budget: ₱1,000.00 → ₱950.00'));
  current = { ...starting, wallets: starting.wallets.map(w => ({ ...w, included: false })) };
  button(popup(tree), 'Confirm Adjustment').props.onPress(); await tick(); tree = render();
  assert.equal(writes, 0, 'Rejected preview must not save');
  assert(text(popup(tree)).includes('Your balances changed'));
  const refresh = button(popup(tree), 'Refresh Balance');
  assert(refresh, 'Refresh must be reachable inside the modal, not behind its backdrop');
  busy = true; assert.equal(button(popup(render()), 'Refresh Balance').props.disabled, true); busy = false;
  refresh.props.onPress(); await tick(); tree = render();
  assert.equal(popup(tree), undefined, 'Refresh closes the obsolete review');
  assert.equal(reloads, 1);
  assert.equal(nodes(tree).find(n => n.type === 'Field' && n.props.label === 'Actual Balance (PHP)').props.value, '950', 'Keep the target draft');
  assert.equal(nodes(tree).find(n => n.type === 'Field' && n.props.label === 'Reason').props.value, 'Counted cash');
  button(tree, 'Review Adjustment').props.onPress(); tree = render();
  assert(text(popup(tree)).includes('Total Budget: ₱0.00 → ₱0.00'), 'New review must derive real fresh excluded-wallet effects');
  assert(text(popup(tree)).includes('Recorded: ₱1,000.00'));
  assert.equal(writes, 0);
  console.log('Adjustment refresh UI passed: rejected approval, in-popup refresh, saving lock, reload, retained draft and fresh money figures. Native rendering not covered.');
})().catch(error => { console.error(error); process.exitCode = 1; });
