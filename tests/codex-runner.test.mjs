import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runCollection,publicHistory} from '../codex-runner.mjs';
test('조회 결과에는 대화만 포함하고 도구 출력과 오류 원문은 제외한다',()=>{
 const result=publicHistory({data:[{id:'turn',items:[{type:'commandExecution',output:'private'},{type:'userMessage',id:'u',content:[{type:'text',text:'요청'}]},{type:'agentMessage',id:'a',text:'완료'}]}]});
 assert.equal(result.data[0].messages.length,2);assert.ok(!JSON.stringify(result).includes('private'));assert.equal(result.nextCursor,null);
});
test('새 읽기 전용 세션에 자동 전송하고 최종 JSON 결과만 받는다',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'bomi-runner-'));t.after(()=>rm(dir,{recursive:true,force:true}));const output=join(dir,'out.json');let child,prompt='',calls=[];
 const launch=(cmd,args)=>{assert.equal(cmd,'codex');assert.deepEqual(args,['app-server','--stdio']);child=new EventEmitter();child.kill=()=>{};child.stdout=new PassThrough();child.stdin=new PassThrough();child.stdin.on('data',d=>{for(const line of d.toString().trim().split('\n')){const req=JSON.parse(line);calls.push(req);if(req.method==='thread/start')assert.equal(req.params.sandbox,'read-only');if(req.method==='turn/start')prompt=req.params.input[0].text;if(req.method)queueMicrotask(()=>child.stdout.write(JSON.stringify({id:req.id,result:req.id===2?{thread:{id:'00000000-0000-0000-0000-000000000001'}}:{}})+'\n'));}});return child;};
 const execution=await runCollection('선택 날짜 정리',output,{launch,cwd:dir});assert.ok(prompt.includes('선택 날짜 정리'));assert.equal((await stat(output)).mode&0o777,0o600);
 child.stdout.write(JSON.stringify({method:'item/completed',params:{item:{type:'agentMessage',phase:'final_answer',text:'{"records":[]}'}}})+'\n');
 child.stdout.write(JSON.stringify({method:'turn/completed',params:{turn:{status:'completed'}}})+'\n');
 assert.deepEqual(await execution.done,{records:[]});assert.deepEqual(JSON.parse(await readFile(output)),{records:[]});
});
test('실행 실패는 비밀 진단을 포함하지 않는 오류로 종료한다',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'bomi-runner-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await assert.rejects(()=>runCollection('test',join(dir,'out.json'),{launch:()=>{const child=new EventEmitter();child.kill=()=>{};child.stdout=new PassThrough();child.stdin=new PassThrough();queueMicrotask(()=>child.emit('error',new Error('secret')));return child;}}),/정리를 완료하지/);
});

