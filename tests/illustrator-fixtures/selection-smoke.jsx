#target illustrator
(function(){
 var root=File($.fileName).parent.parent.parent;
 var out=new File(root.fsName+'/tmp/selection-smoke.txt');
 var doc=null;
 out.encoding='UTF-8';out.open('w');
 try{
  var hostFile=new File(root.fsName+'/extension/host/bootstrap.jsx');hostFile.encoding='UTF-8';
  if(!hostFile.open('r'))throw Error('Cannot read host script: '+hostFile.error);
  var hostSource=hostFile.read(hostFile.length);hostFile.close();
  eval(hostSource.replace(/^#target[^\r\n]*[\r\n]+/,''));
  doc=app.documents.add();
  var frame=doc.textFrames.add();frame.position=[50,250];frame.contents='产品说明';
  var frame2=doc.textFrames.add();frame2.position=[50,210];frame2.contents='注意安全';
  app.redraw();frame.selected=true;frame2.selected=true;app.redraw();
  var scan=JSON.parse(TranslatorHost.scanSelection());
  out.writeln('SCAN '+scan.ok+' COUNT '+(scan.ok?scan.data.frames.length:scan.error));
  if(scan.ok){
   var changes=[];
   for(var i=0;i<scan.data.frames.length;i++){var f=scan.data.frames[i];changes.push({sessionId:f.sessionId,sourceText:f.sourceText,bounds:f.bounds,translation:f.sourceText==='产品说明'?'Product Guide':'Safety Notice'});}
   var apply=JSON.parse(TranslatorHost.applySelection(JSON.stringify({changes:changes})));
   out.writeln('APPLY '+apply.ok+' RESULT '+(apply.ok?apply.data.applied:apply.error));
   out.writeln('CONTENTS '+frame.contents+' | '+frame2.contents+' TYPE '+frame.typename);
  }
 }catch(e){out.writeln('ERROR '+e+' LINE '+e.line);}
 finally{if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);out.close();}
})();
