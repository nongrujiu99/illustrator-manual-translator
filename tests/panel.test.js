const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Segments=require('../extension/js/core/segments');
const Job=require('../extension/js/core/job');
const Provider=require('../extension/js/core/provider');
const Profiles=require('../extension/js/core/profiles');

const snapshot={documentName:'test.ai',sourcePath:'C:\\test.ai',fingerprint:'test',artboards:[[0,100,100,0]],frames:[
 {sessionId:0,artboardIndex:0,sourceText:'产品说明',flags:{},bounds:[0,100,100,0]},
 {sessionId:1,artboardIndex:0,sourceText:'User Guide',flags:{},bounds:[0,100,100,0]}
]};

function panel(options={}){
 const elements={};
 function element(){let html='';return {children:[],value:'',disabled:true,hidden:false,open:false,textContent:'',className:'',
  get innerHTML(){return html;},set innerHTML(value){html=value;this.children=[];},appendChild(child){this.children.push(child);}};}
 for(const id of ['provider','endpoint','model','apiKey','targetLanguage','fontFitMode','maxShrinkPercent','pointWidthTolerance','manualTranslate','glossary','scan','summary','segments','progress','issues','issueCount','issueStep','issueDetails','documentStep','quickStep','modelStep','reviewStep','reviewDetails','editSettings','saveStep','backToStart','translate','testApi','apply','save','output','status','apiSettingsStep','typographyStep','glossaryStep','openApiSettings','openTypographySettings','openGlossarySettings','backFromApi','backFromTypography','backFromGlossary','profileSelect','profileName','saveProfile','newProfile','deleteProfile'])elements[id]=element();
 elements.provider.value='aliyun-cn';
 elements.targetLanguage.value='en';
 elements.fontFitMode.value='shrink';
 elements.maxShrinkPercent.value='10';
 elements.pointWidthTolerance.value='10';
 const calls=[],payloads=[];
 let stored=options.savedJob||null;
 const context={document:{getElementById:id=>elements[id],createElement:element},TranslatorProvider:Provider,TranslatorProfiles:Profiles,TranslatorKeyVault:options.vault||{protect:async key=>Buffer.from(key,'utf8').toString('base64'),unprotect:async secret=>Buffer.from(secret,'base64').toString('utf8')},TranslatorSegments:Segments,TranslatorJob:Job,
  TranslatorTranslation:{translateSegments:options.translateSegments|| (async()=>[{id:'f0',sessionId:0,translation:'Product Guide'}]),testConnection:options.testConnection|| (async()=>true)},
  TranslatorBridge:{invoke:(method,payload,cb)=>{calls.push(method);payloads.push(payload);if(method==='scan'&&options.failScan)return cb(Error('请打开文档'));if(method==='scan')return cb(null,options.snapshots?options.snapshots.filter(Boolean)[calls.filter(x=>x==='scan').length-1]:(options.snapshot||snapshot));if(method==='scanSelection')return cb(null,options.selection||{documentName:'test.ai',frames:[{sessionId:0,sourceText:'产品说明',bounds:[0,100,100,0]}],skipped:0});if(method==='applySelection')return cb(null,{applied:1,failed:0,issues:[]});if(method==='apply'&&options.applyDeferred)return options.applyDeferred(cb);if(method==='apply')return cb(null,options.applyResult||{applied:1,failed:0,issues:[]});if(method==='saveCopy')return cb(null,{path:payload.targetPath});cb(null,{});}},
  localStorage:options.storage||{getItem:key=>options.savedJobs?options.savedJobs[key]||null:key.indexOf('manualTranslatorJob')===0?stored:null,setItem:(key,value)=>{if(options.persist&&key.indexOf('manualTranslatorJob')===0)stored=value;if(options.savedJobs)options.savedJobs[key]=value;}},require,console,Promise,Buffer,Date,Math,setTimeout};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/js/panel.js'),'utf8'),context);
 return {elements,calls,payloads,getStored:()=>stored};
}

