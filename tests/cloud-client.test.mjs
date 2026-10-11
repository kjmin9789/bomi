import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudStore,codexRequest} from '../app/cloud.js';
import {emptyState} from '../app/model.js';
const storage=()=>{
  const map=new Map();
  return {get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
};
test('서버 전송 전 로컬 저장, 응답 유실 후 같은 ID로 재시도',async()=>{
  const local=storage();let first=true, mutation;
  const store=new CloudStore('test',local,async(path,method,input)=>{
    assert.equal(store.pending().length,1);
    assert.ok(local.getItem('bomi.cloud.test.before'));
    if(first){first=false;mutation=input.mutation;throw new Error('network');}
    assert.equal(input.mutation,mutation);return {revision:1};
  });
  await assert.rejects(store.save(emptyState(),emptyState()));
  assert.equal(store.pending().length,1);
  await assert.rejects(store.save(emptyState(),emptyState()));
  const restored=await store.retry();
  assert.deepEqual(restored,emptyState());assert.equal(store.pending().length,0);assert.equal(store.revision,1);
});
test('로컬 저장 실패 시 서버에 쓰지 않음, 계정별 대기 데이터 격리',async()=>{
  const local=storage();let requests=0;
  local.setItem=()=>{throw new Error('quota');};
  const store=new CloudStore('a',local,async()=>requests++);
  await assert.rejects(store.save(emptyState(),emptyState()));assert.equal(requests,0);
  const shared=storage();shared.setItem('bomi.cloud.a.pending:one',JSON.stringify({state:emptyState()}));
  assert.equal(new CloudStore('b',shared).pending().length,0);
});

test('Codex 요청은 현재 컴퓨터로만 보내고 클라우드 인증정보를 보내지 않는다',async t=>{
 const requests=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,options});return Response.json({connected:true});});
 await codexRequest('status');await codexRequest('collect',{date:'2026-10-10'});await codexRequest('status',undefined,true);
 assert.equal(requests[0].url,'http://127.0.0.1:4174/api/codex/status');
 assert.equal(requests[1].options.credentials,'omit');assert.equal(requests[1].options.redirect,'error');
 assert.equal(requests[1].options.headers['X-Bomi-Request'],'1');
 assert.equal(requests[2].url,'/api/codex/status');
});

test('기기별 추가 기록을 합치고 다른 필드 수정·삭제도 보존한다',async()=>{
 const {mergeStates}=await import('../app/cloud.js');
 const record=(id,text)=>({id,date:'2026-10-11',text,themes:['career'],result:'',saved:false});
 const base={...emptyState(),records:[record('a','원문'),record('gone','삭제') ]};
 const local=structuredClone(base),remote=structuredClone(base);
 local.records[0].text='수정';local.records.splice(1,1);local.records.push(record('local','이 기기'));
 remote.records[0].saved=true;remote.records.push(record('remote','다른 기기'));
 const merged=mergeStates(base,local,remote);
 assert.deepEqual(merged.records.map(r=>r.id),['a','local','remote']);
 assert.equal(merged.records[0].text,'수정');assert.equal(merged.records[0].saved,true);
 remote.records[0].text='충돌';assert.throws(()=>mergeStates(base,local,remote),/다른 기기/);
 remote.records=base.records.map(r=>({...r}));remote.records[1].text='삭제 중 수정';
 assert.throws(()=>mergeStates(base,local,remote),/다른 기기/);
});

test('동시 저장 충돌은 합친 입력을 먼저 로컬에 보존하고 응답 유실 시 그대로 재시도한다',async()=>{
 const record=id=>({id,date:'2026-10-11',text:id,themes:['career'],result:'',saved:false});
 const base=emptyState(),local={...base,records:[record('local')]},remote={...base,records:[record('remote')]};
 const disk=storage();let puts=0,last;
 const store=new CloudStore('merge',disk,async(path,method,input)=>{
   if(!method)return {revision:1,state:remote};
   puts++;
   if(puts===1)throw Object.assign(new Error('conflict'),{status:409});
   assert.deepEqual(input.state.records.map(r=>r.id),['local','remote']);
   assert.deepEqual(store.pending()[0].input,input);
   if(puts===2){last=input.mutation;throw new Error('response lost');}
   assert.equal(input.mutation,last);return {revision:2};
 });
 await assert.rejects(store.save(local,base),/response lost/);
 const result=await store.retry();assert.equal(result.records.length,2);assert.equal(store.pending().length,0);
});
