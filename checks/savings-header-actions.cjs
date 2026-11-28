const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { createLoader } = require('./load-typescript.cjs');
const load = createLoader();
let slots = [], cursor = 0, routes = [], reloads = 0;
let state = { loading: false, error: '', data: { goals: [{ id: 'main', title: 'Trip', targetCentavos: 100000 }], contributions: [{ id: 'a', goalId: 'main', amountCentavos: 25025, date: '2026-11-28', note: '' }] } };
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const mocks = {
  react: { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = next; }]; } },
  'react/jsx-runtime': jsx, 'react-native': { Text: 'Text', View: 'View', Pressable: 'Pressable' },
  'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) },
  '../hooks/use-bulsa-theme': { useBulsaTheme: () => ({ colors: {} }) },
  '../hooks/use-savings': { useSavings: () => ({ ...state, reload: () => reloads++ }) },
  '../components/bulsa-form': { BackButton: 'Back', ReadState: 'ReadState', useUI: () => ({}) },
  '../components/bulsa-screen': { BulsaScreen: 'Screen' }, '../components/bulsa-button': { BulsaButton: 'Button' },
  '../components/savings-deadline': { SavingsDeadline: 'Deadline' }, '../components/savings-correction-popup': { SavingsCorrectionPopup: 'Correction' },
  '../components/savings-goal-deletion-popup': { SavingsGoalDeletionPopup: 'Deletion' }, '../components/centered-popup': { CenteredPopup: 'Popup' }, '../components/savings-goal-actions': { SavingsGoalActions: 'GoalActions' },
  '../lib/savings-summary': load('src/lib/savings-summary.ts'), '../lib/money': load('src/lib/money.ts'), '../lib/display-date': load('src/lib/display-date.ts'),
};
const mod = { exports: {} };
vm.runInThisContext('(function(require,module,exports){' + ts.transpileModule(fs.readFileSync('src/app/savings.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText + '})')(name => mocks[name] ?? require(name), mod, mod.exports);
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.header), ...nodes(tree.props?.children)] : [];
const render = () => { cursor = 0; return mod.exports.default(); };
const manage = tree => nodes(tree.props.header).find(n => n.props?.accessibilityLabel === 'Manage Savings Goal');
const button = (tree, title) => nodes(tree).find(n => n.type === 'Button' && n.props.title === title);
let tree = render();
assert(manage(tree), 'A labeled goal-management action belongs beside Back');
assert(!button(tree, 'Edit Savings Goal') && !button(tree, 'Delete Savings Goal'), 'Large edit/delete buttons stay off the main screen');
manage(tree).props.onPress(); tree = render(); assert(manage(tree).props.accessibilityState.expanded);
const menu = value => nodes(value).find(n => n.type === 'GoalActions');
assert(menu(tree)); assert.equal(menu(tree).props.goal.title, 'Trip');
menu(tree).props.onClose(); tree = render(); assert(!menu(tree)); assert.equal(routes.length, 0);
manage(tree).props.onPress(); tree = render(); menu(tree).props.onEdit(); assert.deepEqual(routes, ['/savings-goal']); assert(!menu(render()));
manage(render()).props.onPress(); tree = render(); menu(tree).props.onDelete(); tree = render();
const deletion = nodes(tree).find(n => n.type === 'Deletion'); assert(deletion, 'Delete opens confirmation rather than writing'); assert.deepEqual(deletion.props.goal, state.data.goals[0]); assert.deepEqual(deletion.props.contributions, state.data.contributions);
deletion.props.onClose(); assert.equal(reloads, 1);
for (const patch of [{ loading: true }, { error: 'Read failed' }, { data: { goals: [], contributions: [] } }, { data: { goals: [{ id: 'main', targetCentavos: 0 }], contributions: [] } }]) {
  const previous = state; state = { ...state, ...patch }; slots = []; assert(!manage(render()), 'Unsafe/empty state has no goal actions'); state = previous;
}
console.log('Savings header actions passed: discoverable header, no duplicate buttons, cancel, edit route, separate delete confirmation and unavailable-state guards.');

const sheetMocks = {
  'react/jsx-runtime': jsx,
  'react-native': { Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'Scroll', Text: 'Text', View: 'View' },
  'react-native-safe-area-context': { SafeAreaView: 'Safe' },
  'react-native-reanimated': { useReducedMotion: () => true },
  'expo-symbols': { SymbolView: 'Icon' },
  '../hooks/use-bulsa-theme': { useBulsaTheme: () => ({ colors: { warning: '#984F40' } }) },
};
const sheetModule = { exports: {} };
const sheetFile = 'src/components/savings-goal-actions.tsx';
assert(fs.existsSync(sheetFile), 'Goal options need a focused action sheet');
vm.runInThisContext('(function(require,module,exports){' + ts.transpileModule(fs.readFileSync(sheetFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText + '})')(name => sheetMocks[name] ?? require(name), sheetModule, sheetModule.exports);
let edited=0, deleted=0, dismissed=0;
const sheet = sheetModule.exports.SavingsGoalActions({ goal: {title:'Trip'}, onEdit:()=>edited++, onDelete:()=>deleted++, onClose:()=>dismissed++ });
const action = label => nodes(sheet).find(n => n.props?.accessibilityLabel === label);
assert.equal(sheet.props.animationType, 'none');
assert.equal(edited + deleted, 0);
action('Edit Savings Goal').props.onPress(); assert.equal(edited,1);
action('Delete Savings Goal').props.onPress(); assert.equal(deleted,1);
action('Close Goal Options').props.onPress(); sheet.props.onRequestClose(); assert.equal(dismissed,2);
assert.equal(nodes(sheet).filter(n=>n.type==='Icon').length,3);
assert(!nodes(sheet).some(n=>n.type==='Button' || n.type==='Back'));
console.log('Goal action sheet passed: labeled icon rows, explicit close, Android Back, reduced motion and isolated edit/delete callbacks.');