test('initial panel shows only the document step',()=>{
 const {elements:e}=panel();
 assert.equal(e.documentStep.hidden,false);
 assert.equal(e.quickStep.hidden,false);
 assert.equal(e.modelStep.hidden,true);
 assert.equal(e.reviewStep.hidden,true);
 assert.equal(e.saveStep.hidden,true);
 assert.equal(e.issueStep.hidden,true);
});

test('settings pages replace the main controls and return without losing values',async()=>{
 const {elements:e}=panel();
 await e.scan.onclick();
 e.openApiSettings.onclick();
 assert.equal(e.documentStep.hidden,true);
 assert.equal(e.quickStep.hidden,true);
 assert.equal(e.modelStep.hidden,true);
 assert.equal(e.apiSettingsStep.hidden,false);
 assert.equal(e.typographyStep.hidden,true);
 e.backFromApi.onclick();
 assert.equal(e.modelStep.hidden,false);
 e.openTypographySettings.onclick();
 assert.equal(e.apiSettingsStep.hidden,true);
 assert.equal(e.typographyStep.hidden,false);
 e.fontFitMode.value='preserve';
 e.backFromTypography.onclick();
 assert.equal(e.quickStep.hidden,false);
 assert.equal(e.fontFitMode.value,'preserve');
 e.openGlossarySettings.onclick();
 assert.equal(e.glossaryStep.hidden,false);
 assert.equal(e.typographyStep.hidden,true);
 e.backFromGlossary.onclick();
 assert.equal(e.modelStep.hidden,false);
});

test('translated and applied phases show only their current controls without pushing save below settings',async()=>{
 const {elements:e}=panel();
 await e.scan.onclick();
 assert.equal(e.quickStep.hidden,false);
 await e.translate.onclick();
 assert.equal(e.documentStep.hidden,true);
 assert.equal(e.quickStep.hidden,true);
 assert.equal(e.reviewStep.hidden,false);
 e.editSettings.onclick();
 assert.equal(e.quickStep.hidden,false);
 await e.translate.onclick();
 await e.apply.onclick();
 assert.equal(e.documentStep.hidden,true);
 assert.equal(e.quickStep.hidden,true);
 assert.equal(e.saveStep.hidden,false);
 const html=fs.readFileSync(path.join(__dirname,'../extension/index.html'),'utf8');
 assert.ok(html.indexOf('id="saveStep"')<html.indexOf('id="issueStep"'));
 e.backToStart.onclick();
 assert.equal(e.documentStep.hidden,false);
 assert.equal(e.quickStep.hidden,false);
 assert.equal(e.saveStep.hidden,true);
});

test('many issues use one visible card with next and previous controls',async()=>{
 const all=Array.from({length:43},(_,i)=>({sessionId:i,artboardIndex:0,reason:'overflow-review'}));
 const {elements:e}=panel({applyResult:{applied:1,failed:0,issues:all}});
 await e.scan.onclick();await e.translate.onclick();await e.apply.onclick();
 assert.equal(e.issues.children.length,1);
 assert.match(e.issues.children[0].textContent,/1\/43/);
 e.issues.children[0].children[1].children[1].onclick();
 assert.match(e.issues.children[0].textContent,/2\/43/);
 e.issues.children[0].children[1].children[0].onclick();
 assert.match(e.issues.children[0].textContent,/1\/43/);
});

test('translation review shows one text frame at a time with page controls',async()=>{
 const two={...snapshot,fingerprint:'review-two',frames:[
  {sessionId:0,artboardIndex:0,sourceText:'产品说明',flags:{},bounds:[0,100,100,0]},
  {sessionId:1,artboardIndex:0,sourceText:'注意安全',flags:{},bounds:[0,100,100,0]}
 ]};
 const {elements:e}=panel({snapshot:two,translateSegments:async()=>[
  {id:'f0',sessionId:0,translation:'Product Guide'},
  {id:'f1',sessionId:1,translation:'Safety Notice'}
 ]});
 await e.scan.onclick();await e.translate.onclick();
 e.reviewDetails.open=true;e.reviewDetails.ontoggle();
 assert.equal(e.segments.children.length,1);
 assert.match(e.segments.children[0].children[0].textContent,/1\/2/);
 e.segments.children[0].children[3].children[1].onclick();
 assert.equal(e.segments.children.length,1);
 assert.match(e.segments.children[0].children[0].textContent,/2\/2/);
 assert.equal(e.segments.children[0].children[2].value,'Safety Notice');
});

