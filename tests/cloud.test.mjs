import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {generateKeyPair, exportJWK, SignJWT, createLocalJWKSet} from 'jose';
import {authenticate, handleRequest, saveState, readState, reminderDue, sendReminders, validateSubscription} from '../cloud/worker.js';
import {emptyState, today} from '../app/model.js';

test('Cloudflare 인증·저장·알림 통합',async t=>{
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-10-01'}));
  t.after(()=>mf.dispose());
  const DB=await mf.getD1Database('DB');
  await DB.exec((await readFile(new URL('../cloud/schema.sql',import.meta.url),'utf8')).replaceAll('\n',' '));
  const env={DB,ACCESS_ISSUER:'https://example.cloudflareaccess.com',ACCESS_AUD:'test-audience',ALLOWED_EMAIL:'owner@example.com'};
  const pair=await generateKeyPair('RS256');
  const publicKey=await exportJWK(pair.publicKey);publicKey.kid='test';
  const resolver=createLocalJWKSet({keys:[publicKey]});
  const token=async(extra={})=>new SignJWT({email:env.ALLOWED_EMAIL,...extra}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuedAt().setSubject('owner').setIssuer(env.ACCESS_ISSUER).setAudience(env.ACCESS_AUD).setExpirationTime('1h').sign(pair.privateKey);
  const request=async(path='/api/state',method='GET',body,overrides={})=>new Request(`https://bomi.example${path}`,{method,headers:{'Cf-Access-Jwt-Assertion':await token(),Origin:'https://bomi.example','X-Bomi-Request':'1','Content-Type':'application/json',...overrides},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const state=emptyState();state.records=[{id:'one',date:today(),text:'테스트 기록',result:'',themes:['health'],saved:false}];
  const input=(revision, stateValue=state)=>({revision,mutation:crypto.randomUUID(),state:stateValue});

  await t.test('미설정·무인증·위조·다른 이메일·다른 audience 차단',async()=>{
    await assert.rejects(authenticate(new Request('https://bomi.example/api/state'),{}),{status:503});
    assert.equal((await handleRequest(new Request('https://bomi.example/api/state'),env,resolver)).status,401);
    for(const value of ['invalid',await token({email:'other@example.com'})]) {
      const r=await request('/api/state','GET',undefined,{'Cf-Access-Jwt-Assertion':value});
      assert.equal((await handleRequest(r,env,resolver)).status,401);
    }
    await assert.rejects(authenticate(await request(),{...env,ACCESS_AUD:'wrong'},resolver),{status:401});
    assert.equal(await authenticate(await request(),env,resolver),'owner@example.com');
  });
  await t.test('CSRF·잘못된 내용·크기 제한, 인증 후에만 읽기',async()=>{
    assert.equal((await handleRequest(await request('/api/state','PUT',input(0),{Origin:'https://evil.example'}),env,resolver)).status,403);
    assert.equal((await handleRequest(await request('/api/state','PUT',input(0,{version:99})),env,resolver)).status,400);
    assert.equal((await handleRequest(await request('/api/state','PUT',{padding:'x'.repeat(1024*1024)}),env,resolver)).status,413);
    const response=await handleRequest(await request(),env,resolver);
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal((await response.json()).revision,0);
  });
  await t.test('저장 재시도 멱등성·이전 버전 백업·동시 변경 충돌·사용자 분리',async()=>{
    const first=input(0);
    assert.equal((await saveState(DB,env.ALLOWED_EMAIL,first)).revision,1);
    assert.equal((await saveState(DB,env.ALLOWED_EMAIL,first)).revision,1);
    const changed=structuredClone(state);changed.records[0].text='수정된 기록';
    const competing=await Promise.allSettled([saveState(DB,env.ALLOWED_EMAIL,input(1,changed)),saveState(DB,env.ALLOWED_EMAIL,input(1,emptyState()))]);
    assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(competing.find(r=>r.status==='rejected').reason.status,409);
    assert.equal((await readState(DB,env.ALLOWED_EMAIL)).revision,2);
    const backup=await DB.prepare('SELECT body FROM backups WHERE owner = ? AND revision = 1').bind(env.ALLOWED_EMAIL).first();
    assert.deepEqual(JSON.parse(backup.body),state);
    assert.equal((await readState(DB,'other@example.com')).revision,0);
    await assert.rejects(saveState(DB,env.ALLOWED_EMAIL,input(0)),{status:409});
  });
  await t.test('한국시간·기록 없음·쉬어감·미루기·알림 끄기',()=>{
    const now=new Date('2026-10-11T11:00:00Z'), s=emptyState();s.reminder='20:00';
    assert.equal(reminderDue(s,now),'2026-10-11');
    assert.equal(reminderDue(s,new Date('2026-10-11T10:59:00Z')),null);
    assert.equal(reminderDue({...s,rest:['2026-10-11']},now),null);
    assert.equal(reminderDue({...s,records:[{date:'2026-10-11'}]},now),null);
    assert.equal(reminderDue({...s,snoozed:{'2026-10-11':+now+1000}},now),null);
    assert.equal(reminderDue({...s,reminder:''},now),null);
  });
  await t.test('푸시 목적지 SSRF와 잘못된 키 차단',()=>{
    for(const endpoint of ['http://web.push.apple.com/a','https://localhost/a','https://web.push.apple.com.evil.example/a','https://web.push.apple.com:444/a','https://x@web.push.apple.com/a']) assert.throws(()=>validateSubscription({endpoint,keys:{p256dh:'a'.repeat(87),auth:'a'.repeat(22)}}));
  });
  await t.test('암호화 푸시 전송·중복 실행 방지·만료된 기기 제거',async()=>{
    const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const privateJwk=await crypto.subtle.exportKey('jwk',vapid.privateKey);
    const pushEnv={...env,VAPID_SUBJECT:'mailto:owner@example.com',VAPID_PRIVATE_KEY:privateJwk.d,VAPID_PUBLIC_KEY:Buffer.from(await crypto.subtle.exportKey('raw',vapid.publicKey)).toString('base64url')};
    const recipient=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
    const subscription={endpoint:'https://web.push.apple.com/test',keys:{auth:Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url'),p256dh:Buffer.from(await crypto.subtle.exportKey('raw',recipient.publicKey)).toString('base64url')}};
    const s=emptyState();s.reminder='20:00';
    await saveState(DB,env.ALLOWED_EMAIL,input(2,s));
    const response=await handleRequest(await request('/api/push','POST',subscription),pushEnv,resolver);assert.equal(response.status,200);
    let calls=0;
    const send=async(url,payload)=>{calls++;assert.equal(url,subscription.endpoint);assert.equal(payload.method,'POST');assert.equal(payload.redirect,'error');return new Response(null,{status:201});};
    await Promise.all([sendReminders(pushEnv,new Date('2026-10-11T11:00:00Z'),send),sendReminders(pushEnv,new Date('2026-10-11T11:00:00Z'),send)]);
    assert.equal(calls,1);
    await sendReminders(pushEnv,new Date('2026-10-12T11:00:00Z'),async()=>new Response(null,{status:410}));
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM subscriptions').first()).n,0);
  });
});

test('공개 이미지·폰트만 브라우저에 캐시하고 문서·오류는 저장하지 않는다',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('asset')}};
 for(const path of ['/assets/flower-stage-2.png','/assets/bomi-logo.png','/assets/OwnglyphCorncorn.ttf']){
  const response=await handleRequest(new Request('https://bomi.example'+path),env);
  assert.equal(response.headers.get('cache-control'),'private, max-age=86400');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 }
 for(const path of ['/','/app.js','/assets/private.json'])assert.equal((await handleRequest(new Request('https://bomi.example'+path),env)).headers.get('cache-control'),'no-store');
 const failed={ASSETS:{fetch:async()=>new Response('missing',{status:404})}};
 assert.equal((await handleRequest(new Request('https://bomi.example/assets/flower-stage-2.png'),failed)).headers.get('cache-control'),'no-store');
});
