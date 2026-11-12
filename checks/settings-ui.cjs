const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let slots=[],cursor=0,writes=[],saved=true,navigation=[],saving=false,focused=true;
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const theme={preferences:{displayName:'Ana',appearance:'light',onboardingComplete:false},saving:false,error:'',save:async patch=>{writes.push(patch);return saved;}};
const mocks={
 'react':{useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=value;}];}},
 'react/jsx-runtime':jsx,'react-native':{Text:'Text',View:'View',BackHandler:{addEventListener:()=>({remove(){}})}},
 'expo-router':{router:{push:route=>navigation.push(route)},useFocusEffect(){},useNavigation:()=>({isFocused:()=>focused})},
 '../hooks/use-bulsa-theme':{useBulsaTheme:()=>({...theme,saving})},
 './pocket-screen':{PocketScreen:'Screen'},'./pocket-button':{PocketButton:'Button'},'./bulsa-form':{BackButton:'Back',Field:'Field',useUI:()=>({})},
};
function read(file){const result={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>mocks[name]??require(name),result,result.exports);return result.exports;}
const form=read('src/components/settings-form.tsx').SettingsForm;
const intro=read('src/components/first-use.tsx').FirstUse;
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const button=(t,title)=>nodes(t).find(n=>n.type==='Button'&&n.props.title===title);
const render=()=>{cursor=0;return form();};const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let tree=render();nodes(tree).find(n=>n.type==='Field').props.onChangeText('Mika');button(tree,'Dark').props.onPress();
 tree=render();assert.equal(button(tree,'Dark').props.selected,true,'Selected appearance must be exposed to accessibility');saved=false;button(tree,'Save Settings').props.onPress();await tick();assert.deepEqual(writes[0],{displayName:'Mika',appearance:'dark'});
 theme.preferences={...theme.preferences,displayName:'Other'};tree=render();assert.equal(nodes(tree).find(n=>n.type==='Field').props.value,'Mika','Refresh preserves draft after failed write');
 saving=true;tree=render();assert(tree.props.header.props.disabled);assert(nodes(tree).filter(n=>n.type==='Button').every(n=>n.props.disabled));
 saving=false;saved=false;slots=[];cursor=0;tree=intro();button(tree,'Set Up Wallets').props.onPress();await tick();assert.equal(navigation.length,0,'Failed intro save must not navigate');
 saved=true;cursor=0;tree=intro();button(tree,'Set Up Wallets').props.onPress();await tick();assert.equal(navigation[0],'/wallets');assert.deepEqual(writes.at(-1),{onboardingComplete:true});
 let release;theme.save=()=>new Promise(resolve=>{release=resolve;});cursor=0;tree=intro();button(tree,'Set Up Wallets').props.onPress();focused=false;release(true);await tick();assert.equal(navigation.length,1,'Changing tabs while saving must not push Wallets over another tab');
 console.log('Settings/first-use checks passed: drafts, saved payload, disabled controls and navigation only after persisted introduction. Native rendering not covered.');
})().catch(e=>{console.error(e);process.exitCode=1;});