test('manual button translates selected text frames without scanning the document',async()=>{
 let config,segments;
 const {elements:e,calls,payloads}=panel({translateSegments:async(items,_g,value)=>{segments=items;config=value;return [{id:'s0',sessionId:0,translation:'Product Guide'}];}});
 e.apiKey.value='test-secret';
 await e.manualTranslate.onclick();
 assert.deepEqual(calls,['scanSelection','applySelection']);
 assert.equal(segments[0].manual,true);
 assert.equal(config.targetLanguage,'en');
 assert.equal(payloads[1].changes[0].translation,'Product Guide');
 assert.match(e.status.textContent,/已替换 1/);
});

test('manual and batch writeback use selected typography settings',async()=>{
 const manual=panel();
 manual.elements.fontFitMode.value='preserve';
 manual.elements.maxShrinkPercent.value='25';
 manual.elements.pointWidthTolerance.value='5';
 await manual.elements.manualTranslate.onclick();
 assert.deepEqual(JSON.parse(JSON.stringify(manual.payloads[1].fitOptions)),{mode:'preserve',maxShrinkPercent:25,pointWidthTolerance:5});
 const bulk=panel();
 bulk.elements.fontFitMode.value='shrink';
 bulk.elements.maxShrinkPercent.value='20';
 bulk.elements.pointWidthTolerance.value='15';
 await bulk.elements.scan.onclick();await bulk.elements.translate.onclick();await bulk.elements.apply.onclick();
 assert.deepEqual(JSON.parse(JSON.stringify(bulk.payloads[1].fitOptions)),{mode:'shrink',maxShrinkPercent:20,pointWidthTolerance:15});
});

test('manual translation failure leaves Illustrator text untouched',async()=>{
 const {elements:e,calls}=panel({translateSegments:async()=>{throw Error('HTTP 401');}});
 await e.manualTranslate.onclick();
 assert.deepEqual(calls,['scanSelection']);
 assert.equal(e.status.className,'error');
});

test('changing target language isolates bulk drafts and output name',async()=>{
 const saved=Job.createJob(snapshot,Segments.createSegments(snapshot).segments);
 saved.setTranslation('f0','English Draft',false);
 const {elements:e}=panel({savedJobs:{'manualTranslatorJob:en':saved.serialize()}});
 e.targetLanguage.value='ja';e.targetLanguage.onchange();
 await e.scan.onclick();
 assert.equal(e.modelStep.hidden,false);
 assert.equal(e.reviewStep.hidden,true);
 assert.match(e.output.value,/_ja\.ai$/);
});

test('scan reveals translation without building the review list',async()=>{
 const {elements:e}=panel();
 await e.scan.onclick();
 assert.equal(e.modelStep.hidden,false);
 assert.equal(e.reviewStep.hidden,true);
 assert.equal(e.translate.disabled,false);
 assert.equal(e.segments.children.length,0);
 assert.match(e.summary.textContent,/1 条待翻译/);
 assert.match(e.summary.textContent,/0 条需复核/);
});

test('translation reveals collapsed review, then application reveals save',async()=>{
 const {elements:e,calls}=panel();
 await e.scan.onclick();
 await e.translate.onclick();
 assert.equal(e.modelStep.hidden,true);
 assert.equal(e.reviewStep.hidden,false);
 assert.equal(e.saveStep.hidden,true);
 assert.equal(e.reviewDetails.open,false);
 assert.equal(e.segments.children.length,0);
 e.reviewDetails.open=true;
 e.reviewDetails.ontoggle();
 assert.equal(e.segments.children[0].children[2].value,'Product Guide');
 await e.apply.onclick();
 assert.equal(e.reviewStep.hidden,true);
 assert.equal(e.saveStep.hidden,false);
 assert.equal(e.save.disabled,false);
 assert.deepEqual(calls,['scan','apply']);
});

