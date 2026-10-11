import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudStore} from '../app/cloud.js';
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
