import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {generateKeyPair, exportJWK, SignJWT, createLocalJWKSet} from 'jose';
import {authenticate, handleRequest, saveState, readState, reminderDue, dueNotifications, sendReminders, validateSubscription} from '../cloud/worker.js';
import {validateState,emptyState, today} from '../app/model.js';

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
    assert.deepEqual(JSON.parse(backup.body),validateState(state));
    assert.equal((await readState(DB,'other@example.com')).revision,0);
    await assert.rejects(saveState(DB,env.ALLOWED_EMAIL,input(0)),{status:409});
  });
  await t.test('한국시간·기록 없음·쉬어감·미루기·알림 끄기',()=>{
    const now=new Date('2026-10-11T11:00:00Z'), s=emptyState();s.reminder='20:00';
    assert.equal(reminderDue(s,now),'2026-10-11');
    assert.equal(reminderDue(s,new Date('2026-10-11T10:59:00Z')),null);
    assert.equal(reminderDue({...s,rest:['2026-10-11']},now),null);
    assert.equal(reminderDue({...s,groups:[{date:'2026-10-11'}]},now),null);
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
    s.routines=[{id:'a',title:'연습 확인',days:[0,1],time:'20:00',kind:'activity',enabled:true,before:''},{id:'b',title:'복습 확인',days:[0,1],time:'20:00',kind:'activity',enabled:true,before:''}];
    assert.equal(dueNotifications(s,new Date('2026-10-11T11:00:00Z')).length,3);
    await saveState(DB,env.ALLOWED_EMAIL,input(2,s));
    const legacy=structuredClone(s);delete legacy.routines;delete legacy.checkins;
    await assert.rejects(saveState(DB,env.ALLOWED_EMAIL,input(3,legacy)),{status:409});
    const response=await handleRequest(await request('/api/push','POST',subscription),pushEnv,resolver);assert.equal(response.status,200);
    const calls=[];
    const send=async(url,payload)=>{calls.push({url,payload});return new Response(null,{status:201});};
    await Promise.all([sendReminders(pushEnv,new Date('2026-10-11T11:00:00Z'),send),sendReminders(pushEnv,new Date('2026-10-11T11:00:00Z'),send)]);
    assert.equal(calls.length,3);
    for(const {url,payload} of calls) {
      assert.equal(url,subscription.endpoint);assert.equal(payload.method.toUpperCase(),'POST');assert.equal(payload.redirect,'manual');assert.equal(new Headers(payload.headers).get('urgency'),'high');assert.equal(new Headers(payload.headers).get('ttl'),'14400');
    }
    assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM deliveries WHERE status = 'sent'").first()).n,3);
    await sendReminders(pushEnv,new Date('2026-10-12T11:00:00Z'),async()=>new Response(null,{status:410}));
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM subscriptions').first()).n,0);
  });
});

test('Workers 실제 fetch로 정기 푸시 전송, 리다이렉트 차단, 발송 결과와 중복 방지 검증',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'bomi-push-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--dry-run','--outdir',directory],{stdio:'pipe'});
  const keyPair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const privateKey=await crypto.subtle.exportKey('jwk',keyPair.privateKey);
  const publicKey=Buffer.from(await crypto.subtle.exportKey('raw',keyPair.publicKey)).toString('base64url');
  const owner='owner@example.com',requests=[];
  let status=201;
  const mf=new Miniflare(convertV4MiniflareOptions({
    modules:true,script:await readFile(join(directory,'worker.js'),'utf8'),compatibilityDate:'2026-10-01',d1Databases:['DB'],
    bindings:{ALLOWED_EMAIL:owner,VAPID_SUBJECT:`mailto:${owner}`,VAPID_PUBLIC_KEY:publicKey,VAPID_PRIVATE_KEY:privateKey.d},
    outboundService:async request=>{
      requests.push({url:request.url,method:request.method,encoding:request.headers.get('content-encoding'),urgency:request.headers.get('urgency'),ttl:request.headers.get('ttl'),size:(await request.arrayBuffer()).byteLength});
      return new Response(null,{status,...(status===302?{headers:{Location:'https://untrusted.example/redirect'}}:{})});
    }
  }));
  t.after(()=>mf.dispose());
  const DB=await mf.getD1Database('DB');
  await DB.exec((await readFile(new URL('../cloud/schema.sql',import.meta.url),'utf8')).replaceAll('\n',' '));
  const state=emptyState();
  state.routines=[{id:'practice',title:'연습 확인',days:[0,1,2],time:'20:00',kind:'activity',enabled:true,themes:[]}];
  await saveState(DB,owner,{revision:0,mutation:crypto.randomUUID(),state});
  const endpoint='https://web.push.apple.com/test';
  const subscription={endpoint,keys:{p256dh:publicKey,auth:Buffer.alloc(16,1).toString('base64url')}};
  await DB.prepare('INSERT INTO subscriptions(owner,id,body) VALUES (?,?,?)').bind(owner,'test',JSON.stringify(subscription)).run();
  const worker=await mf.getWorker();
  const run=day=>worker.scheduled({scheduledTime:+new Date(`2026-10-${day}T11:00:00Z`),cron:'*/5 * * * *'});
  await run(11);await run(11);
  assert.equal(requests.length,1,'fetch가 실행되어야 하며 중복 발송하면 안 된다');
  assert.deepEqual(requests[0],{url:endpoint,method:'POST',encoding:'aes128gcm',urgency:'high',ttl:'14400',size:4096});
  assert.equal((await DB.prepare('SELECT status FROM deliveries').first()).status,'sent');
  await worker.scheduled({scheduledTime:+new Date('2026-10-12T07:59:00+09:00'),cron:'*/5 * * * *'});
  assert.equal(requests.length,1,'08시 전에는 전날 재알림을 보내지 않는다');
  for(let i=0;i<2;i++)await worker.scheduled({scheduledTime:+new Date('2026-10-12T08:00:00+09:00'),cron:'*/5 * * * *'});
  assert.equal(requests.length,2,'밤에 발송했어도 미답변이면 아침에 한 번만 재알림한다');
  assert.equal((await DB.prepare('SELECT status FROM deliveries WHERE day = ?').bind('2026-10-11:practice:morning').first()).status,'sent');
  assert.equal(requests[1].ttl,'57600');
  status=302;await run(12);await run(12);
  assert.equal(requests.length,3,'리다이렉트 대상이나 실패한 회차에 재전송하지 않는다');
  assert.ok(requests.every(r=>r.url===endpoint));
  assert.equal((await DB.prepare('SELECT status FROM deliveries WHERE day = ?').bind('2026-10-12:practice').first()).status,'failed');
  status=201;await worker.scheduled({scheduledTime:+new Date('2026-10-13T14:59:59Z'),cron:'*/5 * * * *'});
  assert.equal(requests.at(-1).ttl,'1','한국 자정을 넘어 전날 질문을 보관하지 않는다');
  status=410;await worker.scheduled({scheduledTime:+new Date('2026-10-18T11:00:00Z'),cron:'*/5 * * * *'});
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM subscriptions').first()).n,0);
});