test('repeated protected text does not stop applying translated frames',async()=>{
 const source={documentName:'test.ai',sourcePath:'C:\\test.ai',fingerprint:'test',artboards:[[0,100,100,0]],frames:[{sessionId:0,artboardIndex:0,sourceText:'使用USB连接电脑',flags:{},bounds:[0,100,100,0]}]};
 const saved=Job.createJob(source,Segments.createSegments(source).segments);
 saved.setTranslation('f0','Connect via USB cable USB to the computer',true);
 const {elements:e,calls}=panel({snapshot:source,savedJob:saved.serialize()});
 await e.scan.onclick();
 await e.apply.onclick();
 assert.deepEqual(calls,['scan','apply']);
 assert.equal(e.saveStep.hidden,false);
});

test('rescan resets later steps and scan failure keeps them hidden',async()=>{
 const {elements:e}=panel();
 await e.scan.onclick();
 await e.translate.onclick();
 await e.apply.onclick();
 await e.scan.onclick();
 assert.equal(e.modelStep.hidden,false);
 assert.equal(e.reviewStep.hidden,true);
 assert.equal(e.saveStep.hidden,true);
 assert.equal(e.segments.children.length,0);
 const failed=panel({failScan:true}).elements;
 await failed.scan.onclick();
 assert.equal(failed.modelStep.hidden,true);
 assert.equal(failed.reviewStep.hidden,true);
 assert.equal(failed.saveStep.hidden,true);
 assert.equal(failed.status.className,'error');
});

test('markup gives API, typography, and glossary separate pages',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../extension/index.html'),'utf8');
 const api=html.split('<section id="apiSettingsStep" hidden>')[1].split('</section>')[0];
 const typography=html.split('<section id="typographyStep" hidden>')[1].split('</section>')[0];
 assert.match(api,/id="provider"/);
 assert.match(api,/id="endpoint"/);
 assert.match(api,/id="model"/);
 assert.doesNotMatch(api,/id="fontFitMode"|id="glossary"/);
 assert.match(typography,/id="fontFitMode"/);
 assert.match(html,/<details id="reviewDetails"/);
 assert.match(html,/<section id="modelStep" hidden>/);
 assert.match(html,/<section id="reviewStep" hidden>/);
 assert.match(html,/<section id="saveStep" hidden>/);
});

test('main panel keeps translation actions prominent and stores the API key in advanced settings',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../extension/index.html'),'utf8');
 const quick=html.split('<section id="quickStep">')[1].split('</section>')[0];
 const api=html.split('<section id="apiSettingsStep" hidden>')[1].split('</section>')[0];
 assert.ok(html.indexOf('id="quickStep"')<html.indexOf('id="documentStep"'));
 assert.match(quick,/id="targetLanguage"/);
 assert.match(quick,/id="manualTranslate"/);
 assert.match(quick,/id="openApiSettings"/);
 assert.doesNotMatch(quick,/id="apiKey"/);
 assert.match(api,/id="apiKey"/);
 assert.match(api,/id="testApi"/);
});

test('named channel presets restore the matching encrypted key after reopening the panel',async()=>{
 const values=new Map();
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const first=panel({storage}).elements;
 first.openApiSettings.onclick();
 first.profileName.value='Comfly';
 first.provider.value='custom';
 first.endpoint.value='https://ai.comfly.org/v1/chat/completions';
 first.model.value='example-model';
 first.apiKey.value='private-key';
 await first.saveProfile.onclick();
 assert.equal(first.profileSelect.children.length,2);
 assert.doesNotMatch(Array.from(values.values()).join('\n'),/private-key/);
 const second=panel({storage}).elements;
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(second.profileName.value,'Comfly');
 assert.equal(second.endpoint.value,'https://ai.comfly.org/v1/chat/completions');
 assert.equal(second.apiKey.value,'private-key');
 second.openApiSettings.onclick();
 second.deleteProfile.onclick();
 assert.equal(second.profileSelect.children.length,1);
 assert.doesNotMatch(Array.from(values.values()).join('\n'),/cHJpdmF0ZS1rZXk=/);
});

