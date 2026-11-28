const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { createLoader } = require('./load-typescript.cjs');
const load = createLoader(), palettes = load('src/constants/bulsa.ts');
let colors = palettes.LightColors, slots = [], cursor = 0, routes = [], focus;
let ledger = { loading: false, error: '', balances: { totalCentavos: 120025, generalCentavos: 25, wallets: [
  { id: 'wallet-cash', name: 'Cash', included: true, configured: true, hidden: false, balanceCentavos: 100000 },
  { id: 'bank', name: 'A very long bank wallet name & family savings', included: false, configured: true, hidden: false, balanceCentavos: 55000 },
  { id: 'new', name: 'New Wallet', included: true, configured: false, hidden: false, balanceCentavos: 0 },
  { id: 'hidden', name: 'Hidden Wallet', included: true, configured: false, hidden: true, balanceCentavos: 20000 },
] } };
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const mocks = {
  react: { useCallback: fn => fn, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; }, useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; } },
  'react/jsx-runtime': jsx,
  'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', Switch: 'Switch', StyleSheet: { create: styles => styles } },
  'expo-symbols': { SymbolView: 'Icon' },
  'expo-router': { useRouter: () => ({ push: route => routes.push(route) }), useLocalSearchParams: () => ({}), useFocusEffect: fn => { focus = fn; } },
  '../../hooks/use-bulsa-theme': { useBulsaTheme: () => ({ colors }), useBulsaStyles: factory => factory(colors) },
  '../../hooks/use-ledger': { useLedger: () => ({ ...ledger, reload() {} }), useSaveAction: () => ({ busy: false, error: '', run: fn => fn() }) },
  '../../components/bulsa-form': { BackButton: 'Back', ReadState: 'Read', useUI: () => ({}) }, '../../components/bulsa-button': { BulsaButton: 'Button' }, '../../components/bulsa-screen': { BulsaScreen: 'Screen' },
  '../../storage/wallets': { setWalletFlags: () => { throw Error('The list must not change balances'); } },
  '../../lib/money': load('src/lib/money.ts'),
};
const mod = { exports: {} };
vm.runInThisContext('(function(require,module,exports){' + ts.transpileModule(fs.readFileSync('src/app/(tabs)/wallets.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText + '})')(name => mocks[name] ?? require(name), mod, mod.exports);
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.header), ...nodes(tree.props?.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props?.children) : tree == null || typeof tree === 'boolean' ? '' : String(tree);
const render = () => { cursor = 0; return mod.exports.default(); };
const named = (tree, label) => nodes(tree).find(node => node.props?.accessibilityLabel === label || (label.startsWith('Open ') && node.props?.accessibilityLabel?.startsWith(label + '.')));
const original = JSON.stringify(ledger);
for (const palette of [palettes.LightColors, palettes.DarkColors]) {
  colors = palette; slots = []; routes = [];
  let tree = render(); const list = nodes(tree);
  const total = list.find(node => node.type === 'Text' && node.props.children === 'Total Budget');
  assert(list.indexOf(total) < list.indexOf(named(tree, 'Transfer Money Between Wallets')), 'Balance is the first financial summary');
  assert(!list.some(node => node.type === 'Switch'), 'Inclusion changes belong inside wallet details');
  assert.match(text(tree), /Set Balance/); assert.match(text(tree), /Excluded/);
  assert.match(text(tree), /Unassigned Money/); assert.match(text(tree), /hidden wallet.*still counts/);
  named(tree, 'Adjust Total Budget').props.onPress(); assert.equal(routes.pop(), '/edit-total-budget');
  for (const id of ['wallet-cash', 'bank', 'new']) {
    const wallet = ledger.balances.wallets.find(row => row.id === id);
    named(tree, `Open ${wallet.name}`).props.onPress(); assert.deepEqual(routes.pop(), { pathname: '/wallets/[id]', params: { id } });
  }
  assert(!named(tree, 'Open Hidden Wallet'));
  assert.match(named(tree,'Open Cash').props.accessibilityLabel, /1,000.00.*Included in Total Budget/);
  assert.match(named(tree,'Open A very long bank wallet name & family savings').props.accessibilityLabel, /550.00.*Excluded from Total Budget/);
  named(tree, 'Set Starting Balance For New Wallet').props.onPress(); assert.deepEqual(routes.pop(), { pathname:'/wallets/[id]', params:{id:'new',setup:'entry'} });
  named(tree, 'About Your Balances').props.onPress(); tree = render(); assert.match(text(tree), /without a wallet/);
  assert.equal(named(tree, 'About Your Balances').props.accessibilityState.expanded, true);
  nodes(tree).find(node => node.type === 'Button' && node.props.title === 'Manage Hidden Wallets').props.onPress(); tree = render();
  assert(named(tree, 'Open Hidden Wallet')); assert(!named(tree, 'Open Cash')); assert(tree.props.header);
  named(tree, 'Open Hidden Wallet').props.onPress(); assert.deepEqual(routes.pop(), {pathname:'/wallets/[id]', params:{id:'hidden'}}, 'An unset hidden wallet still opens full management');
  assert.match(named(tree,'Open Hidden Wallet').props.accessibilityLabel, /Starting balance not set.*Hidden/);
  tree.props.header.props.onPress(); assert(named(render(), 'Open Cash'));
}
for (const patch of [{ loading: true }, { error: 'Read failed' }, { balances: null }]) {
  const previous = ledger; ledger = { ...ledger, ...patch }; slots = []; let tree = render();
  assert(nodes(tree).some(node => node.type === 'Read')); assert(!named(tree, 'Adjust Total Budget')); assert(!named(tree, 'Open Cash'));
  focus(); tree = render(); named(tree, 'Transfer Money Between Wallets').props.onPress(); assert.equal(routes.pop(), '/transfer');
  ledger = previous;
}
assert.equal(JSON.stringify(ledger), original, 'Rendering and navigation never mutate money');
console.log('Wallets clarity passed: balance-first hierarchy, named routes, setup cue, no list switches, themes, hidden/excluded/unassigned states and safe read failures.');
