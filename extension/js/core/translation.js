(function(root,factory){
 var segmentsApi=root.TranslatorSegments;
 if(!segmentsApi&&typeof module==='object'&&module.exports)segmentsApi=require('./segments');
 if(!segmentsApi)throw Error('TranslatorSegments unavailable');
 var api=factory(segmentsApi);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.TranslatorTranslation=api;
})(this,function(segmentsApi){
 'use strict';
 var LANGUAGE_NAMES={en:'English',zh:'Simplified Chinese','zh-TW':'Traditional Chinese',ja:'Japanese',ko:'Korean',fr:'French',de:'German',es:'Spanish',pt:'Portuguese',ru:'Russian'};
 function cleanEndpoint(value){
  if(!/^https:\/\/[^/]+\//i.test(value||''))throw Error('Model endpoint must be HTTPS');
  return value;
 }
 function checkConfig(config){
  cleanEndpoint(config.endpoint);
  if(!config.model||!config.apiKey)throw Error('Model and API key required');
 }
 function parseResponse(response,batch){
  var raw=response&&response.choices&&response.choices[0]&&response.choices[0].message&&response.choices[0].message.content;
  if(typeof raw!=='string')throw Error('Model response missing content');
  raw=raw.replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g,'');
  var data=JSON.parse(raw);
  if(!data.translations||data.translations.length!==batch.length)throw Error('Model returned an incomplete batch');
  var seen={},result=[],i;
  for(i=0;i<data.translations.length;i++){
   var item=data.translations[i];
   if(seen[item.id]||typeof item.text!=='string')throw Error('Duplicate or invalid translation');
   if(!item.text.trim())throw Error('Empty translation '+item.id);
   seen[item.id]=true;
  }
  for(i=0;i<batch.length;i++){
   var segment=batch[i];
   if(!seen[segment.id])throw Error('Missing segment '+segment.id);
   var translated=data.translations.filter(function(item){return item.id===segment.id;})[0];
   result.push({id:segment.id,sessionId:segment.sessionId,translation:segmentsApi.restoreTokens(translated.text,segment.tokens||[])});
  }
  return result;
 }
 async function requestWithRetry(config,body,transport){
  var response,error;
  for(var attempt=0;attempt<3;attempt++){
   try{
    response=await transport(config.endpoint,body,config.apiKey);
    error=null;
    break;
   }catch(caught){
    error=caught;
    if(!(caught.retryable||caught.status===429||caught.status>=500)||attempt===2)break;
    await new Promise(function(resolve){setTimeout(resolve,300*(attempt+1));});
   }
  }
  if(error){
   var failure=Error('Translation request failed: '+(error.status||error.message||'network error'));
   failure.status=error.status;
   failure.retryable=error.retryable;
   throw failure;
  }
  return response;
 }
 async function translateBatch(batch,glossary,config,transport,onBatch,strict){
   var language=LANGUAGE_NAMES[config.targetLanguage||'en'];
   if(!language)throw Error('Unsupported target language');
   var manual=batch[0]&&batch[0].manual;
   var body={
    model:config.model,
    temperature:0,
    messages:[
     {role:'system',content:(manual?'Translate selected Illustrator text':'Translate Chinese parts of Illustrator manual text')+' into concise '+language+'. Preserve every [[KEEP_n]] marker exactly once and unchanged. Keep paragraph breaks. Return only JSON: {"translations":[{"id":"...","text":"..."}]}. Do not omit IDs. '+(strict?'Use only the markers present in this item; do not add or remove any marker. ':'')+'Glossary: '+JSON.stringify(glossary||{})},
     {role:'user',content:JSON.stringify(batch.map(function(segment){return {id:segment.id,text:segment.template};}))}
    ]
   };
   var response=await requestWithRetry(config,body,transport);
   var parsed;
   try{parsed=parseResponse(response,batch);}
   catch(error){
    if(batch.length>1){
     var middle=Math.ceil(batch.length/2);
     var first=await translateBatch(batch.slice(0,middle),glossary,config,transport,onBatch,false);
     var second=await translateBatch(batch.slice(middle),glossary,config,transport,onBatch,false);
     return first.concat(second);
    }
    if(!strict)return translateBatch(batch,glossary,config,transport,onBatch,true);
    throw Error('文字框 '+(batch[0].sessionId==null?batch[0].id:batch[0].sessionId)+' 的模型译文未通过占位符校验：'+error.message);
   }
   if(onBatch)await onBatch(parsed);
   return parsed;
 }
 async function translateSegments(segments,glossary,config,transport,onBatch){
  checkConfig(config);
  var result=[];
  for(var start=0;start<segments.length;start+=12){
   var batch=segments.slice(start,start+12);
   result=result.concat(await translateBatch(batch,glossary,config,transport,onBatch,false));
  }
  return result;
 }
 async function testConnection(config,transport){
  checkConfig(config);
  var body={model:config.model,max_tokens:16,messages:[{role:'user',content:'Reply with OK.'}]};
  var response=await transport(config.endpoint,body,config.apiKey);
  if(!response||!response.choices||!response.choices.length||!response.choices[0].message||typeof response.choices[0].message.content!=='string')throw Error('Model response missing content');
  return true;
 }
 return {translateSegments:translateSegments,parseResponse:parseResponse,testConnection:testConnection,languageName:function(code){return LANGUAGE_NAMES[code]||null;}};
});
