const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
let state = { resolved:'2026-11', plan:{limitCentavos:null,allocations:[],signature:'[null,[]]'}, loading:false,error:'',reload:async()=>{} };
const jsx = {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const mocks = {
 'react/jsx-runtime':jsx, 'react-native':{Text:'Text'},
 'expo-router':{useLocalSearchParams:()=>({month:'2026-11'}),router:{push(){}}},
 '../components/bulsa-screen':{BulsaScreen:'Screen'}, '../components/bulsa-button':{BulsaButton:'Button'},
 '../components/bulsa-form':{BackButton:'Back',ReadState:'ReadState',useUI:()=>({})},
 '../components/category-limit-form':{CategoryLimitForm:'Editor'},
 '../hooks/use-category-plan':{useCategoryPlan:()=>state}, '../lib/validation':{localDate:()=> '2026-11-12'},
};
const result={exports:{}};
const code=ts.transpileModule(fs.readFileSync('src/app/category-limits.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>mocks[name]??require(name),result,result.exports);
const screen=result.exports.default;
assert.notEqual(screen().type,'Editor','Do not freeze a missing limit inside the draft editor');
state={...state,plan:{limitCentavos:10000,allocations:[],signature:'[10000,[]]'}};
assert.equal(screen().type,'Editor','Returning from monthly setup opens category editor');
state={...state,loading:true};assert.equal(screen().type,'Editor','Focus refresh keeps existing draft mounted');
state={...state,loading:false,error:'Read failed'};assert.equal(screen().type,'Editor','Retry keeps existing draft mounted');
assert.equal(screen().props.sourceError,'Read failed');
console.log('Category route checks passed: no-limit setup return and draft-preserving refresh/error. Native rendering not covered.');