test('switching channels restores each model and key independently',async()=>{
 const values=new Map();
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const e=panel({storage}).elements;
 e.profileName.value='First';e.provider.value='custom';e.endpoint.value='https://first.example/v1/chat/completions';e.model.value='first-model';e.apiKey.value='first-key';
 await e.saveProfile.onclick();
 const firstId=e.profileSelect.value;
 e.newProfile.onclick();
 e.profileName.value='Second';e.endpoint.value='https://second.example/v1/chat/completions';e.model.value='second-model';e.apiKey.value='second-key';
 await e.saveProfile.onclick();
 assert.equal(e.profileSelect.children.length,3);
 e.profileSelect.value=firstId;await e.profileSelect.onchange();
 assert.equal(e.model.value,'first-model');
 assert.equal(e.apiKey.value,'first-key');
});

test('restored translations open review and edited text reaches the working copy',async()=>{
 const base=Job.createJob(snapshot,Segments.createSegments(snapshot).segments);
 base.setTranslation('f0','Product Guide',false);
 const {elements:e,payloads}=panel({savedJob:base.serialize()});
 await e.scan.onclick();
 assert.equal(e.reviewStep.hidden,false);
 assert.equal(e.modelStep.hidden,true);
 e.reviewDetails.open=true;
 e.reviewDetails.ontoggle();
 const edit=e.segments.children[0].children[2];
 edit.value='English Manual';
 edit.onchange();
 await e.apply.onclick();
 assert.equal(payloads[1].changes[0].translation,'English Manual');
});

test('writeback failure shows the issue without enabling save',async()=>{
 const {elements:e}=panel({applyResult:{applied:0,failed:1,issues:[{artboardIndex:0,sessionId:0,reason:'溢出'}]}});
 await e.scan.onclick();
 await e.translate.onclick();
 await e.apply.onclick();
 assert.equal(e.issueStep.hidden,false);
 assert.equal(e.issueCount.textContent,'1 条');
 assert.equal(e.saveStep.hidden,true);
 assert.equal(e.save.disabled,true);
 assert.equal(e.status.className,'error');
});

test('scan cannot replace the document while translation is pending',async()=>{
 let finish;
 const pending=new Promise(resolve=>{finish=resolve;});
 const {elements:e,calls}=panel({translateSegments:()=>pending});
 await e.scan.onclick();
 const translating=e.translate.onclick();
 assert.equal(e.scan.disabled,true);
 assert.equal(e.testApi.disabled,true);
 await e.scan.onclick();
 assert.deepEqual(calls,['scan']);
 finish([{id:'f0',sessionId:0,translation:'Product Guide'}]);
 await translating;
 assert.equal(e.reviewStep.hidden,false);
});

test('rescan clears the prior output path for an unsaved document',async()=>{
 const unsaved={...snapshot,documentName:'未命名',sourcePath:'',fingerprint:'unsaved'};
 const {elements:e}=panel({snapshots:[snapshot,unsaved]});
 await e.scan.onclick();
 assert.match(e.output.value,/test_en\.ai$/);
 await e.scan.onclick();
 assert.equal(e.output.value,'');
});

test('translated review can reopen settings for another translation pass',async()=>{
 const {elements:e}=panel();
 await e.scan.onclick();
 await e.translate.onclick();
 e.editSettings.onclick();
 assert.equal(e.modelStep.hidden,false);
 assert.equal(e.reviewStep.hidden,true);
 assert.equal(e.translate.disabled,false);
});

