const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSegments,protectTokens,protectManualTokens,restoreTokens}=require('../extension/js/core/segments');
test('manual translation protects model numbers but leaves English prose translatable',()=>{
 const prepared=protectManualTokens('Connect Free3-R to a 220 V outlet');
 assert.ok(prepared.template.includes('Connect'));
 assert.ok(prepared.template.includes('to a'));
 assert.equal(restoreTokens(prepared.template,prepared.tokens),'Connect Free3-R to a 220 V outlet');
 assert.ok(prepared.tokens.includes('Free3-R'));
 assert.ok(prepared.tokens.includes('220 V'));
});
test('only safe Chinese frames become segments',()=>{
 const snapshot={frames:[
  {sessionId:0,artboardIndex:0,sourceText:'产品说明',flags:{}},
  {sessionId:1,artboardIndex:0,sourceText:'Quick Start',flags:{}},
  {sessionId:2,artboardIndex:1,sourceText:'电压 220 V',flags:{}},
  {sessionId:3,artboardIndex:1,sourceText:'已锁定',flags:{locked:true}},
  {sessionId:4,artboardIndex:-1,sourceText:'画板外',flags:{}},
  {sessionId:5,artboardIndex:1,sourceText:'中文 English',flags:{}},
  {sessionId:6,artboardIndex:1,sourceText:'双色文字',flags:{mixedStyle:true}},
  {sessionId:7,artboardIndex:0,sourceText:'跨画板',flags:{crossArtboard:true}}
 ]};
 const r=createSegments(snapshot);
 assert.deepEqual(r.segments.map(x=>x.sessionId),[0,2,5]);
 assert.equal(r.issues.length,4);
 assert.equal(restoreTokens(r.segments[2].template,r.segments[2].tokens),'中文 English');
});
test('reviewed translations must preserve protected English and numbers',()=>{
 const {validateProtectedText}=require('../extension/js/core/segments');
 assert.equal(validateProtectedText('使用USB连接 220 V','Use USB at 220 V'),true);
 assert.equal(validateProtectedText('使用USB连接 220 V','Use Bluetooth at 220 V'),false);
 assert.equal(validateProtectedText('使用USB连接 220 V','Use USB at 110 V'),false);
 assert.equal(validateProtectedText('步骤 1','Step 11'),false);
 assert.equal(validateProtectedText('使用USB连接','Use USB-C'),false);
 assert.equal(validateProtectedText('使用USB连接','Use USB and USB'),false);
});
test('protected technical tokens round trip and changes fail',()=>{
 const p=protectTokens('电压 220 V，型号 AB-1200');
 assert.match(p.template,/\[\[KEEP_0\]\]/);
 assert.equal(restoreTokens(p.template,p.tokens),'电压 220 V，型号 AB-1200');
 assert.throws(()=>restoreTokens(p.template.replace('[[KEEP_0]]','x'),p.tokens));
 assert.throws(()=>restoreTokens('Use [[KEEP_f87]]',[]));
});

test('sentence punctuation after protected tokens is not a model change',()=>{
 const {validateProtectedText}=require('../extension/js/core/segments');
 const source='1、Free3开机后，把档位切换到【R】\r2、在设备蓝牙搜索【Free3-R】进行配对连接';
 const translation='1 and Free3: After powering on, set the mode to R.\r2: Search for and pair with Free3-R via Bluetooth.';
 assert.equal(validateProtectedText(source,translation),true);
 assert.equal(validateProtectedText('切换到【R】','Only Free3-R is mentioned.'),false);
 assert.equal(validateProtectedText('电压 1','Voltage 1.5 V'),false);
});

test('protected fragments inside phone numbers standards units and page labels stay valid',()=>{
 const {validateProtectedText}=require('../extension/js/core/segments');
 const cases=[
  ['热线：(86)400-6680-718','Hotline: (86)400-6680-718'],
  ['执行标准：GB 4943.1-2022','Compliance Standard: GB 4943.1-2022'],
  ['电池 3.7V/380mAh','Battery 3.7V/380mAh'],
  ['目录.02','Table of Contents.02'],
  ['切换到【P】并搜索【Free3-P】','Switch to P and Press search for Free3-P']
 ];
 cases.forEach(([source,translation])=>assert.equal(validateProtectedText(source,translation),true,source));
});