test('자동 수집의 관련 작업 묶음은 보미 API에 초안으로 전달된다',async t=>{
 const {createBridge}=await import('../codex-bridge.mjs');
 const {createAppServer}=await import('../server.mjs');
 const directory=await mkdtemp(join(tmpdir(),'bomi-handoff-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 let child,prompt;
 const threadId='00000000-0000-0000-0000-000000000001';
 const launch=()=>{
  child=new EventEmitter();child.kill=()=>{};child.stdout=new PassThrough();child.stdin=new PassThrough();
  child.stdin.on('data',data=>{for(const line of data.toString().trim().split('\n')){
   const req=JSON.parse(line);if(req.method==='turn/start')prompt=req.params.input[0].text;
   if(req.id!==undefined)queueMicrotask(()=>child.stdout.write(JSON.stringify({id:req.id,result:req.method==='thread/start'?{thread:{id:threadId}}:{}})+'\n'));
  }});return child;
 };
 const bridge=createBridge({directory,deviceId:async()=>'test-device',now:()=>new Date('2026-10-10T12:00:00+09:00'),send:(url,path)=>runCollection(new URL(url).searchParams.get('prompt'),path,{launch,cwd:directory})});
 const server=createAppServer(bridge);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const response=await fetch(`${origin}/api/codex/collect`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Bomi-Request':'1'},body:JSON.stringify({date:'2026-10-10'})});
 const {job}=await response.json();assert.equal(job.status,'queued');
 assert.match(prompt,/관련 작업의 묶음 제목·배치·제안 테마/);assert.match(prompt,/전달 여부를 다시 묻거나/);
 const item=(taskKey,source=threadId)=>({threadId:source,taskKey,title:'가상 작업',summary:'노트를 정리했습니다.',text:'가상 노트를 정리했다.',evidence:'가상 완료 턴 확인'});
 const raw={requestId:job.id,date:job.date,note:'가상 누락 범위',coverageComplete:false,groups:[
  {groupKey:'notes',title:'노트 정리',themes:['career'],items:[item('turn1'),item('turn2','00000000-0000-0000-0000-000000000002')]},
  {groupKey:'exercise',title:'운동 기록',themes:['health'],items:[item('turn3')]}
 ]};
 child.stdout.write(JSON.stringify({method:'item/completed',params:{item:{type:'agentMessage',phase:'final_answer',text:JSON.stringify(raw)}}})+'\n');
 child.stdout.write(JSON.stringify({method:'turn/completed',params:{turn:{status:'completed'}}})+'\n');
 let received;for(let i=0;i<100;i++){received=(await (await fetch(`${origin}/api/codex/status?id=${job.id}`)).json()).job;if(received.status==='ready')break;await new Promise(r=>setTimeout(r,5));}
 assert.equal(received.status,'ready');assert.equal(received.coverageComplete,false);assert.equal(received.note,raw.note);
 assert.deepEqual(received.groups.map(g=>[g.title,g.items.length]),[['노트 정리',2],['운동 기록',1]]);
 assert.equal(received.groups[0].items[1].threadId,raw.groups[0].items[1].threadId);
 const saved=join(directory,`${job.id}.result.json`);assert.deepEqual(JSON.parse(await readFile(saved)),raw);assert.equal((await stat(saved)).mode&0o777,0o600);
 assert.equal(JSON.parse(await readFile(join(directory,`${job.id}.job.json`))).status,'queued');
});

test('한 연결로 목록과 여러 페이지를 읽고 종료한다',async()=>{
 const {createHistory}=await import('../codex-runner.mjs');let launches=0,killed=0,initializations=0;
 const client=createHistory({launch:()=>{
  launches++;const child=new EventEmitter();child.kill=()=>killed++;child.stdout=new PassThrough();child.stdin=new PassThrough();
  child.stdin.on('data',data=>{for(const line of data.toString().trim().split('\n')){const req=JSON.parse(line);if(req.method==='initialize')initializations++;if(req.id)queueMicrotask(()=>child.stdout.write(JSON.stringify({id:req.id,result:{data:[],nextCursor:null}})+'\n'));}});return child;
 }});
 await client.read('thread/list',{});await client.read('thread/turns/list',{});await client.read('thread/turns/list',{});client.close();
 assert.equal(launches,1);assert.equal(initializations,1);assert.equal(killed,1);await assert.rejects(client.read('thread/list',{}));
});

test('날짜 후보만 반환하고 자정 경계·아카이브·모든 페이지를 보존하며 캐시를 재사용한다',async()=>{
 const {collectionHistory}=await import('../codex-runner.mjs');const cache={},calls=[];
 const window={from:'2026-10-13T15:00:00.000Z',to:'2026-10-14T15:00:00.000Z'},sec=s=>Date.parse(s)/1000;
 let updated=sec(window.to)-1;
 const turn=(id,time)=>({id,status:'completed',startedAt:sec(time)-60,completedAt:sec(time),items:[{type:'agentMessage',text:id}]});
 const read=async(method,p)=>{calls.push([method,p]);if(method==='thread/list')return {data:p.archived?[{id:'archive',updatedAt:updated}]:[{id:'old',updatedAt:sec(window.from)-10},{id:'collector',updatedAt:updated},{id:'active',updatedAt:updated}],nextCursor:null};
  return p.cursor?{data:[turn('before','2026-10-13T14:59:59Z')],nextCursor:null}:{data:[turn('start',window.from),turn('inside','2026-10-14T00:00:00Z'),{...turn('next-day',window.to),startedAt:sec(window.to)}],nextCursor:'older'};
 };
 let prepared=await collectionHistory(read,window,{cache,exclude:['collector']});assert.deepEqual(prepared.threads.map(t=>t.id),['active','archive']);
 assert.deepEqual((await prepared.read('active')).data.map(t=>t.id),['start','inside']);assert.equal(calls.filter(c=>c[0]==='thread/turns/list').length,2);
 prepared=await collectionHistory(read,{...window,to:'2026-10-14T15:00:01Z'},{cache});
 assert.deepEqual((await prepared.read('active')).data.map(t=>t.id),['start','inside','next-day']);assert.equal(calls.filter(c=>c[0]==='thread/turns/list').length,2);
 updated++;prepared=await collectionHistory(read,window,{cache});await prepared.read('active');assert.equal(calls.filter(c=>c[0]==='thread/turns/list').length,4);
 await assert.rejects(prepared.read('not-listed'));
});

test('진행 중·시각 미확인·실패한 조회는 캐시로 건너뛰지 않는다',async()=>{
 const {collectionHistory}=await import('../codex-runner.mjs');const cache={},window={from:'2026-10-13T15:00:00Z',to:'2026-10-14T15:00:00Z'};let calls=0,fail=false;
 const read=async(method,p)=>{if(method==='thread/list')return {data:p.archived?[]:[{id:'active',updatedAt:1791961200}],nextCursor:null};calls++;if(fail)throw Error('private');return {data:[{id:'in-flight',status:'inProgress',startedAt:1791961200,completedAt:null,items:[]}],nextCursor:null};};
 let prepared=await collectionHistory(read,window,{cache});await prepared.read('active');await prepared.read('active');assert.equal(calls,2);assert.deepEqual(cache,{});
 fail=true;await assert.rejects(prepared.read('active'));assert.deepEqual(cache,{});
});

test('변경 후보가 없으면 AI 세션 없이 빈 초안을 완료한다',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'bomi-empty-'));t.after(()=>rm(dir,{recursive:true,force:true}));let calls=0;
 const result=await runCollection('test',join(dir,'out.json'),{launch:()=>{throw Error('AI should not start');},readHistory:async()=>{calls++;return {data:[],nextCursor:null};},collection:{requestId:'test',date:'2026-10-14',window:{from:'2026-10-13T15:00:00Z',to:'2026-10-14T15:00:00Z'}}});
 assert.equal(calls,2);assert.deepEqual((await result.done).groups,[]);assert.equal((await result.done).coverageComplete,true);
});

