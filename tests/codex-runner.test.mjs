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
