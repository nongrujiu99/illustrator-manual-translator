const {test}=require('node:test');
const assert=require('node:assert/strict');
const Profiles=require('../extension/js/core/profiles');
const Vault=require('../extension/js/core/key-vault');

function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),raw:()=>Array.from(values.values()).join('\n')};}

test('channel presets survive a new session without storing plaintext keys',()=>{
 const local=storage();
 const original={id:'one',name:'Comfly',provider:'custom',endpoint:'https://ai.comfly.org/v1/chat/completions',model:'example-model',secret:'encrypted-blob',apiKey:'should-never-persist'};
 Profiles.save(local,Profiles.upsert([],original));
 Profiles.select(local,'one');
 const loaded=Profiles.load(local);
 assert.deepEqual(loaded,[{id:'one',name:'Comfly',provider:'custom',endpoint:original.endpoint,model:original.model,secret:'encrypted-blob'}]);
 assert.equal(Profiles.selected(local),'one');
 assert.doesNotMatch(local.raw(),/should-never-persist/);
});

test('a saved channel can be updated or removed without affecting others',()=>{
 const base={id:'one',name:'First',provider:'custom',endpoint:'https://example.com/v1/chat/completions',model:'m',secret:'cipher'};
 const second={...base,id:'two',name:'Second'};
 const two=Profiles.upsert(Profiles.upsert([],base),second);
 assert.equal(Profiles.upsert(two,{...base,model:'new-model'}).length,2);
 assert.equal(Profiles.upsert(two,{...base,model:'new-model'})[0].model,'new-model');
 assert.throws(()=>Profiles.upsert(two,{...base,name:'Second'}),/同名/);
});

test('Windows account protects and restores an API key', {skip:process.platform!=='win32'||process.env.RUN_DPAPI_TEST!=='1'}, async()=>{
 const key='temporary-test-key-中文';
 const sealed=await Vault.protect(key);
 assert.ok(sealed.length>key.length);
 assert.ok(!sealed.includes(key));
 assert.equal(await Vault.unprotect(sealed),key);
});
