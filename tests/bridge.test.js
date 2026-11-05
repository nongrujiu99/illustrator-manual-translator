const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function bridgeWithResponse(response){
 const context={__adobe_cep__:{evalScript:(_script,done)=>done(response)}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/js/bridge.js'),'utf8'),context);
 return context.TranslatorBridge;
}

test('bridge reports a failed Illustrator script without leaking a JSON parser error',()=>{
 const bridge=bridgeWithResponse('EvalScript error.');
 bridge.invoke('scan',{},(error)=>{
  assert.match(error.message,/Illustrator 脚本执行失败/);
  assert.match(error.message,/EvalScript error/);
  assert.doesNotMatch(error.message,/Unexpected token/);
 });
});

test('bridge still accepts a successful JSON result',()=>{
 const bridge=bridgeWithResponse('{"ok":true,"data":{"artboards":44},"error":null}');
 bridge.invoke('scan',{},(error,data)=>{
  assert.equal(error,null);
  assert.equal(data.artboards,44);
 });
});

test('bridge accepts both manual selection operations',()=>{
 const bridge=bridgeWithResponse('{"ok":true,"data":{"applied":1},"error":null}');
 for(const method of ['scanSelection','applySelection']){
  bridge.invoke(method,{},(error,data)=>{
   assert.equal(error,null);
   assert.equal(data.applied,1);
  });
 }
});
