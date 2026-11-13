const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {createLoader}=require('./load-typescript.cjs');
const palettes=createLoader()('src/constants/bulsa.ts');let colors=palettes.LightColors;
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const mocks={
 'react/jsx-runtime':jsx,'react-native':{Pressable:'Button',Text:'Text',View:'View',StyleSheet:{create:s=>s}},
 '@/constants/bulsa':palettes,
 '../lib/money':createLoader()('src/lib/money.ts'),
 'expo-router':{useRouter:()=>({push(){}})},
 './bulsa-button':{BulsaButton:'Button'},'./bulsa-form':{ReadState:'ReadState',useUI:()=>({})},
 '../lib/savings-summary':createLoader()('src/lib/savings-summary.ts'),
 '../hooks/use-savings':{useSavings:()=>({data:{goals:[{id:'main',title:'My Goal',targetCentavos:10000}],contributions:[{id:'saved',goalId:'main',amountCentavos:12000,date:'2026-11-12',note:''}]},loading:false,error:'',reload(){}})},
 '@/hooks/use-bulsa-theme':{useBulsaTheme:()=>({colors}),useBulsaStyles:factory=>factory(colors)},
 '../hooks/use-bulsa-theme':{useBulsaTheme:()=>({colors}),useBulsaStyles:factory=>factory(colors)},
};
function component(file){const result={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>mocks[name]??require(name),result,result.exports);return result.exports;}
const button=component('src/components/bulsa-button.tsx').BulsaButton;
const summary=component('src/components/summary-card.tsx').SummaryCard;
const preview=component('src/components/savings-preview.tsx').SavingsPreview;
for(const palette of [palettes.LightColors,palettes.DarkColors]){
 colors=palette;
 const primary=button({title:'Save',onPress(){}});
 assert.equal(primary.props.style({pressed:false})[0].backgroundColor,palette.accent);
 assert.equal(primary.props.children.props.style[0].color,palette.onAccent);
 const secondary=button({title:'Cancel',secondary:true,disabled:true,selected:true,onPress(){}});
 assert.equal(secondary.props.style({pressed:false})[1].backgroundColor,palette.surface);
 assert.equal(secondary.props.children.props.style[1].color,palette.text);
 assert.equal(secondary.props.accessibilityState.disabled,true);assert.equal(secondary.props.accessibilityState.selected,true);
 const income=summary({label:'Income',tone:'income',amountCentavos:125});
 assert.equal(income.props.children[1].props.children,'+₱1.25');
 const expense=summary({label:'Expenses',tone:'expense',amountCentavos:125});
 assert.equal(expense.props.children[1].props.children,'-₱1.25');
 const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
 const progress=nodes(preview()).find(n=>n.props?.accessibilityRole==='progressbar');
 assert(progress,'Savings preview exposes progress in both themes');assert.equal(progress.props.accessibilityValue.now,100);assert(progress.props.accessibilityValue.text.includes('₱120.00'),'Actual savings must not be clipped to target');
}
console.log('Theme button checks passed: light/dark surfaces, foregrounds and disabled semantics. Native rendering not covered.');
