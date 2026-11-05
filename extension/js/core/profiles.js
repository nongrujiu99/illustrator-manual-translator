(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TranslatorProfiles=api;})(this,function(){
 'use strict';
 var LIST_KEY='manualTranslatorProfiles:v1',SELECTED_KEY='manualTranslatorSelectedProfile:v1';
 function clean(item){
  if(!item||typeof item.id!=='string'||typeof item.name!=='string'||typeof item.endpoint!=='string'||typeof item.model!=='string'||typeof item.secret!=='string')return null;
  var name=item.name.trim(),endpoint=item.endpoint.trim(),model=item.model.trim();
  if(!item.id||!name||!/^https:\/\/[^/]+\//i.test(endpoint)||!model||!item.secret)return null;
  return {id:item.id,name:name,provider:item.provider==='aliyun-cn'||item.provider==='aliyun-intl'?item.provider:'custom',endpoint:endpoint,model:model,secret:item.secret};
 }
 function load(storage){
  try{var value=JSON.parse(storage.getItem(LIST_KEY)||'[]');return Array.isArray(value)?value.map(clean).filter(Boolean):[];}
  catch(_){return [];}
 }
 function save(storage,items){storage.setItem(LIST_KEY,JSON.stringify(items.map(clean).filter(Boolean)));}
 function upsert(items,item){
  var cleaned=clean(item);if(!cleaned)throw Error('预设名称、HTTPS 地址、模型名和 API Key 都必须填写。');
  for(var i=0;i<items.length;i++)if(items[i].name.toLowerCase()===cleaned.name.toLowerCase()&&items[i].id!==cleaned.id)throw Error('已有同名预设，请换一个名称。');
  var result=items.slice(),found=false;
  for(i=0;i<result.length;i++)if(result[i].id===cleaned.id){result[i]=cleaned;found=true;break;}
  if(!found)result.push(cleaned);
  return result;
 }
 function selected(storage){return storage.getItem(SELECTED_KEY)||'';}
 function select(storage,id){storage.setItem(SELECTED_KEY,id||'');}
 return {load:load,save:save,upsert:upsert,selected:selected,select:select};
});
