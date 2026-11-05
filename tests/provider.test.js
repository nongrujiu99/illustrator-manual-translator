const {test}=require('node:test');
const assert=require('node:assert/strict');
const {preset}=require('../extension/js/core/provider');
test('Alibaba Cloud presets use full OpenAI-compatible HTTP endpoints',()=>{
 assert.deepEqual(preset('aliyun-cn'),{endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',model:'qwen-plus'});
 assert.deepEqual(preset('aliyun-intl'),{endpoint:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',model:'qwen-plus'});
 assert.equal(preset('custom'),null);
});
