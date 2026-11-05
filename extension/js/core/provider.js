(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TranslatorProvider=api;})(this,function(){
 'use strict';
 var presets={
  'aliyun-cn':{endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',model:'qwen-plus'},
  'aliyun-intl':{endpoint:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',model:'qwen-plus'}
 };
 function preset(id){var p=presets[id];return p?{endpoint:p.endpoint,model:p.model}:null;}
 return {preset:preset};
});
