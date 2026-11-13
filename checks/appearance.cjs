const assert=require('node:assert/strict');
const {createLoader}=require('./load-typescript.cjs');
const load=createLoader();
const {resolveAppearance,needsIntroduction}=load('src/lib/preferences.ts');
const {LightColors,DarkColors}=load('src/constants/bulsa.ts');
assert.equal(resolveAppearance('light','dark'),'light');assert.equal(resolveAppearance('dark','light'),'dark');
assert.equal(resolveAppearance('system','dark'),'dark');assert.equal(resolveAppearance('system',null),'light');
const data={wallets:[],transactions:[],changes:[],transfers:[]};
assert.equal(needsIntroduction(false,data),true);assert.equal(needsIntroduction(true,data),false);
for(const kind of ['transactions','changes','transfers'])assert.equal(needsIntroduction(false,{...data,[kind]:[{}]}),false);
function luminance(hex){const values=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;}
function contrast(a,b){const aa=luminance(a),bb=luminance(b);return(Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05);}
for(const colors of [LightColors,DarkColors]){
  assert.deepEqual(Object.keys(colors).sort(),Object.keys(LightColors).sort());
  for(const bg of ['background','surface','soft','excluded'])for(const fg of ['text','muted','warning','income'])assert(contrast(colors[bg],colors[fg])>=4.5,`${bg}/${fg} contrast`);
  assert(contrast(colors.accent,colors.onAccent)>=4.5);assert(contrast(colors.summary,colors.onSummary)>=4.5);
}
console.log('Appearance checks passed: overrides, system fallback, existing-user introduction protection and readable semantic text pairs.');
