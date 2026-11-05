(function(root,factory){
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.TranslatorJob=api;
})(this,function(){
 'use strict';
 function createJob(snapshot,segments){
  var state={fingerprint:snapshot.fingerprint,documentName:snapshot.documentName,segments:segments,translations:{},pendingRetranslationIds:[],applied:false};
  return {
   state:state,
   translations:state.translations,
   setTranslation:function(id,text,reviewed){
    if(!segments.some(function(segment){return segment.id===id;}))throw Error('Unknown segment');
    if(this.translations[id]&&this.translations[id].reviewed&&!reviewed)return;
    this.translations[id]={text:text,reviewed:!!reviewed};
   },
   startRetranslation:function(ids){
    state.pendingRetranslationIds=ids.filter(function(id,index){
     if(!segments.some(function(segment){return segment.id===id;}))throw Error('Unknown segment');
     return ids.indexOf(id)===index;
    });
   },
   markBatchDone:function(ids){
    state.pendingRetranslationIds=state.pendingRetranslationIds.filter(function(id){return ids.indexOf(id)<0;});
   },
   markApplied:function(){
    if(Object.keys(this.translations).length!==segments.length||state.pendingRetranslationIds.length)throw Error('Translation incomplete');
    state.applied=true;
   },
   serialize:function(){return JSON.stringify(state);}
  };
 }
 function restoreJob(json,fingerprint){
  var state=JSON.parse(json);
  if(state.fingerprint!==fingerprint)throw Error('Document changed since task snapshot');
  var job=createJob({fingerprint:state.fingerprint,documentName:state.documentName},state.segments);
  job.translations=state.translations||{};
  job.state.translations=job.translations;
  job.startRetranslation(state.pendingRetranslationIds||[]);
  job.state.applied=!!state.applied;
  return job;
 }
 return {createJob:createJob,restoreJob:restoreJob};
});