test('review editing is unavailable while Illustrator applies captured text',async()=>{
 let finish;
 const {elements:e}=panel({applyDeferred:cb=>{finish=cb;}});
 await e.scan.onclick();
 await e.translate.onclick();
 e.reviewDetails.open=true;
 e.reviewDetails.ontoggle();
 assert.equal(e.segments.children.length,1);
 const applying=e.apply.onclick();
 assert.equal(e.reviewDetails.hidden,true);
 assert.equal(e.editSettings.disabled,true);
 assert.equal(e.scan.disabled,true);
 finish(null,{applied:1,failed:0,issues:[]});
 await applying;
 assert.equal(e.saveStep.hidden,false);
});

test('connection test checks current settings without changing the document',async()=>{
 let config;
 const {elements:e,calls}=panel({testConnection:async value=>{config=value;return true;}});
 await e.scan.onclick();
 e.apiKey.value='test-secret';
 await e.testApi.onclick();
 assert.equal(config.apiKey,'test-secret');
 assert.equal(config.model,'qwen-plus');
 assert.deepEqual(calls,['scan']);
 assert.match(e.status.textContent,/连接成功/);
 assert.equal(e.modelStep.hidden,false);
 assert.equal(e.testApi.disabled,false);
});

test('connection failure explains key and region without starting translation',async()=>{
 const error=Error('HTTP 401');error.status=401;
 const {elements:e,calls}=panel({testConnection:async()=>{throw error;}});
 await e.scan.onclick();
 await e.testApi.onclick();
 assert.match(e.status.textContent,/Key/);
 assert.match(e.status.textContent,/地域/);
 assert.equal(e.status.className,'error');
 assert.deepEqual(calls,['scan']);
});

test('failure before any translation tells user to start after fixing settings',async()=>{
 const {elements:e}=panel({translateSegments:async()=>{throw Error('Model and API key required');}});
 await e.scan.onclick();
 await e.translate.onclick();
 assert.match(e.status.textContent,/开始翻译/);
 assert.equal(e.translate.textContent,'开始翻译');
});

test('failed batch persists progress and reopened panel resumes only missing text',async()=>{
 const two={...snapshot,fingerprint:'two',frames:[
  {sessionId:0,artboardIndex:0,sourceText:'产品说明',flags:{},bounds:[0,100,100,0]},
  {sessionId:1,artboardIndex:0,sourceText:'中文二',flags:{},bounds:[0,100,100,0]}
 ]};
 const first=panel({snapshot:two,persist:true,translateSegments:async(todo,_glossary,_config,_transport,onBatch)=>{
  assert.deepEqual(todo.map(s=>s.id),['f0','f1']);
  await onBatch([{id:'f0',sessionId:0,translation:'Product Guide'}]);
  const error=Error('HTTP 401');error.status=401;throw error;
 }});
 await first.elements.scan.onclick();
 first.elements.apiKey.value='test-secret';
 await first.elements.translate.onclick();
 assert.match(first.elements.status.textContent,/已完成 1\/2/);
 assert.match(first.elements.status.textContent,/Key/);
 assert.equal(first.elements.translate.textContent,'继续翻译');
 const saved=first.getStored();
 assert.ok(saved);
 assert.doesNotMatch(saved,/test-secret/);
 const resumed=panel({snapshot:two,savedJob:saved,translateSegments:async(todo,_g,_c,_t,onBatch)=>{
  assert.deepEqual(todo.map(s=>s.id),['f1']);
  const batch=[{id:'f1',sessionId:1,translation:'English Two'}];
  await onBatch(batch);
  return batch;
 }});
 await resumed.elements.scan.onclick();
 assert.match(resumed.elements.status.textContent,/已恢复 1\/2/);
 await resumed.elements.translate.onclick();
 assert.equal(resumed.elements.reviewStep.hidden,false);
});

