(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TranslatorSegments=api;})(this,function(){
 'use strict';
 var CJK=/[\u3400-\u9fff]/;
 var TECH=/(?:\b[A-Z]{1,8}[-\d][A-Z\d-]*\b|\b\d+(?:[.,]\d+)?\s?(?:V|W|A|mA|Hz|kHz|MHz|GHz|mm|cm|m|kg|g|GB|MB|°C|%)\b|\b\d+(?:[.,]\d+)?\b|[A-Za-z][A-Za-z0-9+./-]*(?:[ \t]+[A-Za-z][A-Za-z0-9+./-]*)*)/g;
 var MANUAL_TECH=/(?:\b[A-Za-z]+[A-Za-z0-9]*[-\d][A-Za-z0-9-]*\b|\b\d+(?:[.,]\d+)?\s?(?:V|W|A|mA|Hz|kHz|MHz|GHz|mm|cm|m|kg|g|GB|MB|°C|%)\b|\b\d+(?:[.,]\d+)?\b|\b[A-Z]{2,8}\b)/g;
 function protectTokens(s){var tokens=[],template=String(s).replace(TECH,function(v){var i=tokens.length;tokens.push(v);return '[[KEEP_'+i+']]';});return {template:template,tokens:tokens};}
 function protectManualTokens(s){var tokens=[],template=String(s).replace(MANUAL_TECH,function(v){var i=tokens.length;tokens.push(v);return '[[KEEP_'+i+']]';});return {template:template,tokens:tokens};}
 function restoreTokens(s,tokens){for(var i=0;i<tokens.length;i++){var marker='[[KEEP_'+i+']]';if(s.split(marker).length!==2)throw Error('Protected token missing or repeated: '+marker);s=s.replace(marker,tokens[i]);}if(/\[\[KEEP_[^\]]*\]\]/.test(s))throw Error('Unexpected protected token');return s;}
 function tokenContexts(text,token){var counts={},from=0,at,single=/^[A-Za-z]$/.test(token),number=/^[0-9]+$/.test(token);while((at=text.indexOf(token,from))>=0){var before=text.charAt(at-1),before2=text.charAt(at-2),after=text.charAt(at+token.length),after2=text.charAt(at+token.length+1);from=at+token.length;if(single&&(/[A-Za-z0-9]/.test(before)||/[A-Za-z0-9]/.test(after)))continue;var left=/[A-Za-z0-9]/.test(before)||/[+.\/-]/.test(before)&&/[A-Za-z0-9]/.test(before2)&&!(before==='.'&&number);var right=/[A-Za-z0-9]/.test(after)||/[+.\/-]/.test(after)&&/[A-Za-z0-9]/.test(after2);var kind=(left?'1':'0')+(right?'1':'0');counts[kind]=(counts[kind]||0)+1;}return counts;}
 function validateProtectedText(source,text){var tokens=protectTokens(source).tokens,seen={};for(var i=0;i<tokens.length;i++){var token=tokens[i];if(seen[token])continue;seen[token]=true;var expected=tokenContexts(source,token),actual=tokenContexts(text,token),kinds=['00','01','10','11'];for(var j=0;j<kinds.length;j++)if((expected[kinds[j]]||0)!==(actual[kinds[j]]||0))return false;}return true;}
 function createSegments(snapshot){var segments=[],issues=[];var frames=snapshot.frames||[];
  for(var i=0;i<frames.length;i++){var f=frames[i],s=f.sourceText||'';if(!CJK.test(s))continue;
   var reason='';if(f.flags&&f.flags.hidden)reason='hidden';else if(f.flags&&f.flags.locked)reason='locked';else if(f.artboardIndex<0||f.artboardIndex==null)reason='outside-artboard';else if(f.flags&&f.flags.threaded)reason='threaded';else if(f.flags&&f.flags.mixedStyle)reason='mixed-style';else if(f.flags&&f.flags.fragmented)reason='fragmented';else if(f.flags&&f.flags.crossArtboard)reason='cross-artboard';
   var p=protectTokens(s);if(!reason&&/[A-Za-z]/.test(p.template.replace(/\[\[KEEP_\d+\]\]/g,'')))reason='mixed-language';
   if(reason){issues.push({sessionId:f.sessionId,artboardIndex:f.artboardIndex,reason:reason,sourceText:s});continue;}
   segments.push({id:'f'+f.sessionId,sessionId:f.sessionId,artboardIndex:f.artboardIndex,sourceText:s,template:p.template,tokens:p.tokens});
  }return {segments:segments,issues:issues};
 }
 return {createSegments:createSegments,protectTokens:protectTokens,protectManualTokens:protectManualTokens,restoreTokens:restoreTokens,validateProtectedText:validateProtectedText};
});
