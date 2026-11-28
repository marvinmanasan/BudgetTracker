const assert=require('node:assert/strict');
const {createLoader}=require('./load-typescript.cjs');
const files=new Map();let failWrite=false,corrupt=false,failMove=false,failList=false;
const reads=new Map();
class File{
 constructor(parent,name){this.uri=name?parent+'/'+name:parent;this.name=this.uri.split('/').pop();}
 create(){assert(!files.has(this.uri));files.set(this.uri,'');}
 async write(s){if(failWrite)throw Error('disk full');files.set(this.uri,corrupt?'bad':s);}
 async text(){reads.set(this.uri,(reads.get(this.uri)??0)+1);return files.get(this.uri);}
 async move(destination){if(failMove)throw Error('rename failed');files.set(destination.uri,files.get(this.uri));files.delete(this.uri);this.uri=destination.uri;this.name=destination.name;}
 get exists(){return files.has(this.uri);}
 delete(){files.delete(this.uri);}
}
class Directory{constructor(p){this.uri=p;}list(){if(failList)throw Error('directory unavailable');return [...files.keys()].filter(p=>p.startsWith(this.uri+'/')).map(p=>new File(p));}}
const backup={format:'bulsa-financial-backup',version:1,createdAt:'2026-11-13T00:00:00.000Z',tables:{}};
const load=createLoader({'expo-file-system':{File,Directory,Paths:{document:'private-documents'}},'../lib/backup':{serializeBackup:b=>JSON.stringify(b),parseBackup:s=>JSON.parse(s)}});
(async()=>{
 const service=load('src/services/restore-safety.ts');
 assert.equal(await service.latestRestoreSafetyCopy(),null);
 const uri=await service.saveRestoreSafetyCopy(backup);
 assert.deepEqual(await service.readRestoreSafetyCopy(uri),backup);
 assert.equal(await service.latestRestoreSafetyCopy(),uri,'Safety file is discoverable after screen/app restart');
 files.set('private-documents/Bulsa-Before-Restore-9000000000000-partial.pending','');
 files.set('private-documents/Bulsa-Before-Restore-9000000000001-interrupted.json','');
 assert.equal(await service.latestRestoreSafetyCopy(),uri,'Ignore interrupted and invalid newer files');
 files.delete('private-documents/Bulsa-Before-Restore-9000000000000-partial.pending');
 files.delete('private-documents/Bulsa-Before-Restore-9000000000001-interrupted.json');
 failWrite=true;await assert.rejects(()=>service.saveRestoreSafetyCopy(backup),/disk full/);failWrite=false;
 assert.equal(files.size,1,'Failed safety write removes only its partial file');
 corrupt=true;await assert.rejects(()=>service.saveRestoreSafetyCopy(backup));corrupt=false;
 assert.equal(files.size,1,'Failed verification keeps prior safety copy');
 assert.deepEqual(await service.readRestoreSafetyCopy(uri),backup);
 failMove=true;await assert.rejects(()=>service.saveRestoreSafetyCopy(backup),/rename failed/);failMove=false;
 assert.equal(files.size,1,'A failed finalization keeps the original valid copy');
 const realNow=Date.now;
 try {
  Date.now=()=>2000; const first=await service.saveRestoreSafetyCopy(backup);
  Date.now=()=>1000; const second=await service.saveRestoreSafetyCopy({...backup,createdAt:'2026-11-12T00:00:00.000Z'});
  assert.notEqual(first,second);
  assert.equal(await service.latestRestoreSafetyCopy(),second,'Last restore stays discoverable when the device clock moves backward');
  assert.equal(await service.latestRestoreSafetyCopy(second),first,'The older snapshot remains available after a later restore attempt');
  assert.equal(await service.latestRestoreSafetyCopy(first),uri);
  assert.equal(await service.latestRestoreSafetyCopy(uri),null,'History ends without cycling to the newest');
 } finally {Date.now=realNow;}
 files.clear();files.set('private-documents/Bulsa-Before-Restore-1-invalid.json','bad');
 await assert.rejects(()=>service.latestRestoreSafetyCopy(),/readable recovery copy/i,'Do not silently treat corrupt history as no history');
 const strictLoad=createLoader({'expo-file-system':{File,Directory,Paths:{document:'private-documents'}}});
 const codec=strictLoad('src/lib/backup.ts');
 const valid={format:'bulsa-financial-backup',version:2,createdAt:'2026-11-27T00:00:00.000Z',tables:Object.fromEntries(Object.keys(codec.backupColumns).map(table=>[table,[]]))};
 files.clear();files.set('private-documents/Bulsa-Before-Restore-1-valid.json',codec.serializeBackup(valid));
 files.set('private-documents/Bulsa-Before-Restore-2-invalid.json','{}');
 const strictService=strictLoad('src/services/restore-safety.ts');
 reads.clear();
 assert.deepEqual(await strictService.findRestoreSafetyCopy(),{uri:'private-documents/Bulsa-Before-Restore-1-valid.json',createdAt:valid.createdAt},'Real backup validation rejects schema-invalid JSON and returns metadata without a second read');
 assert.equal(reads.get('private-documents/Bulsa-Before-Restore-1-valid.json'),1,'Metadata reuses the already validated backup');
 failList=true;await assert.rejects(()=>strictService.latestRestoreSafetyCopy(),/directory unavailable/);failList=false;
 console.log('Restore safety copy passed: verified private copy, restart discovery, disk failure and corrupt-write cleanup preserve previous copy.');
})().catch(e=>{console.error(e);process.exitCode=1});
