(function(){
 'use strict';
 var $=function(id){return document.getElementById(id);};
 var snapshot=null,segments=[],reviewIndex=0,job=null,issues=[],issueIndex=0,phase='initial',settingsPage='main',busy=false,retranslateRequested=false;
 var profiles=TranslatorProfiles.load(localStorage),activeProfileId='';

 function applyProvider(id){
  var preset=TranslatorProvider.preset(id);
  if(preset){$('endpoint').value=preset.endpoint;$('model').value=preset.model;}
 }
 $('provider').onchange=function(){applyProvider(this.value);};
 $('endpoint').oninput=function(){if($('provider').value!=='custom')$('provider').value='custom';};
 applyProvider($('provider').value);

 function status(message,error){
  $('status').textContent=message;
  $('status').className=error?'error':'';
 }
 function beginWork(){
  if(busy)return false;
  busy=true;
  $('scan').disabled=true;
  $('manualTranslate').disabled=true;
  $('targetLanguage').disabled=true;
  return true;
 }
 function endWork(){
  busy=false;
  $('scan').disabled=false;
  $('manualTranslate').disabled=false;
  $('targetLanguage').disabled=false;
 }
 function updateView(nextPhase){
  phase=nextPhase;
  var editing=phase==='initial'||phase==='scanned',main=editing&&settingsPage==='main';
  $('documentStep').hidden=!main;
  $('quickStep').hidden=!main;
  $('modelStep').hidden=phase!=='scanned'||!main;
  $('apiSettingsStep').hidden=!editing||settingsPage!=='api';
  $('typographyStep').hidden=!editing||settingsPage!=='typography';
  $('glossaryStep').hidden=!editing||settingsPage!=='glossary';
  $('reviewStep').hidden=phase!=='translated';
  $('saveStep').hidden=phase!=='applied'&&phase!=='saved';
  $('issueStep').hidden=!issues.length||!main&&editing;
  $('scan').textContent=phase==='initial'?'读取当前文档':'重新读取文档';
  $('scan').className=phase==='initial'?'':'secondary';
 }
 function showSettings(page){
  if(busy)return;
  settingsPage=page;
  updateView(phase);
 }
 $('openApiSettings').onclick=function(){showSettings('api');};
 $('openTypographySettings').onclick=function(){showSettings('typography');};
 $('openGlossarySettings').onclick=function(){showSettings('glossary');};
 $('backFromApi').onclick=$('backFromTypography').onclick=$('backFromGlossary').onclick=function(){showSettings('main');};
 function profileById(id){for(var i=0;i<profiles.length;i++)if(profiles[i].id===id)return profiles[i];return null;}
 function renderProfiles(){
  var select=$('profileSelect');select.innerHTML='';
  var empty=document.createElement('option');empty.value='';empty.textContent='当前配置（未保存）';select.appendChild(empty);
  profiles.forEach(function(profile){var option=document.createElement('option');option.value=profile.id;option.textContent=profile.name;select.appendChild(option);});
  select.value=activeProfileId;
  $('deleteProfile').disabled=!activeProfileId;
 }
 function newProfile(){
  if(busy)return;
  activeProfileId='';TranslatorProfiles.select(localStorage,'');
  $('profileSelect').value='';$('profileName').value='';$('apiKey').value='';
  $('deleteProfile').disabled=true;
  status('已新建空预设。填写名称、接口、模型和 Key 后保存。');
 }
 async function activateProfile(id){
  if(busy)return;
  var profile=profileById(id);if(!profile){newProfile();return;}
  if(!beginWork())return;
  activeProfileId=id;TranslatorProfiles.select(localStorage,id);renderProfiles();
  $('profileSelect').disabled=true;$('testApi').disabled=true;$('saveProfile').disabled=true;
  $('profileName').value=profile.name;$('provider').value=profile.provider;
  $('endpoint').value=profile.endpoint;$('model').value=profile.model;$('apiKey').value='';
  try{
   $('apiKey').value=await TranslatorKeyVault.unprotect(profile.secret);
   status('已载入“'+profile.name+'”预设。');
  }catch(error){status('已载入渠道设置，但 Key 无法解密。请重新输入并保存预设。',true);}
  finally{$('profileSelect').disabled=false;$('testApi').disabled=false;$('saveProfile').disabled=false;endWork();}
 }
 $('profileSelect').onchange=function(){return activateProfile(this.value);};
 $('newProfile').onclick=newProfile;
 $('deleteProfile').onclick=function(){
  if(busy||!activeProfileId)return;
  var id=activeProfileId;
  profiles=profiles.filter(function(profile){return profile.id!==id;});
  TranslatorProfiles.save(localStorage,profiles);
  activeProfileId='';TranslatorProfiles.select(localStorage,'');
  $('profileName').value='';$('apiKey').value='';renderProfiles();
  status('已删除预设及其保存的 Key。');
 };
 $('saveProfile').onclick=async function(){
  if(busy)return;
  var draft={id:activeProfileId||'p'+Date.now().toString(36)+Math.random().toString(36).slice(2),name:$('profileName').value.trim(),provider:$('provider').value,endpoint:$('endpoint').value.trim(),model:$('model').value.trim(),key:$('apiKey').value};
  if(!draft.name||!/^https:\/\/[^/]+\//i.test(draft.endpoint)||!draft.model||!draft.key){status('请填写预设名称、有效的 HTTPS 接口地址、模型名和 API Key。',true);return;}
  if(!beginWork())return;
  $('saveProfile').disabled=true;$('profileSelect').disabled=true;$('testApi').disabled=true;
  try{
   var secret=await TranslatorKeyVault.protect(draft.key);
   var next=TranslatorProfiles.upsert(profiles,{id:draft.id,name:draft.name,provider:draft.provider,endpoint:draft.endpoint,model:draft.model,secret:secret});
   TranslatorProfiles.save(localStorage,next);profiles=next;
   activeProfileId=draft.id;TranslatorProfiles.select(localStorage,draft.id);renderProfiles();
   status('已保存“'+draft.name+'”预设，Key 已用当前 Windows 账户加密。');
  }catch(error){status(error.message||'保存预设失败。',true);}
  finally{$('saveProfile').disabled=false;$('profileSelect').disabled=false;$('testApi').disabled=false;endWork();}
 };
 function call(method,payload){
  return new Promise(function(resolve,reject){
   TranslatorBridge.invoke(method,payload,function(error,result){error?reject(error):resolve(result);});
  });
 }
 function glossary(){
  var terms={};
  $('glossary').value.split(/\r?\n/).forEach(function(line){
   var index=line.indexOf('=');
   if(index>0)terms[line.slice(0,index).trim()]=line.slice(index+1).trim();
  });
  return terms;
 }
 function translationConfig(){
  return {endpoint:$('endpoint').value.trim(),model:$('model').value.trim(),apiKey:$('apiKey').value,targetLanguage:$('targetLanguage').value};
 }
 function fitOptions(){
  function percent(id,fallback,max){
   var raw=$(id).value,number=Number(raw);
   return raw===''||!isFinite(number)?fallback:Math.max(0,Math.min(max,number));
  }
  return {mode:$('fontFitMode').value==='preserve'?'preserve':'shrink',maxShrinkPercent:percent('maxShrinkPercent',10,30),pointWidthTolerance:percent('pointWidthTolerance',10,100)};
 }
 function countDone(){
  if(!job)return 0;
  var pending=job.state.pendingRetranslationIds||[];
  return segments.filter(function(segment){
   var item=job.translations[segment.id];
   return pending.indexOf(segment.id)<0&&item&&item.text&&item.text.trim();
  }).length;
 }
 function updateTranslateLabel(){
  var pending=job&&job.state.pendingRetranslationIds||[];
  $('translate').textContent=retranslateRequested?'重新翻译':pending.length||countDone()>0&&countDone()<segments.length?'继续翻译':'开始翻译';
 }
 function describeApiError(error){
  if(error.status===401||error.status===403)return 'API Key 无效、无权限或与接口地域不匹配。请检查后更换 Key。';
  if(error.status===404)return '接口地址或模型名称不正确，请检查高级设置。';
  if(error.status===429)return '请求过多或额度受限，请稍后重试。';
  if(error.status>=500)return '模型服务暂时不可用，请稍后重试。';
  if(error.retryable)return '网络连接失败或超时，请检查网络后重试。';
  if(error.message==='Model and API key required')return '请在高级设置中填写 API Key，并检查模型名称。';
  if(error.message==='Model endpoint must be HTTPS')return '请填写有效的 HTTPS 模型接口地址。';
  return error.message||'接口请求失败';
 }
 function showIssues(){
  var box=$('issues');
  box.innerHTML='';
  $('issueCount').textContent=issues.length+' 条';
  if(issues.length){
   issueIndex=Math.max(0,Math.min(issueIndex,issues.length-1));
   var item=issues[issueIndex];
   var row=document.createElement('div');
   row.className='issue';
   var reasons={'protected-text-review':'英文或参数需复核','overflow-review':'区域文字可能溢出','point-text-width-review':'点文字可能超出原位置'};
   var reason=reasons[item.reason]||item.reason;
   row.textContent=(issueIndex+1)+'/'+issues.length+' · 画板 '+((item.artboardIndex||0)+1)+' · 文字框 '+item.sessionId+' · '+reason+' ';
   var locate=document.createElement('button');
   locate.textContent='定位';
   locate.onclick=function(){call('locate',{sessionId:item.sessionId}).catch(function(error){status(error.message,true);});};
   row.appendChild(locate);
   var nav=document.createElement('div');nav.className='pager';
   var previous=document.createElement('button');previous.textContent='上一条';previous.disabled=issueIndex===0;
   previous.onclick=function(){if(issueIndex>0){issueIndex--;showIssues();}};
   var next=document.createElement('button');next.textContent='下一条';next.disabled=issueIndex===issues.length-1;
   next.onclick=function(){if(issueIndex<issues.length-1){issueIndex++;showIssues();}};
   nav.appendChild(previous);nav.appendChild(next);row.appendChild(nav);
   box.appendChild(row);
  }
  $('issueStep').hidden=!issues.length;
 }
 function showSegments(){
  var box=$('segments');
  box.innerHTML='';
  if(!$('reviewDetails').open||!job||!segments.length)return;
   reviewIndex=Math.max(0,Math.min(reviewIndex,segments.length-1));
   var segment=segments[reviewIndex];
   var row=document.createElement('div');
   var label=document.createElement('small');
   var source=document.createElement('div');
   var edit=document.createElement('textarea');
   row.className='item';
   label.textContent=(reviewIndex+1)+'/'+segments.length+' · 画板 '+(segment.artboardIndex+1)+' · 文字框 '+segment.sessionId;
   source.textContent=segment.sourceText;
   edit.value=job.translations[segment.id]?job.translations[segment.id].text:'';
   edit.placeholder='英文译文';
   edit.onchange=function(){
    job.setTranslation(segment.id,edit.value,true);
    persist();
    if(phase==='translated')$('apply').disabled=countDone()!==segments.length;
   };
   row.appendChild(label);
   row.appendChild(source);
   row.appendChild(edit);
   var nav=document.createElement('div');nav.className='pager';
   var previous=document.createElement('button');previous.textContent='上一条';previous.disabled=reviewIndex===0;
   previous.onclick=function(){if(reviewIndex>0){reviewIndex--;showSegments();}};
   var next=document.createElement('button');next.textContent='下一条';next.disabled=reviewIndex===segments.length-1;
   next.onclick=function(){if(reviewIndex<segments.length-1){reviewIndex++;showSegments();}};
   nav.appendChild(previous);nav.appendChild(next);row.appendChild(nav);
   box.appendChild(row);
 }
 $('reviewDetails').ontoggle=showSegments;
 $('editSettings').onclick=function(){
  if(busy||!snapshot)return;
  retranslateRequested=true;
  $('reviewDetails').open=false;
  $('segments').innerHTML='';
  $('translate').disabled=!segments.length;
  updateTranslateLabel();
  updateView('scanned');
  status('可修改高级设置后重新翻译；已手工修改的译文会保留。');
 };
 function jobKey(){return 'manualTranslatorJob:'+$('targetLanguage').value;}
 function persist(){if(job)localStorage.setItem(jobKey(),job.serialize());}
 function clearBulk(){
  snapshot=null;segments=[];reviewIndex=0;job=null;issues=[];issueIndex=0;retranslateRequested=false;settingsPage='main';
  $('reviewDetails').open=false;$('issueDetails').open=false;
  $('segments').innerHTML='';$('issues').innerHTML='';
  $('translate').disabled=true;$('apply').disabled=true;$('save').disabled=true;
  $('output').value='';
  $('summary').textContent='请读取当前文档以批量翻译中文文字框。';
  updateView('initial');
 }
 $('targetLanguage').onchange=function(){
  if(busy)return;
  clearBulk();
  status('目标语言已切换。批量翻译请重新读取文档；手动翻译可直接选中文字框。');
 };
 $('backToStart').onclick=function(){
  if(busy)return;
  clearBulk();
  status('可继续选中文字框翻译，或重新读取当前文档。');
 };
 function nodeTransport(endpoint,body,key){
  return new Promise(function(resolve,reject){
   var url=require('url').parse(endpoint),https=require('https'),payload=JSON.stringify(body);
   var request=https.request({hostname:url.hostname,port:url.port||443,path:url.path,method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,'Content-Length':Buffer.byteLength(payload)},timeout:45000},function(response){
    var result='';
    response.on('data',function(chunk){result+=chunk;if(result.length>2000000)request.abort();});
    response.on('end',function(){
     if(response.statusCode<200||response.statusCode>=300){var error=Error('HTTP '+response.statusCode);error.status=response.statusCode;return reject(error);}
     try{resolve(JSON.parse(result));}catch(error){reject(Error('Model returned invalid JSON'));}
    });
   });
   request.on('error',function(error){error.retryable=true;reject(error);});
   request.on('timeout',function(){request.abort();var error=Error('Request timeout');error.retryable=true;reject(error);});
   request.write(payload);
   request.end();
  });
 }

 $('testApi').onclick=async function(){
  if(!beginWork())return;
  $('testApi').disabled=true;
  $('translate').disabled=true;
  try{
   status('正在测试连接…');
   await TranslatorTranslation.testConnection(translationConfig(),nodeTransport);
   status('连接成功：当前 API Key、接口和模型可用。');
  }catch(error){status(describeApiError(error),true);}
  finally{
   $('testApi').disabled=false;
   if(phase==='scanned')$('translate').disabled=!segments.length;
   endWork();
  }
 };

 $('scan').onclick=async function(){
  if(!beginWork())return;
  snapshot=null;segments=[];reviewIndex=0;job=null;issues=[];issueIndex=0;retranslateRequested=false;
  $('reviewDetails').open=false;
  $('issueDetails').open=false;
  $('segments').innerHTML='';
  $('issues').innerHTML='';
  $('translate').disabled=true;
  $('apply').disabled=true;
  $('save').disabled=true;
  $('output').value='';
  $('summary').textContent='正在读取当前文档…';
  updateView('initial');
  try{
   status('正在扫描 Illustrator…');
   snapshot=await call('scan',{});
   var result=TranslatorSegments.createSegments(snapshot);
   segments=result.segments;
   issues=result.issues;
   job=TranslatorJob.createJob(snapshot,segments);
   try{
    var saved=localStorage.getItem(jobKey())||($('targetLanguage').value==='en'?localStorage.getItem('manualTranslatorJob'):null);
    if(saved)job=TranslatorJob.restoreJob(saved,snapshot.fingerprint);
   }catch(_){}
   var path=require('path');
   if(snapshot.sourcePath)$('output').value=path.join(path.dirname(snapshot.sourcePath),path.parse(snapshot.sourcePath).name+'_'+$('targetLanguage').value+'.ai');
   $('summary').textContent=snapshot.documentName+' · '+snapshot.artboards.length+' 画板 · '+segments.length+' 条待翻译 · '+issues.length+' 条需复核';
   $('progress').textContent=segments.length+' 条';
   showIssues();
   $('translate').disabled=!segments.length;
   $('testApi').disabled=false;
   var done=countDone(),complete=segments.length>0&&done===segments.length;
   $('apply').disabled=!complete;
   updateTranslateLabel();
   updateView(complete?'translated':'scanned');
   status(complete?'已恢复译文，可展开校对并应用。':done?'已恢复 '+done+'/'+segments.length+' 条，可在高级设置中填写 Key 后继续翻译。':segments.length?'读取完成。请在高级设置中填写 API Key 后开始翻译。':'未找到可翻译的中文文字框。');
  }catch(error){
   snapshot=null;segments=[];job=null;issues=[];
   $('summary').textContent='请先在 Illustrator 中打开 AI 或可编辑 PDF。';
   updateView('initial');
   status(error.message,true);
  }finally{endWork();}
 };

 $('manualTranslate').onclick=async function(){
  if(!beginWork())return;
  $('testApi').disabled=true;
  $('translate').disabled=true;
  try{
   status('正在读取选中的文字框…');
   var selected=await call('scanSelection',{});
   var manualSegments=(selected.frames||[]).map(function(frame){
    var prepared=TranslatorSegments.protectManualTokens(frame.sourceText);
    return {id:'s'+frame.sessionId,sessionId:frame.sessionId,sourceText:frame.sourceText,template:prepared.template,tokens:prepared.tokens,manual:true};
   });
   if(!manualSegments.length)throw Error('请用选择工具选中文字框对象');
   status('正在翻译 '+manualSegments.length+' 个选中文字框…');
   var translated=await TranslatorTranslation.translateSegments(manualSegments,glossary(),translationConfig(),nodeTransport);
   var changes=translated.map(function(item){
    var frame=selected.frames[item.sessionId];
    return {sessionId:item.sessionId,sourceText:frame.sourceText,bounds:frame.bounds,translation:item.translation};
   });
   status('正在替换选中的文字框…');
   var result=await call('applySelection',{changes:changes,fitOptions:fitOptions()});
   clearBulk();
   if(result.failed)throw Error('已替换 '+result.applied+' 个，'+result.failed+' 个写入失败；请检查当前文档。');
   status('已替换 '+result.applied+' 个文字框'+(selected.skipped?'，跳过 '+selected.skipped+' 个非文字对象':'')+(result.issues&&result.issues.length?'；'+result.issues.length+' 个版面位置需复核':'')+'。可在 Illustrator 中撤销；保存前请检查版面。');
  }catch(error){status(describeApiError(error),true);}
  finally{
   $('testApi').disabled=false;
   if(phase==='scanned')$('translate').disabled=!segments.length;
   endWork();
  }
 };

 $('translate').onclick=async function(){
  if(!beginWork())return;
  try{
   if(!snapshot)throw Error('请先读取当前文档');
   $('translate').disabled=true;
   $('testApi').disabled=true;
   if(retranslateRequested){
    var redo=segments.filter(function(segment){
     var item=job.translations[segment.id];
     return !item||!item.reviewed;
    }).map(function(segment){return segment.id;});
    job.startRetranslation(redo);
    persist();
    retranslateRequested=false;
   }
   status('正在翻译：已完成 '+countDone()+'/'+segments.length+' 条…');
   var pending=job.state.pendingRetranslationIds||[];
   var todo=segments.filter(function(segment){
    var item=job.translations[segment.id];
    return pending.indexOf(segment.id)>=0||(!item||!item.text||!item.text.trim())&&!(item&&item.reviewed);
   });
   var translated=todo.length?await TranslatorTranslation.translateSegments(todo,glossary(),translationConfig(),nodeTransport,function(batch){
    batch.forEach(function(item){job.setTranslation(item.id,item.translation,false);});
    job.markBatchDone(batch.map(function(item){return item.id;}));
    persist();
    status('正在翻译：已完成 '+countDone()+'/'+segments.length+' 条…');
   }):[];
   translated.forEach(function(item){job.setTranslation(item.id,item.translation,false);});
   job.markBatchDone(translated.map(function(item){return item.id;}));
   persist();
   $('reviewDetails').open=false;
   $('segments').innerHTML='';
   $('progress').textContent=segments.length+' 条';
   var hasAutomaticPending=segments.some(function(segment){
    var item=job.translations[segment.id];
    return !item||!item.reviewed&&(!item.text||!item.text.trim());
   })||job.state.pendingRetranslationIds.length>0;
   if(hasAutomaticPending){
    $('apply').disabled=true;
    updateTranslateLabel();
    updateView('scanned');
    status('已完成 '+countDone()+'/'+segments.length+' 条，请继续翻译。');
   }else{
    $('apply').disabled=countDone()!==segments.length;
    updateView('translated');
    status($('apply').disabled?'还有空译文，请展开校对填写。':'翻译完成，可展开校对，然后应用到工作副本。');
   }
  }catch(error){
   var completed=countDone();
   updateTranslateLabel();
   status('已完成 '+completed+'/'+segments.length+' 条。'+describeApiError(error)+' 修正后点击'+(completed?'继续翻译。':'开始翻译。'),true);
  }
  finally{
   $('testApi').disabled=false;
   if(phase==='scanned')$('translate').disabled=!segments.length;
   endWork();
  }
 };

 $('apply').onclick=async function(){
  if(!beginWork())return;
  try{
   if(!snapshot)throw Error('请先读取当前文档');
   var changes=segments.map(function(segment){
    var translation=job.translations[segment.id];
    if(!translation||!translation.text.trim())throw Error('仍有空译文：文字框 '+segment.sessionId);
    var frame=snapshot.frames[segment.sessionId];
    return {sessionId:segment.sessionId,sourceText:segment.sourceText,bounds:frame.bounds,translation:translation.text};
   });
   var fs=require('fs'),path=require('path'),os=require('os'),dir=path.join(os.tmpdir(),'illustrator-manual-translator');
   if(!fs.existsSync(dir))fs.mkdirSync(dir);
   var temp=path.join(dir,'working-'+Date.now()+'-'+Math.floor(Math.random()*1e8)+'.ai');
   $('apply').disabled=true;
   $('reviewDetails').open=false;
   $('reviewDetails').hidden=true;
   $('segments').innerHTML='';
   $('editSettings').disabled=true;
   status('正在生成工作副本并回写…');
   var result=await call('apply',{documentFingerprint:snapshot.fingerprint,tempAiPath:temp,changes:changes,fitOptions:fitOptions()});
   issues=issues.concat(result.issues||[]);
   showIssues();
   if(result.failed)throw Error(result.failed+' 条写入失败。请定位异常并重新读取工作副本。');
   job.markApplied();
   persist();
   $('save').disabled=false;
   updateView('applied');
   status('已应用 '+result.applied+' 条。检查版面后保存翻译版。');
  }catch(error){status(error.message,true);}
  finally{
   $('reviewDetails').hidden=false;
   $('editSettings').disabled=false;
   if(phase==='translated')$('apply').disabled=false;
   endWork();
  }
 };

 $('save').onclick=async function(){
  if(!beginWork())return;
  try{
   var target=$('output').value.trim();
   if(!target)throw Error('请输入完整保存路径');
   $('save').disabled=true;
   status('正在另存翻译版…');
   var result=await call('saveCopy',{targetPath:target});
   updateView('saved');
   status('已保存：'+result.path);
  }catch(error){status(error.message,true);}
  finally{$('save').disabled=false;endWork();}
 };
 renderProfiles();
 updateView('initial');
 var lastProfile=TranslatorProfiles.selected(localStorage);
 if(lastProfile)activateProfile(lastProfile);
})();
