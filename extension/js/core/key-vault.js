(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TranslatorKeyVault=api;})(this,function(){
 'use strict';
 var protectScript='$ErrorActionPreference="Stop";Add-Type -AssemblyName System.Security;$bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd());$cipher=[System.Security.Cryptography.ProtectedData]::Protect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($cipher))';
 var unprotectScript='$ErrorActionPreference="Stop";Add-Type -AssemblyName System.Security;$cipher=[Convert]::FromBase64String([Console]::In.ReadToEnd());$bytes=[System.Security.Cryptography.ProtectedData]::Unprotect($cipher,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($bytes))';
 function run(script,input){
  return new Promise(function(resolve,reject){
   if(typeof process==='undefined'||process.platform!=='win32')return reject(Error('保存 API Key 仅支持 Windows。'));
   var child=require('child_process').spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
   var output='',settled=false,timer=setTimeout(function(){child.kill();finish(Error('Windows 密钥保护服务超时。'));},10000);
   function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);}
   child.on('error',function(){finish(Error('无法启动 Windows 密钥保护服务。'));});
   child.stdout.on('data',function(chunk){output+=chunk.toString('ascii');if(output.length>100000){child.kill();finish(Error('密钥保护结果过大。'));}});
   child.stderr.on('data',function(){});
   child.stdin.on('error',function(){});
   child.on('close',function(code){if(code!==0||!output.trim())return finish(Error('无法处理已保存的 API Key，请重新输入后保存。'));finish(null,output.trim());});
   child.stdin.end(input,'ascii');
  });
 }
 async function protect(key){if(!key)throw Error('请先填写 API Key。');return run(protectScript,Buffer.from(key,'utf8').toString('base64'));}
 async function unprotect(secret){if(!secret)throw Error('未找到已保存的 API Key。');var encoded=await run(unprotectScript,secret);return Buffer.from(encoded,'base64').toString('utf8');}
 return {protect:protect,unprotect:unprotect};
});
