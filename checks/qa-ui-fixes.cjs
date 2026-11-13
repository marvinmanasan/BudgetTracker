const assert=require('node:assert/strict');
const {createLoader}=require('./load-typescript.cjs');
const load=createLoader();
const {validateChoice,choiceKey}=load('src/lib/choices.ts');
for(const name of ['Everything Else',' everything else ','EVERYTHING ELSE','Everything   Else','Everything\tElse','  eVeRyThInG  \t eLsE  ']){
 assert.throws(()=>validateChoice('expense',name),/reserved/i);
}
assert.equal(validateChoice('income','Everything Else'),'everything else');
assert.equal(choiceKey('  My   Category  '),'my   category','Existing stored choice keys must not change');
assert.equal(validateChoice('expense','My   Category'),'my   category');
console.log('QA choice regression passed: reserved automatic expense bucket, separate income choices.');
