const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createJob,restoreJob}=require('../extension/js/core/job');
test('review and restore never serialize API key',()=>{
 const j=createJob({documentName:'sample.ai',fingerprint:'abc',frames:[]},[{id:'f0',sourceText:'中文'}]);
 j.setTranslation('f0','English'); j.setTranslation('f0','Reviewed',true);
 const data=j.serialize(); assert.doesNotMatch(data,/secret|apiKey/);
 const r=restoreJob(data,'abc'); assert.equal(r.translations.f0.text,'Reviewed');
 assert.throws(()=>restoreJob(data,'different'));
});

test('pending retranslation survives restore while old drafts remain available',()=>{
 const snapshot={documentName:'sample.ai',fingerprint:'abc'};
 const segments=[{id:'f0',sourceText:'中文一'},{id:'f1',sourceText:'中文二'}];
 const job=createJob(snapshot,segments);
 job.setTranslation('f0','Old one',false);
 job.setTranslation('f1','Old two',false);
 job.startRetranslation(['f0','f1']);
 job.markBatchDone(['f0']);
 const restored=restoreJob(job.serialize(),'abc');
 assert.deepEqual(restored.state.pendingRetranslationIds,['f1']);
 assert.equal(restored.translations.f1.text,'Old two');
});
