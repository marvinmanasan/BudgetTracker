const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { createLoader } = require('./load-typescript.cjs');
const load = createLoader();
let slots = [], cursor = 0, closed = 0, saved = 0, calls = [], busy = false, error = '', fail = false;
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const goal = { id: 'main', title: 'Emergency Fund', targetCentavos: 100000 };
const records = [{ id: 'a', goalId: 'main', amountCentavos: 25025, date: '2026-11-28', note: 'Test' }];
const mocks = {
  react: { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = next; }]; } },
  'react/jsx-runtime': jsx, 'react-native': { Text: 'Text' },
  './centered-popup': { CenteredPopup: 'Popup' }, './bulsa-form': { useUI: () => ({}) }, './bulsa-button': { BulsaButton: 'Button' },
  '../hooks/use-ledger': { useSaveAction: () => ({ busy, error, run: async work => { if (busy) return false; try { await work(); return true; } catch (cause) { error = cause.message; return false; } } }) },
  '../storage/savings': { deleteSavingsGoal: async (...args) => { if (fail) throw Error('Deletion failed'); calls.push(args); } },
  '../lib/money': load('src/lib/money.ts'), '../lib/savings-summary': load('src/lib/savings-summary.ts'),
};
const source = 'src/components/savings-goal-deletion-popup.tsx';
assert(fs.existsSync(source), 'Goal deletion needs an explicit confirmation');
const mod = { exports: {} };
vm.runInThisContext('(function(require,module,exports){' + ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText + '})')(name => mocks[name] ?? require(name), mod, mod.exports);
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' && tree ? text(tree.props?.children) : tree == null || typeof tree === 'boolean' ? '' : String(tree);
const render = (contributions = records) => { cursor = 0; return mod.exports.SavingsGoalDeletionPopup({ goal, contributions, onClose: () => closed++, onDeleted: () => saved++ }); };
const button = (tree, title) => nodes(tree).find(node => node.type === 'Button' && node.props.title === title);
(async () => {
  let tree = render();
  assert(text(tree).includes('Emergency Fund'));
  assert(text(tree).includes('250.25'));
  assert.match(text(tree), /1 savings record/);
  assert.match(text(tree), /wallet balances.*unchanged/i);
  assert.equal(calls.length, 0, 'Opening confirmation never writes');
  button(tree, 'Cancel').props.onPress(); assert.equal(closed, 1); assert.equal(calls.length, 0);
  busy = true; tree = render(); assert(tree.props.busy); assert(nodes(tree).filter(n => n.type === 'Button').every(n => n.props.disabled));
  busy = false; fail = true; tree = render(); await button(tree, 'Delete Goal And Records').props.onPress();
  assert.equal(saved, 0); assert.equal(closed, 1); assert.match(text(render()), /Deletion failed/);
  fail = false; tree = render(); await button(tree, 'Delete Goal And Records').props.onPress();
  assert.equal(saved, 1); assert.deepEqual(calls, [[goal, records]]);
  slots = []; tree = render([]); assert(button(tree, 'Delete Goal'), 'An empty goal needs a clear goal-only confirmation'); await button(tree, 'Delete Goal').props.onPress(); assert.deepEqual(calls[1], [goal, []]);
  console.log('Savings goal deletion UI passed: explicit named confirmation, totals, cancel, busy controls, failed-write retention and success callback.');
})().catch(cause => { console.error(cause); process.exitCode = 1; });
