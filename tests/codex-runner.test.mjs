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
