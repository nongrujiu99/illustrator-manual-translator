(function(root){
 'use strict';
 var allowed={scan:1,apply:1,locate:1,saveCopy:1,scanSelection:1,applySelection:1};
 function invoke(method,payload,callback){
  if(!allowed[method])return callback(Error('Unsupported host method'));
  if(!root.__adobe_cep__)return callback(Error('Open this panel in Illustrator'));
  var data=encodeURIComponent(JSON.stringify(payload||{}));
  root.__adobe_cep__.evalScript('TranslatorHost.'+method+'(decodeURIComponent(\''+data+'\'))',function(raw){
   var result;
   try{result=JSON.parse(raw);}
   catch(e){return callback(Error('Illustrator 脚本执行失败：'+String(raw).slice(0,160)+'。请关闭并重新打开插件面板后重试。'));}
   if(!result||!result.ok)return callback(Error(result&&result.error||'Illustrator error'));
   callback(null,result.data);
  });
 }
 root.TranslatorBridge={invoke:invoke};
})(this);
