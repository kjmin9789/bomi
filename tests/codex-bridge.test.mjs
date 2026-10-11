import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {createBridge,validateDraft} from '../codex-bridge.mjs';
import {createAppServer} from '../server.mjs';
const threadId='00000000-0000-0000-0000-000000000001';
const date='2026-10-10';
const draft=job=>({requestId:job.id,date:job.date,note:'',records:[{threadId,title:'테스트 작업',text:'노트를 정리했어요',result:'참고 노트',themes:['career'],evidence:'해당 날짜의 완료 턴에서 노트 저장 확인'}]});
async function fixture(t,send){const directory=await mkdtemp(join(tmpdir(),'bomi-bridge-'));t.after(()=>rm(directory,{recursive:true,force:true}));return {directory,bridge:createBridge({directory,threadId,send})};}
test('자료 먼저 저장, 중복 전달 차단, 결과 도착 후에만 ready',async t=>{
 let calls=0;let dir;
 const {directory,bridge}=await fixture(t,async(id,message)=>{calls++;assert.equal(id,threadId);assert.match(message,/회사 작업/);const job=JSON.parse(await readFile(join(dir,'request.json')));assert.equal(job.status,'sending');const source=JSON.parse(await readFile(join(dir,`${job.id}.request.json`)));assert.equal(source.date,date);});dir=directory;
 const first=await bridge.collect(date);assert.equal(first.job.status,'queued');assert.equal(first.job.records,undefined);
 await bridge.collect(date);assert.equal(calls,1);
 await writeFile(join(directory,`${first.job.id}.result.json`),JSON.stringify(draft(first.job)));
 const ready=await bridge.status();assert.equal(ready.job.status,'ready');assert.equal(ready.job.records.length,1);
 await assert.rejects(()=>bridge.close('another-request'));
 await bridge.close(first.job.id);assert.equal((await bridge.status()).job,null);
 const next=await bridge.collect(date);assert.equal(calls,2);assert.notEqual(next.job.id,first.job.id);
 assert.equal(validateDraft(draft(next.job),next.job).records[0].id,ready.job.records[0].id);
});
test('불명확한 전달은 재시도하지 않고, 잘못된 결과는 기록 후보로 전달하지 않음',async t=>{
 let calls=0;const {directory,bridge}=await fixture(t,async()=>{calls++;throw new Error('private diagnostic must not escape');});
 const result=await bridge.collect(date);assert.equal(result.job.status,'uncertain');assert.doesNotMatch(JSON.stringify(result),/private diagnostic/);
 await bridge.collect(date);assert.equal(calls,1);
 await writeFile(join(directory,`${result.job.id}.result.json`),JSON.stringify({...draft(result.job),requestId:'wrong'}));
 assert.equal((await bridge.status()).job.status,'invalid');
});
test('동시 클릭은 한 번만 전달',async t=>{
 let resolveSend,calls=0;const {bridge}=await fixture(t,()=>{calls++;return new Promise(r=>resolveSend=r);});
 const first=bridge.collect(date);await assert.rejects(()=>bridge.collect(date));
 while(!resolveSend)await new Promise(r=>setImmediate(r));resolveSend();await first;assert.equal(calls,1);
});
test('날짜·테마·길이·중복 출처·요청 식별자 검증',()=>{
 const job={id:'job',date};const value=draft(job);
 assert.deepEqual(validateDraft({...value,records:[{...value.records[0],themes:[]}]},job).records[0].themes,[]);
 for(const item of [{themes:['company']},{themes:['career','career']},{text:'x'.repeat(1001)},{threadId:'../escape'},{evidence:''}])assert.throws(()=>validateDraft({...value,records:[{...value.records[0],...item}]},job));
 assert.throws(()=>validateDraft({...value,records:[value.records[0],value.records[0]]},job));
 assert.throws(()=>validateDraft({...value,date:'2099-01-01'},job));
});
test('로컬 API는 외부 Origin·잘못된 Host·단순 폼 전송 차단',async t=>{
 let calls=0;const server=createAppServer({status:async()=>({connected:true,job:null}),collect:async()=>{calls++;return {job:{status:'queued'}};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(headers,body='{}')=>fetch(`${base}/api/codex/collect`,{method:'POST',headers,body});
 const good={'Origin':base,'Content-Type':'application/json','X-Bomi-Request':'1'};
 assert.equal((await post({...good,Origin:'https://untrusted.example'})).status,403);
 const wrongHost=await new Promise((resolve,reject)=>{const req=request(`${base}/api/codex/status`,{headers:{Host:'untrusted.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
 assert.equal(wrongHost,403);
 assert.equal((await post({'Content-Type':'text/plain'})).status,403);
 assert.equal((await post(good,'{')).status,400);
 assert.equal((await post(good,'x'.repeat(9000))).status,413);
 assert.equal(calls,0);
 assert.equal((await post(good,JSON.stringify({date}))).status,200);assert.equal(calls,1);
 assert.equal((await fetch(`${base}/.data/codex/request.json`)).status,404);
});

test('과거 날짜 요청과 완료 초안은 선택한 한국 날짜를 유지한다',async t=>{
 const past='2026-09-20';let message;
 const {directory,bridge}=await fixture(t,async(id,text)=>{message=text;});
 const {job}=await bridge.collect(past);
 assert.equal(job.date,past);
 assert.ok(message.includes(`선택한 날짜는 ${past}`));
 assert.match(message,/이전 페이지 커서/);
 assert.ok(message.includes(`${past} 00:00 이상 다음 날 00:00 미만`));
 const request=JSON.parse(await readFile(join(directory,`${job.id}.request.json`)));
 assert.equal(request.date,past);assert.equal(request.timezone,'Asia/Seoul');
 await writeFile(join(directory,`${job.id}.result.json`),JSON.stringify(draft(job)));
 const ready=await bridge.status();
 assert.equal(ready.job.status,'ready');assert.equal(ready.job.records[0].date,past);
 assert.throws(()=>validateDraft({...draft(job),date},job));
});

test('클라우드 연결은 지정한 HTTPS 원본·요청 헤더만 허용한다',async t=>{
 const origin='https://bomi.example.com';let calls=0;
 const server=createAppServer({status:async()=>({connected:true,job:null}),collect:async()=>{calls++;return {job:{status:'queued'}};}},{cloudOrigin:origin});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}/api/codex`;
 const headers={Origin:origin,'Sec-Fetch-Site':'cross-site','X-Bomi-Request':'1'};
 const preflight=await fetch(`${base}/collect`,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-bomi-request','Access-Control-Request-Private-Network':'true'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(preflight.headers.get('Access-Control-Allow-Private-Network'),'true');
 assert.equal((await fetch(`${base}/status`,{headers})).status,200);
 assert.equal((await fetch(`${base}/status`,{headers:{Origin:origin}})).status,403);
 const other=await fetch(`${base}/status`,{headers:{...headers,Origin:'https://evil.example'}});assert.equal(other.status,403);assert.equal(other.headers.get('Access-Control-Allow-Origin'),null);
 assert.equal((await fetch(`${base}/collect`,{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'{}'})).status,403);
 assert.equal(calls,0);
 assert.equal((await fetch(`${base}/collect`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({date})})).status,200);assert.equal(calls,1);
 assert.throws(()=>createAppServer({}, {cloudOrigin:'https://example.com/path'}));
});
