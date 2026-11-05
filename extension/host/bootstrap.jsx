#target illustrator
if (typeof JSON === 'undefined') {
  $.global.JSON = {
    stringify:function(v){function q(s){return '"'+String(s).replace(/[\\"\u0000-\u001f]/g,function(c){var m={'\\':'\\\\','"':'\\"','\n':'\\n','\r':'\\r','\t':'\\t'};return m[c]||'\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);})+'"';}
      function enc(x){if(x===null)return 'null';if(typeof x==='string')return q(x);if(typeof x==='number'||typeof x==='boolean')return String(x);if(x instanceof Array){var a=[];for(var i=0;i<x.length;i++)a.push(enc(x[i]));return '['+a.join(',')+']';}if(typeof x==='object'){var o=[];for(var k in x)if(x.hasOwnProperty(k)&&typeof x[k]!=='undefined')o.push(q(k)+':'+enc(x[k]));return '{'+o.join(',')+'}';}return 'null';}return enc(v);},
    parse:function(s){return eval('('+s+')');}
  };
}
var TranslatorHost = (function () {
  var session = null, manualSession = null;
  function reply(data) { return JSON.stringify({ok:true,data:data,error:null}); }
  function fail(e) { return JSON.stringify({ok:false,data:null,error:String(e)}); }
  function parse(s) { return s ? eval('('+s+')') : {}; }
  function hash(s) { var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return String(h>>>0); }
  function bounds(f) { var b=f.geometricBounds;return [Math.round(b[0]*100)/100,Math.round(b[1]*100)/100,Math.round(b[2]*100)/100,Math.round(b[3]*100)/100]; }
  function sameBounds(a,b) { if(!a||!b||a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>.2)return false;return true; }
  function visibleAndUnlocked(f) { var p=f;while(p){try{if(p.hidden||p.locked)return false;if(p.typename==='Layer'&&!p.visible)return false;p=p.parent;}catch(e){break;}if(p&&p.typename==='Document')break;}return true; }
  function colorKey(c){try{var t=c.typename;if(t==='RGBColor')return t+':'+c.red+','+c.green+','+c.blue;if(t==='CMYKColor')return t+':'+c.cyan+','+c.magenta+','+c.yellow+','+c.black;if(t==='GrayColor')return t+':'+c.gray;if(t==='SpotColor')return t+':'+c.spot.name+','+c.tint;return t;}catch(e){return 'unknown';}}
  function prop(o,k){try{return o?o[k]:'?';}catch(e){return '?';}}
  function styleInfo(f) { var ch=f.textRange.characters, base=null,mixed=false,size=0,leading=0,font='';for(var i=0;i<ch.length;i++){var tr=ch[i],c=tr.characterAttributes,p=null,key='',fontName='?';try{fontName=c.textFont.name;}catch(e){}try{p=tr.paragraphAttributes;}catch(e){}key=[fontName,prop(c,'size'),prop(c,'leading'),prop(c,'tracking'),prop(c,'baselineShift'),prop(c,'horizontalScale'),prop(c,'verticalScale'),prop(c,'rotation'),prop(c,'capitalization'),prop(c,'underline'),prop(c,'strikeThrough'),colorKey(prop(c,'fillColor')),colorKey(prop(c,'strokeColor')),prop(p,'justification'),prop(p,'firstLineIndent'),prop(p,'leftIndent'),prop(p,'rightIndent'),prop(p,'spaceBefore'),prop(p,'spaceAfter'),prop(p,'hyphenation')].join('|');if(base===null){base=key;size=c.size||0;leading=c.leading||0;font=fontName;}else if(key!==base){mixed=true;break;}}return {mixed:mixed,size:size,leading:leading,font:font}; }
  function artboardOf(b,boards) {var inside=-1,overlap=0;for(var i=0;i<boards.length;i++){var a=boards[i],intersects=b[0]<a[2]&&b[2]>a[0]&&b[1]>a[3]&&b[3]<a[1],contained=b[0]>=a[0]&&b[2]<=a[2]&&b[1]<=a[1]&&b[3]>=a[3];if(intersects)overlap++;if(contained)inside=i;}return {index:inside,cross:overlap>1||(overlap>0&&inside<0)};}
  function protectedTokens(s){var re=/(?:\b[A-Z]{1,8}[-\d][A-Z\d-]*\b|\b\d+(?:[.,]\d+)?\s?(?:V|W|A|mA|Hz|kHz|MHz|GHz|mm|cm|m|kg|g|GB|MB|°C|%)\b|\b\d+(?:[.,]\d+)?\b|[A-Za-z][A-Za-z0-9+.\/-]*(?:[ \t]+[A-Za-z][A-Za-z0-9+.\/-]*)*)/g;return s.match(re)||[];}
  function tokenContexts(s,t){var counts={},from=0,at,single=/^[A-Za-z]$/.test(t),number=/^[0-9]+$/.test(t);while((at=s.indexOf(t,from))>=0){var before=s.charAt(at-1),before2=s.charAt(at-2),after=s.charAt(at+t.length),after2=s.charAt(at+t.length+1);from=at+t.length;if(single&&(/[A-Za-z0-9]/.test(before)||/[A-Za-z0-9]/.test(after)))continue;var left=/[A-Za-z0-9]/.test(before)||/[+.\/-]/.test(before)&&/[A-Za-z0-9]/.test(before2)&&!(before==='.'&&number);var right=/[A-Za-z0-9]/.test(after)||/[+.\/-]/.test(after)&&/[A-Za-z0-9]/.test(after2);var kind=(left?'1':'0')+(right?'1':'0');counts[kind]=(counts[kind]||0)+1;}return counts;}
  function tokensIntact(source,translation){var ts=protectedTokens(source),seen={};for(var i=0;i<ts.length;i++){var token=ts[i];if(seen[token])continue;seen[token]=true;var expected=tokenContexts(source,token),actual=tokenContexts(translation,token),kinds=['00','01','10','11'];for(var j=0;j<kinds.length;j++)if((expected[kinds[j]]||0)!==(actual[kinds[j]]||0))return false;}return true;}
  function sourcePath(doc){try{return doc.fullName.fsName;}catch(e){return '';}}
  function scanInner(){if(app.documents.length===0)throw Error('No Illustrator document is open');var d=app.activeDocument,boards=[],frames=[],items=[];for(var a=0;a<d.artboards.length;a++)boards.push(d.artboards[a].artboardRect);
    for(var i=0;i<d.textFrames.length;i++){var f=d.textFrames[i],b=bounds(f),s=f.contents,st=styleInfo(f),ab=artboardOf(b,boards),safe=visibleAndUnlocked(f),threaded=false;try{threaded=(f.nextFrame&&f.nextFrame!==f)||(f.previousFrame&&f.previousFrame!==f);}catch(_){};var flags={hidden:!safe,locked:!!f.locked,threaded:!!threaded,crossArtboard:ab.cross,mixedStyle:st.mixed};frames.push({sessionId:i,artboardIndex:ab.index,sourceText:s,kind:String(f.kind),bounds:b,style:st,flags:flags});items.push(s+'|'+b.join(','));}
    var snap={documentName:d.name,sourcePath:sourcePath(d),artboards:boards,frames:frames,issues:[],fingerprint:hash(d.name+'|'+boards.length+'|'+items.join('\u0001'))};session={doc:d,snapshot:snap};return snap;}
  function validate(){if(!session)throw Error('Scan the document again');if(app.activeDocument!==session.doc)throw Error('Active document changed; scan again');var old=session.snapshot,d=session.doc;if(d.textFrames.length!==old.frames.length)throw Error('Text frames changed; scan again');var items=[];for(var i=0;i<d.textFrames.length;i++)items.push(d.textFrames[i].contents+'|'+bounds(d.textFrames[i]).join(','));if(hash(d.name+'|'+d.artboards.length+'|'+items.join('\u0001'))!==old.fingerprint)throw Error('Document changed; scan again');}
  function scan(){try{return reply(scanInner());}catch(e){return fail(e);}}
  function fitOptions(value){
    function percent(number,fallback,max){number=Number(number);return isFinite(number)?Math.max(0,Math.min(max,number)):fallback;}
    value=value||{};
    return {mode:value.mode==='preserve'?'preserve':'shrink',maxShrinkPercent:percent(value.maxShrinkPercent,10,30),pointWidthTolerance:percent(value.pointWidthTolerance,10,100)};
  }
  function fitTranslatedFrame(f,original,options,issues){
    var attributes=f.textRange.characterAttributes,size=original.style.size||12,minimum=options.mode==='preserve'?100:100-options.maxShrinkPercent;
    var area=String(f.kind)==='TextType.AREATEXT',limit=(original.bounds[2]-original.bounds[0])*(1+options.pointWidthTolerance/100),fitted=false,pct=100;
    while(true){
      attributes.size=size*pct/100;app.redraw();
      fitted=area?!isOverset(f):(bounds(f)[2]-bounds(f)[0])<=limit;
      if(fitted||pct<=minimum)break;
      pct=Math.max(minimum,pct-2);
    }
    if(!fitted)issues.push({sessionId:original.sessionId,reason:area?'overflow-review':'point-text-width-review',artboardIndex:original.artboardIndex});
  }
  function scanSelection(){try{
    if(app.documents.length===0)throw Error('请先打开 Illustrator 文档');
    var d=app.activeDocument,selected=d.selection,frames=[],refs=[],skipped=0,selection=[];
    if(!selected||!selected.length)throw Error('请用选择工具选中文字框对象');
    for(var i=0;i<selected.length;i++){
      var item=selected[i];selection.push(item);
      if(item.typename!=='TextFrame'&&item.typename!=='TextFrameItem'){skipped++;continue;}
      if(!item.contents||!item.contents.replace(/^\s+|\s+$/g,'')){skipped++;continue;}
      if(!visibleAndUnlocked(item))throw Error('选中文字框包含隐藏或锁定对象');
      var st=styleInfo(item);if(st.mixed)throw Error('选中文字框包含混合样式，请先拆分后翻译');
      var b=bounds(item),ab=artboardOf(b,(function(){var boards=[];for(var j=0;j<d.artboards.length;j++)boards.push(d.artboards[j].artboardRect);return boards;})());
      refs.push(item);frames.push({sessionId:refs.length-1,sourceText:item.contents,bounds:b,kind:String(item.kind),style:st,artboardIndex:ab.index});
    }
    if(!refs.length)throw Error('请用选择工具选中文字框对象，不要进入文字编辑状态');
    manualSession={doc:d,refs:refs,selection:selection,frames:frames};
    return reply({documentName:d.name,frames:frames,skipped:skipped});
  }catch(e){manualSession=null;return fail(e);}}
  function applySelection(payload){try{
    var p=parse(payload),m=manualSession;if(!m)throw Error('请重新选择文字框');
    if(app.activeDocument!==m.doc)throw Error('当前文档已切换，请重新选择文字框');
    var selected=m.doc.selection;if(!selected||selected.length!==m.selection.length)throw Error('选区已改变，请重新选择文字框');
    for(var s=0;s<selected.length;s++)if(selected[s]!==m.selection[s])throw Error('选区已改变，请重新选择文字框');
    if(!p.changes||p.changes.length!==m.refs.length)throw Error('选中文字框的译文数量不匹配');
    var seen={};for(var i=0;i<p.changes.length;i++){
      var c=p.changes[i],original=m.frames[c.sessionId],f=m.refs[c.sessionId];
      if(!original||seen[c.sessionId]||!f||f.contents!==c.sourceText||original.sourceText!==c.sourceText||!sameBounds(bounds(f),c.bounds)||!sameBounds(original.bounds,c.bounds))throw Error('选中文字框已改变，请重新翻译');
      if(typeof c.translation!=='string'||!c.translation.replace(/^\s+|\s+$/g,''))throw Error('选中文字框有空译文');
      seen[c.sessionId]=true;
    }
    var issues=[],applied=0,failed=0,options=fitOptions(p.fitOptions);
    for(i=0;i<p.changes.length;i++){
      c=p.changes[i];f=m.refs[c.sessionId];original=m.frames[c.sessionId];
      try{
        f.contents=c.translation;fitTranslatedFrame(f,original,options,issues);
        applied++;
      }catch(e){failed++;issues.push({sessionId:c.sessionId,reason:'apply-error: '+e,artboardIndex:original.artboardIndex});}
    }
    manualSession=null;return reply({applied:applied,failed:failed,issues:issues});
  }catch(e){return fail(e);}}
  function apply(payload){try{var p=parse(payload);validate();if(!p.changes||!p.changes.length)throw Error('No translations to apply');if(p.documentFingerprint!==session.snapshot.fingerprint)throw Error('Task is stale');var d=session.doc,seen={},issues=[],applied=0,failed=0;
      for(var i=0;i<p.changes.length;i++){var c=p.changes[i],src=session.snapshot.frames[c.sessionId];if(!src||seen[c.sessionId]||src.sourceText!==c.sourceText||!sameBounds(src.bounds,c.bounds))throw Error('Frame mapping conflict: '+c.sessionId);if(!/[\u3400-\u9fff]/.test(src.sourceText)||src.flags.hidden||src.flags.locked||src.flags.threaded||src.flags.crossArtboard||src.style.mixed)throw Error('Frame is unsafe for automatic rewrite: '+c.sessionId);if(typeof c.translation!=='string'||!c.translation.replace(/^\s+|\s+$/g,''))throw Error('Empty translation: '+c.sessionId);if(!tokensIntact(src.sourceText,c.translation))issues.push({sessionId:c.sessionId,reason:'protected-text-review',artboardIndex:src.artboardIndex});seen[c.sessionId]=true;}
      var options=fitOptions(p.fitOptions),temp=new File(p.tempAiPath);if(!/\.ai$/i.test(temp.name)||temp.exists)throw Error('Working copy path must be a new .ai file');if(!temp.parent.exists)temp.parent.create();if(!temp.parent.exists)throw Error('Cannot create working folder');if(temp.fsName===session.snapshot.sourcePath)throw Error('Cannot overwrite source');
      var opts=new IllustratorSaveOptions();opts.pdfCompatible=true;d.saveAs(temp,opts);
      for(i=0;i<p.changes.length;i++){c=p.changes[i];var f=d.textFrames[c.sessionId],original=session.snapshot.frames[c.sessionId];try{f.contents=c.translation;fitTranslatedFrame(f,original,options,issues);
      applied++;}catch(e){failed++;issues.push({sessionId:c.sessionId,reason:'apply-error: '+e,artboardIndex:original.artboardIndex});}}
      d.save();session.workingCopy=temp.fsName;session.applied=(failed===0);return reply({workingCopyPath:temp.fsName,applied:applied,failed:failed,issues:issues});
    }catch(e){return fail(e);}}
  function isOverset(f){try{var lines=f.textRange.lines,visible='';for(var i=0;i<lines.length;i++)visible+=lines[i].contents;return visible.replace(/[\r\n]/g,'').length<f.contents.replace(/[\r\n]/g,'').length;}catch(e){return true;}}
  function locate(payload){try{var p=parse(payload);if(!session)throw Error('Scan first');var id=p.sessionId;if(id<0||id>=session.doc.textFrames.length)throw Error('Unknown frame');app.activeDocument=session.doc;session.doc.selection=null;session.doc.textFrames[id].selected=true;var ab=session.snapshot.frames[id].artboardIndex;if(ab>=0)session.doc.artboards.setActiveArtboardIndex(ab);app.redraw();return reply({sessionId:id});}catch(e){return fail(e);}}
  function saveCopy(payload){try{var p=parse(payload);if(!session||!session.applied)throw Error('Apply translations first');var target=new File(p.targetPath);if(!/\.ai$/i.test(target.name)||target.exists)throw Error('Choose a new .ai filename');if(target.fsName===session.snapshot.sourcePath)throw Error('Cannot overwrite source');if(!target.parent.exists)throw Error('Output folder does not exist');var opts=new IllustratorSaveOptions();opts.pdfCompatible=true;session.doc.saveAs(target,opts);return reply({path:target.fsName});}catch(e){return fail(e);}}
  return {scan:scan,apply:apply,locate:locate,saveCopy:saveCopy,scanSelection:scanSelection,applySelection:applySelection};
})();
