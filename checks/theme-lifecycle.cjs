const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {createLoader}=require('./load-typescript.cjs');
const load=createLoader(),palettes=load('src/constants/bulsa.ts'),lib=load('src/lib/preferences.ts');
function harness(){
 const slots=[],effects=[];let cursor=0,system='dark',reads=0,writes=0,changes=0,readError=false;
 let read=async()=>{reads++;if(readError)throw Error('settings read failed');return {...lib.DEFAULT_PREFERENCES};};
 let write=async patch=>({...lib.DEFAULT_PREFERENCES,...patch});const native=[];
 const react={createContext:value=>({Provider:'Provider',value}),useContext:context=>context.value,useCallback:fn=>fn,useMemo:fn=>fn(),
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],next=>{changes++;slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
  useEffect(work,deps){const i=cursor++,prev=slots[i];if(!prev||deps.some((d,j)=>!Object.is(d,prev.deps[j]))){effects.push(()=>{prev?.cleanup?.();slots[i]={deps,cleanup:work()};});}},
 };
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 const mocks={react,'react/jsx-runtime':jsx,'react-native':{Appearance:{setColorScheme:choice=>native.push(choice)},useColorScheme:()=>system,SafeAreaView:'SafeArea',Pressable:'Button',Text:'Text',View:'View'},
  '../storage/preferences':{getPreferences:()=>read(),updatePreferences:patch=>{writes++;return write(patch);}},'../lib/preferences':lib,'../constants/bulsa':palettes};
 const result={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/hooks/use-bulsa-theme.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext('(function(require,module,exports){'+code+'})')(name=>mocks[name]??require(name),result,result.exports);
 return {render(){cursor=0;const tree=result.exports.BulsaThemeProvider({children:'App'});while(effects.length)effects.shift()();return tree;},unmount(){for(const slot of slots)slot?.cleanup?.();},get native(){return native;},get writes(){return writes;},get changes(){return changes;},setSystem:v=>{system=v;},setRead:v=>{read=v;},setWrite:v=>{write=v;},setReadError:v=>{readError=v;},get reads(){return reads;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
(async()=>{
 const h=harness();assert.notEqual(h.render().type,'Provider','Do not mount financial screens before settings resolve');await tick();let tree=h.render();assert.equal(tree.type,'Provider');assert.equal(tree.props.value.dark,false);assert.equal(h.native.at(-1),'light');
 let release;h.setWrite(patch=>new Promise(resolve=>{release=()=>resolve({...lib.DEFAULT_PREFERENCES,...patch});}));
 const saved=tree.props.value.save({appearance:'dark'});assert.equal(await tree.props.value.save({appearance:'light'}),false);assert.equal(h.writes,1);release();assert.equal(await saved,true);tree=h.render();assert.equal(tree.props.value.colors,palettes.DarkColors);assert.equal(h.native.at(-1),'dark');
 h.setWrite(async patch=>({...lib.DEFAULT_PREFERENCES,...patch}));await tree.props.value.save({appearance:'system'});tree=h.render();assert.equal(h.native.at(-1),'auto');assert.equal(tree.props.value.dark,true);h.setSystem('light');assert.equal(h.render().props.value.dark,false);
 h.setWrite(async()=>{throw Error('write interrupted');});assert.equal(await h.render().props.value.save({appearance:'dark'}),false);tree=h.render();assert.equal(tree.props.value.preferences.appearance,'system');assert.equal(tree.props.value.error,'write interrupted');h.unmount();
 const failed=harness();failed.setReadError(true);failed.render();await tick();tree=failed.render();assert.notEqual(tree.type,'Provider');assert(nodes(tree).some(n=>n.props?.children==='settings read failed'));failed.setReadError(false);nodes(tree).find(n=>n.type==='Button').props.onPress();await tick();assert.equal(failed.render().type,'Provider');failed.unmount();
 const stale=harness();let finish;stale.setRead(()=>new Promise(resolve=>{finish=resolve;}));stale.render();stale.unmount();const before=stale.changes;finish({...lib.DEFAULT_PREFERENCES});await tick();assert.equal(stale.changes,before,'Unmounted initial read must not update state');
 console.log('Theme lifecycle checks passed: guarded initial read/retry, saved overrides, System changes, duplicate-save lock, failure preservation and unmount cancellation. Native Appearance is replaced.');
})().catch(e=>{console.error(e);process.exitCode=1;});