test('목록 조회 실패와 커서 반복을 빈 결과 성공으로 처리하지 않는다',async()=>{
 const {collectionHistory}=await import('../codex-runner.mjs');const window={from:'2026-10-13T15:00:00Z',to:'2026-10-14T15:00:00Z'};
 await assert.rejects(collectionHistory(async()=>{throw Error('failed');},window));
 await assert.rejects(collectionHistory(async()=>({data:[],nextCursor:'repeat'}),window),/반복/);
});

test('조회 실패 후 AI가 완료로 응답해도 수집 구간을 건너뛰지 않는다',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'bomi-failed-page-'));t.after(()=>rm(dir,{recursive:true,force:true}));let child,toolResult;
 const launch=()=>{child=new EventEmitter();child.kill=()=>{};child.stdout=new PassThrough();child.stdin=new PassThrough();child.stdin.on('data',d=>{for(const line of d.toString().trim().split('\n')){const req=JSON.parse(line);if(req.id===50){toolResult=req;continue;}if(req.method&&req.id)queueMicrotask(()=>child.stdout.write(JSON.stringify({id:req.id,result:req.method==='thread/start'?{thread:{id:'00000000-0000-0000-0000-000000000001'}}:{}})+'\n'));}});return child;};
 const execution=await runCollection('가상 수집',join(dir,'out.json'),{launch,readHistory:async()=>{throw Error('private error');}});
 child.stdout.write(JSON.stringify({id:50,method:'item/tool/call',params:{tool:'bomi_history',arguments:{action:'list'}}})+'\n');
 for(let n=0;n<20&&!toolResult;n++)await new Promise(r=>setTimeout(r,5));assert.equal(toolResult.result.success,false);assert.ok(!JSON.stringify(toolResult).includes('private error'));
 child.stdout.write(JSON.stringify({method:'item/completed',params:{item:{type:'agentMessage',phase:'final_answer',text:'{"groups":[],"coverageComplete":true,"note":""}'}}})+'\n');child.stdout.write(JSON.stringify({method:'turn/completed',params:{turn:{status:'completed'}}})+'\n');
 assert.equal((await execution.done).coverageComplete,false);assert.match((await execution.done).note,/실패/);
});

test('조회 시작 전 시작해서 종료 후 끝난 턴도 누락시키지 않고 시각과 함께 전달한다',async()=>{
 const {collectionHistory}=await import('../codex-runner.mjs');const window={from:'2026-10-13T15:00:00Z',to:'2026-10-14T15:00:00Z'};
 const turn={id:'crossing',status:'completed',startedAt:Date.parse(window.from)/1000-60,completedAt:Date.parse(window.to)/1000+60,items:[]};
 const prepared=await collectionHistory(async(method,p)=>({data:method==='thread/list'?(p.archived?[]:[{id:'t',updatedAt:turn.completedAt}]):[turn],nextCursor:null}),window);
 assert.equal((await prepared.read('t')).data[0].id,'crossing');
});
