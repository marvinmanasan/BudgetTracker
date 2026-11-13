const assert=require('node:assert/strict');
const {createLoader}=require('./load-typescript.cjs');
const files=new Map();let failWrite=false,corrupt=false;
class File{
 constructor(parent,name){this.uri=name?parent+'/'+name:parent;this.name=this.uri.split('/').pop();}
 create(){assert(!files.has(this.uri));files.set(this.uri,'');}
 async write(s){if(failWrite)throw Error('disk full');files.set(this.uri,corrupt?'bad':s);}
 async text(){return files.get(this.uri);}
 get exists(){return files.has(this.uri);}
 delete(){files.delete(this.uri);}
}
class Directory{constructor(p){this.uri=p;}list(){return [...files.keys()].filter(p=>p.startsWith(this.uri+'/')).map(p=>new File(p));}}
const backup={format:'bulsa-financial-backup',version:1,createdAt:'2026-11-13T00:00:00.000Z',tables:{}};
const load=createLoader({'expo-file-system':{File,Directory,Paths:{document:'private-documents'}},'../lib/backup':{serializeBackup:b=>JSON.stringify(b),parseBackup:s=>JSON.parse(s)}});
(async()=>{
 const service=load('src/services/restore-safety.ts');
 assert.equal(await service.latestRestoreSafetyCopy(),null);
 const uri=await service.saveRestoreSafetyCopy(backup);
 assert.deepEqual(await service.readRestoreSafetyCopy(uri),backup);
 assert.equal(await service.latestRestoreSafetyCopy(),uri,'Safety file is discoverable after screen/app restart');
 failWrite=true;await assert.rejects(()=>service.saveRestoreSafetyCopy(backup),/disk full/);failWrite=false;
 assert.equal(files.size,1,'Failed safety write removes only its partial file');
 corrupt=true;await assert.rejects(()=>service.saveRestoreSafetyCopy(backup));corrupt=false;
 assert.equal(files.size,1,'Failed verification keeps prior safety copy');
 assert.deepEqual(await service.readRestoreSafetyCopy(uri),backup);
 const realNow=Date.now;
 try {
  Date.now=()=>2000; const first=await service.saveRestoreSafetyCopy(backup);
  Date.now=()=>1000; const second=await service.saveRestoreSafetyCopy({...backup,createdAt:'2026-11-12T00:00:00.000Z'});
  assert.notEqual(first,second);
  assert.equal(await service.latestRestoreSafetyCopy(),second,'Last restore stays discoverable when the device clock moves backward');
 } finally {Date.now=realNow;}
 console.log('Restore safety copy passed: verified private copy, restart discovery, disk failure and corrupt-write cleanup preserve previous copy.');
})().catch(e=>{console.error(e);process.exitCode=1});
