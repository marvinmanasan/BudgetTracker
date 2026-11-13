const assert=require('node:assert/strict');
const {createLoader}=require('./load-typescript.cjs');
const load=createLoader();
const {validateChoice}=load('src/lib/choices.ts');
for(const name of ['Everything Else',' everything else ','EVERYTHING ELSE']){
 assert.throws(()=>validateChoice('expense',name),/reserved/i);
}
assert.equal(validateChoice('income','Everything Else'),'everything else');
console.log('QA choice regression passed: reserved automatic expense bucket, separate income choices.');
