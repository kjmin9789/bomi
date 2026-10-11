import {mkdir,writeFile} from 'node:fs/promises';
const directory = new URL('../.data/cloudflare/',import.meta.url);
const keys = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const privateKey = await crypto.subtle.exportKey('jwk',keys.privateKey);
const publicKey = await crypto.subtle.exportKey('raw',keys.publicKey);
await mkdir(directory,{recursive:true,mode:0o700});
try {
  await writeFile(new URL('push-secrets.json',directory),JSON.stringify({
    VAPID_PRIVATE_KEY:privateKey.d,
    VAPID_PUBLIC_KEY:Buffer.from(publicKey).toString('base64url')
  }),{mode:0o600,flag:'wx'});
  console.log('알림 키를 로컬 비공개 파일에 저장했어요. 기존 파일은 덮어쓰지 않아요.');
} catch(error) {
  if(error.code==='EEXIST')console.log('기존 알림 키 파일을 보존했어요.');
  else {console.error('알림 키 파일을 저장하지 못했어요.');process.exitCode=1;}
}
