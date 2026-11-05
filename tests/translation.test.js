const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {translateSegments,testConnection}=require('../extension/js/core/translation');
test('CEP page loads translation from the already loaded segments global',()=>{
 const context={module:{exports:{}},require:()=>{throw Error('CEP relative require is unavailable');}};
 const root=path.join(__dirname,'../extension/js/core');
 vm.runInNewContext(fs.readFileSync(path.join(root,'segments.js'),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(path.join(root,'translation.js'),'utf8'),context);
 assert.equal(typeof context.TranslatorTranslation.translateSegments,'function');
});
test('translation checks ids and restores protected tokens',async()=>{
 const segments=[{id:'f0',sourceText:'电压 220 V',template:'电压 [[KEEP_0]]',tokens:['220 V']}];
 const transport=async()=>({choices:[{message:{content:JSON.stringify({translations:[{id:'f0',text:'Voltage [[KEEP_0]]'}]})}}]});
 const r=await translateSegments(segments,{}, {endpoint:'https://example.com/v1/chat/completions',model:'test',apiKey:'secret'},transport);
 assert.equal(r[0].translation,'Voltage 220 V');
 await assert.rejects(()=>translateSegments(segments,{}, {endpoint:'http://example.com',model:'test',apiKey:'x'},transport));
});
test('target language is sent to the model for manual and batch translation',async()=>{
 let body;
 const transport=async(_endpoint,payload)=>{body=payload;return {choices:[{message:{content:'{"translations":[{"id":"s0","text":"製品ガイド"}]}'}}]};};
 const segments=[{id:'s0',sessionId:0,template:'产品说明',tokens:[]}];
 const result=await translateSegments(segments,{}, {endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret',targetLanguage:'ja'},transport);
 assert.match(body.messages[0].content,/Japanese/);
 assert.equal(result[0].translation,'製品ガイド');
});
test('missing id fails closed',async()=>{
 const transport=async()=>({choices:[{message:{content:'{"translations":[]}'}}]});
 await assert.rejects(()=>translateSegments([{id:'f0',sourceText:'中文',template:'中文',tokens:[]}],{}, {endpoint:'https://example.com',model:'m',apiKey:'x'},transport));
});

test('connection test sends a short request without document content',async()=>{
 let sent;
 const transport=async(endpoint,body,key)=>{sent={endpoint,body,key};return {choices:[{message:{content:'OK'}}]};};
 const config={endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret'};
 assert.equal(await testConnection(config,transport),true);
 assert.equal(sent.endpoint,config.endpoint);
 assert.equal(sent.key,config.apiKey);
 assert.equal(sent.body.model,config.model);
 assert.ok(sent.body.max_tokens<=16);
 assert.doesNotMatch(JSON.stringify(sent.body),/产品说明|F3TEST/);
});

test('connection test rejects a response without model text',async()=>{
 await assert.rejects(
  ()=>testConnection({endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret'},async()=>({choices:[{message:{}}]})),
  /Model response missing content/
 );
});

test('blank model translation fails before a batch can replace old drafts',async()=>{
 let saved=false;
 const transport=async()=>({choices:[{message:{content:'{"translations":[{"id":"f0","text":"   "}]}'}}]});
 await assert.rejects(
  ()=>translateSegments([{id:'f0',sessionId:0,template:'中文',tokens:[]}],{},
   {endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret'},transport,()=>{saved=true;}),
  /Empty translation/
 );
 assert.equal(saved,false);
});

test('completed first batch remains available when a later batch fails',async()=>{
 const segments=Array.from({length:13},(_,i)=>({id:'f'+i,sessionId:i,template:'中文 '+i,tokens:[]}));
 const batches=[];
 let calls=0;
 const transport=async()=>{
  calls++;
  if(calls===1)return {choices:[{message:{content:JSON.stringify({translations:segments.slice(0,12).map(s=>({id:s.id,text:'English '+s.id}))})}}]};
  const error=Error('HTTP 401');error.status=401;throw error;
 };
 await assert.rejects(
  ()=>translateSegments(segments,{}, {endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret'},transport,batch=>batches.push(batch)),
  error=>error.status===401
 );
 assert.equal(calls,2);
 assert.equal(batches.length,1);
 assert.equal(batches[0].length,12);
});

test('authentication failure is not retried',async()=>{
 let calls=0;
 const transport=async()=>{calls++;const error=Error('HTTP 403');error.status=403;throw error;};
 await assert.rejects(
  ()=>translateSegments([{id:'f0',sessionId:0,template:'中文',tokens:[]}],{}, {endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'bad'},transport),
  error=>error.status===403
 );
 assert.equal(calls,1);
});

test('rate limit is retried and then continues the batch',async()=>{
 let calls=0;
 const transport=async()=>{
  calls++;
  if(calls===1){const error=Error('HTTP 429');error.status=429;throw error;}
  return {choices:[{message:{content:'{"translations":[{"id":"f0","text":"English"}]}'}}]};
 };
 const result=await translateSegments([{id:'f0',sessionId:0,template:'中文',tokens:[]}],{},
  {endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret'},transport);
 assert.equal(calls,2);
 assert.equal(result[0].translation,'English');
});

test('unexpected marker in a shared response is retried in smaller batches',async()=>{
 const segments=[
  {id:'f168',sessionId:168,template:'连接 [[KEEP_0]]',tokens:['USB']},
  {id:'f169',sessionId:169,template:'电压 [[KEEP_0]]',tokens:['220 V']}
 ];
 const saved=[];
 const requested=[];
 const transport=async(_endpoint,body)=>{
  const ids=JSON.parse(body.messages[1].content).map(item=>item.id);
  requested.push(ids);
  const translations=ids.length===2?
   [{id:'f168',text:'Connect [[KEEP_0]] [[KEEP_1]]'},{id:'f169',text:'Voltage [[KEEP_0]]'}]:
   [{id:ids[0],text:ids[0]==='f168'?'Connect [[KEEP_0]]':'Voltage [[KEEP_0]]'}];
  return {choices:[{message:{content:JSON.stringify({translations})}}]};
 };
 const result=await translateSegments(segments,{},
  {endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret'},
  transport,batch=>saved.push(...batch));
 assert.deepEqual(requested,[['f168','f169'],['f168'],['f169']]);
 assert.deepEqual(result.map(item=>item.translation),['Connect USB','Voltage 220 V']);
 assert.deepEqual(saved,result);
});

test('an invalid single-frame response is requested again before failing',async()=>{
 let calls=0;
 const transport=async()=>{
  calls++;
  return {choices:[{message:{content:JSON.stringify({translations:[{id:'f170',text:calls===1?'Voltage [[KEEP_9]]':'Voltage [[KEEP_0]]'}]})}}]};
 };
 const result=await translateSegments([{id:'f170',sessionId:170,template:'电压 [[KEEP_0]]',tokens:['220 V']}],{},
  {endpoint:'https://example.com/v1/chat/completions',model:'qwen-plus',apiKey:'secret'},transport);
 assert.equal(calls,2);
 assert.equal(result[0].translation,'Voltage 220 V');
});