test('manual edits survive deliberate retranslation',async()=>{
 const two={...snapshot,fingerprint:'two-edits',frames:[
  {sessionId:0,artboardIndex:0,sourceText:'产品说明',flags:{},bounds:[0,100,100,0]},
  {sessionId:1,artboardIndex:0,sourceText:'中文二',flags:{},bounds:[0,100,100,0]}
 ]};
 let calls=0;
 const {elements:e}=panel({snapshot:two,translateSegments:async(todo,_g,_c,_t,onBatch)=>{
  calls++;
  const batch=todo.map(s=>({id:s.id,sessionId:s.sessionId,translation:calls===1?'Draft '+s.id:'Fresh '+s.id}));
  await onBatch(batch);
  return batch;
 }});
 await e.scan.onclick();
 await e.translate.onclick();
 e.reviewDetails.open=true;
 e.reviewDetails.ontoggle();
 e.segments.children[0].children[2].value='My edited English';
 e.segments.children[0].children[2].onchange();
 e.editSettings.onclick();
 await e.translate.onclick();
 e.reviewDetails.open=true;
 e.reviewDetails.ontoggle();
 assert.equal(e.segments.children[0].children[2].value,'My edited English');
 e.segments.children[0].children[3].children[1].onclick();
 assert.equal(e.segments.children[0].children[2].value,'Fresh f1');
});

test('failed retranslation keeps old drafts and resumes pending replacements',async()=>{
 const two={...snapshot,fingerprint:'two-redo',frames:[
  {sessionId:0,artboardIndex:0,sourceText:'中文一',flags:{},bounds:[0,100,100,0]},
  {sessionId:1,artboardIndex:0,sourceText:'中文二',flags:{},bounds:[0,100,100,0]}
 ]};
 const base=Job.createJob(two,Segments.createSegments(two).segments);
 base.setTranslation('f0','Old one',false);
 base.setTranslation('f1','Old two',false);
 const first=panel({snapshot:two,savedJob:base.serialize(),persist:true,translateSegments:async(todo,_g,_c,_t,onBatch)=>{
  assert.deepEqual(Array.from(todo,s=>s.id),['f0','f1']);
  await onBatch([{id:'f0',sessionId:0,translation:'New one'}]);
  const error=Error('HTTP 401');error.status=401;throw error;
 }});
 await first.elements.scan.onclick();
 first.elements.editSettings.onclick();
 await first.elements.translate.onclick();
 const saved=JSON.parse(first.getStored());
 assert.equal(saved.translations.f0.text,'New one');
 assert.equal(saved.translations.f1.text,'Old two');
 assert.deepEqual(saved.pendingRetranslationIds,['f1']);
 const resumed=panel({snapshot:two,savedJob:first.getStored(),translateSegments:async(todo,_g,_c,_t,onBatch)=>{
  assert.deepEqual(Array.from(todo,s=>s.id),['f1']);
  const batch=[{id:'f1',sessionId:1,translation:'New two'}];
  await onBatch(batch);
  return batch;
 }});
 await resumed.elements.scan.onclick();
 assert.equal(resumed.elements.modelStep.hidden,false);
 assert.equal(resumed.elements.translate.textContent,'继续翻译');
 await resumed.elements.translate.onclick();
 assert.equal(resumed.elements.reviewStep.hidden,false);
});

test('manually cleared translation stays editable and blocks application',async()=>{
 const two={...snapshot,fingerprint:'two-empty',frames:[
  {sessionId:0,artboardIndex:0,sourceText:'中文一',flags:{},bounds:[0,100,100,0]},
  {sessionId:1,artboardIndex:0,sourceText:'中文二',flags:{},bounds:[0,100,100,0]}
 ]};
 const base=Job.createJob(two,Segments.createSegments(two).segments);
 base.setTranslation('f0','',true);
 const {elements:e}=panel({snapshot:two,savedJob:base.serialize(),translateSegments:async(todo,_g,_c,_t,onBatch)=>{
  assert.deepEqual(Array.from(todo,s=>s.id),['f1']);
  const batch=[{id:'f1',sessionId:1,translation:'English two'}];
  await onBatch(batch);
  return batch;
 }});
 await e.scan.onclick();
 await e.translate.onclick();
 assert.equal(e.reviewStep.hidden,false);
 assert.equal(e.apply.disabled,true);
 e.reviewDetails.open=true;
 e.reviewDetails.ontoggle();
 e.segments.children[0].children[2].value='Manual one';
 e.segments.children[0].children[2].onchange();
 assert.equal(e.apply.disabled,false);
});
