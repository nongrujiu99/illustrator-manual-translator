const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function selectedHost(selection){
 const document={name:'selected.ai',typename:'Document',artboards:[{artboardRect:[0,100,100,0]}],selection:[]};
 const text={typename:'TextFrame',contents:selection==='empty'?'  ':'产品说明',geometricBounds:[0,100,60,80],textRange:{characters:[],characterAttributes:{size:12}},kind:'TextType.POINTTEXT',hidden:false,locked:false,parent:document};
 document.selection=selection==='none'?null:selection==='edit'?[{typename:'TextRange',contents:'产品'}]:selection==='mixed'?[text,{typename:'PathItem'}]:[text];
 const context={app:{documents:[document],activeDocument:document,redraw(){}}};
 const hostSource=fs.readFileSync(path.join(__dirname,'../extension/host/bootstrap.jsx'),'utf8').replace(/^#target[^\r\n]*\r?\n/,'');
 vm.runInNewContext(hostSource,context);
 return {host:context.TranslatorHost,document,text};
}

test('manual scan reads selected text frame without a document scan',()=>{
 const {host}=selectedHost('mixed');
 const result=JSON.parse(host.scanSelection());
 assert.equal(result.ok,true);
 assert.equal(result.data.frames.length,1);
 assert.equal(result.data.frames[0].sourceText,'产品说明');
 assert.equal(result.data.skipped,1);
});

test('manual scan rejects empty selection and text editing state',()=>{
 for(const state of ['none','edit','empty']){
  const {host}=selectedHost(state);
  const result=JSON.parse(host.scanSelection());
  assert.equal(result.ok,false);
  assert.match(result.error,/select|文字框/i);
 }
});

test('manual writeback replaces selected frame and rejects a changed source',()=>{
 const first=selectedHost();
 const scanned=JSON.parse(first.host.scanSelection());
 assert.equal(scanned.ok,true);
 const change={sessionId:0,sourceText:'产品说明',bounds:[0,100,60,80],translation:'Product Guide'};
 const applied=JSON.parse(first.host.applySelection(JSON.stringify({changes:[change]})));
 assert.equal(applied.ok,true);
 assert.equal(first.text.contents,'Product Guide');
 const second=selectedHost();
 second.host.scanSelection();
 second.text.contents='已修改';
 const rejected=JSON.parse(second.host.applySelection(JSON.stringify({changes:[change]})));
 assert.equal(rejected.ok,false);
 assert.equal(second.text.contents,'已修改');
});

test('manual writeback rejects changed selection',()=>{
 const {host,document,text}=selectedHost();
 host.scanSelection();
 document.selection=[];
 const result=JSON.parse(host.applySelection(JSON.stringify({changes:[{sessionId:0,sourceText:'产品说明',bounds:[0,100,60,80],translation:'Product Guide'}]})));
 assert.equal(result.ok,false);
 assert.equal(text.contents,'产品说明');
});

function fittedSelection(kind,originalWidth,translatedWidth,fitAtSize){
 const document={name:'layout.ai',typename:'Document',artboards:[{artboardRect:[0,100,200,0]}],selection:[]};
 const attributes={size:12};
 const frame={typename:'TextFrame',contents:'中文',kind,hidden:false,locked:false,parent:document,
  get geometricBounds(){return [0,100,this.contents==='中文'?originalWidth:translatedWidth*attributes.size/12,80];},
  textRange:{characters:[{characterAttributes:attributes}],characterAttributes:attributes,
   get lines(){return [{contents:attributes.size<=fitAtSize?frame.contents:'短'}];}}};
 document.selection=[frame];
 const context={app:{documents:[document],activeDocument:document,redraw(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/host/bootstrap.jsx'),'utf8').replace(/^#target[^\r\n]*\r?\n/,''),context);
 const host=context.TranslatorHost;
 const scan=JSON.parse(host.scanSelection());
 assert.equal(scan.ok,true);
 const change={sessionId:0,sourceText:'中文',bounds:[0,100,originalWidth,80],translation:'English translation'};
 return {host,frame,attributes,change};
}

test('preserve mode keeps original area-text size and reports overflow',()=>{
 const {host,attributes,change}=fittedSelection('TextType.AREATEXT',40,60,10.8);
 const result=JSON.parse(host.applySelection(JSON.stringify({changes:[change],fitOptions:{mode:'preserve',maxShrinkPercent:20,pointWidthTolerance:10}})));
 assert.equal(result.ok,true);
 assert.equal(attributes.size,12);
 assert.equal(result.data.issues[0].reason,'overflow-review');
});

test('area text shrinks only as far as configured and stops when it fits',()=>{
 const {host,attributes,change}=fittedSelection('TextType.AREATEXT',40,60,9.6);
 const result=JSON.parse(host.applySelection(JSON.stringify({changes:[change],fitOptions:{mode:'shrink',maxShrinkPercent:20,pointWidthTolerance:10}})));
 assert.equal(result.ok,true);
 assert.equal(attributes.size,9.6);
 assert.equal(result.data.issues.length,0);
});

test('point text follows width tolerance without exceeding shrink limit',()=>{
 const first=fittedSelection('TextType.POINTTEXT',100,120,0);
 const result=JSON.parse(first.host.applySelection(JSON.stringify({changes:[first.change],fitOptions:{mode:'shrink',maxShrinkPercent:20,pointWidthTolerance:10}})));
 assert.equal(result.ok,true);
 assert.equal(first.attributes.size,10.8);
 assert.equal(result.data.issues.length,0);
 const second=fittedSelection('TextType.POINTTEXT',100,120,0);
 const limited=JSON.parse(second.host.applySelection(JSON.stringify({changes:[second.change],fitOptions:{mode:'shrink',maxShrinkPercent:5,pointWidthTolerance:10}})));
 assert.equal(limited.ok,true);
 assert.equal(second.attributes.size,11.4);
 assert.equal(limited.data.issues[0].reason,'point-text-width-review');
});

function applyError(source,translation){
 const document={name:'sample.ai',typename:'Document',artboards:[{artboardRect:[0,100,100,0]}]};
 const frame={contents:source,geometricBounds:[0,100,100,0],textRange:{characters:[]},kind:'TextType.POINTTEXT',hidden:false,locked:false,parent:document};
 document.textFrames=[frame];
 const context={app:{documents:[document],activeDocument:document},File:function(){this.name='work.ai';this.exists=true;}};
 const hostSource=fs.readFileSync(path.join(__dirname,'../extension/host/bootstrap.jsx'),'utf8').replace(/^#target[^\r\n]*\r?\n/,'');
 vm.runInNewContext(hostSource,context);
 const scanned=JSON.parse(context.TranslatorHost.scan());
 assert.equal(scanned.ok,true);
 const result=JSON.parse(context.TranslatorHost.apply(JSON.stringify({documentFingerprint:scanned.data.fingerprint,tempAiPath:'work.ai',changes:[{sessionId:0,sourceText:source,bounds:[0,100,100,0],translation}]})));
 assert.equal(result.ok,false);
 return result.error;
}

test('Illustrator host accepts preserved R followed by sentence punctuation',()=>{
 const source='1、Free3开机后，把档位切换到【R】\r2、在设备蓝牙搜索【Free3-R】进行配对连接';
 const translation='1 and Free3: After powering on, set the mode to R.\r2: Search for and pair with Free3-R via Bluetooth.';
 assert.match(applyError(source,translation),/Working copy path must be a new/);
});

test('Illustrator host accepts intact phone number and standard fragments',()=>{
 const source='热线：(86)400-6680-718；标准 GB 4943.1-2022；目录.02';
 const translation='Hotline: (86)400-6680-718; Standard GB 4943.1-2022; Contents.02';
 assert.match(applyError(source,translation),/Working copy path must be a new/);
});

test('Illustrator host permits repeated protected text during writeback',()=>{
 const source='使用USB连接电脑';
 const translation='Connect via USB cable USB to the computer';
 assert.match(applyError(source,translation),/Working copy path must be a new/);
});
