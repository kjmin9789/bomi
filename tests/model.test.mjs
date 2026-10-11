import test from 'node:test';
import assert from 'node:assert/strict';
import {activeThemes,flowerStage,validateRecord,validateState,emptyState,weekStart,shiftDate,weekSummary,validDate} from '../app/model.js';
const record=(id,date='2026-10-10',themes=['career'])=>({id,date,text:'원고 준비',result:'임시저장 원고',themes,saved:false});
test('테마 중복 기록은 실천 테마 수를 바꾸지 않는다',()=>{
  const once=activeThemes([record('1')],'2026-10-10');
  assert.deepEqual(activeThemes([record('1'),record('2')],'2026-10-10'),once);
  assert.equal(once.filter(Boolean).length,1);
  assert.equal(activeThemes([record('1'),record('2','2026-10-10',['health'])],'2026-10-10').filter(Boolean).length,2);
  assert.deepEqual(activeThemes([record('1')],'2026-10-11'),Array(3).fill(false));
});
test('여러 테마 한 기록과 마지막 기록 삭제',()=>{
  const records=[record('1','2026-10-10',['career','health']),record('2')];
  assert.equal(activeThemes(records,'2026-10-10').filter(Boolean).length,2);
  assert.equal(activeThemes(records.filter(r=>r.id!=='1'),'2026-10-10').filter(Boolean).length,1);
  assert.equal(activeThemes([],'2026-10-10').filter(Boolean).length,0);
});
test('실제 날짜와 입력 검증: 미래, 빈 기록, 잘못된 테마 차단',()=>{
  assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2024-02-29'),true);
  assert.throws(()=>validateRecord(record('1','2099-01-01'),'2026-10-11'));
  assert.throws(()=>validateRecord({...record('1'),text:'  '}));
  assert.throws(()=>validateRecord(record('1','2026-10-10',['bogus'])));
  assert.throws(()=>validateRecord(record('1','2026-10-10',['career','career'])));
  assert.equal(validateRecord({...record('1'),text:' 원고 준비 '}).text,'원고 준비');
});
test('주간 요약은 월요일부터 일요일까지, 기록 수 대신 실천일 집계',()=>{
  assert.equal(weekStart('2026-10-11'),'2026-10-05');
  assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
  const summary=weekSummary([record('1'),record('2'),record('3','2026-10-04')],'2026-10-05');
  assert.equal(summary.entries.length,2);assert.equal(summary.days,1);
  assert.equal(summary.themes.find(t=>t.id==='career').days,1);
});
test('백업 검증은 중복 ID·잘못된 알림을 차단하고 텍스트를 그대로 보존',()=>{
  const data=emptyState();data.records=[{...record('1'),text:'<script>not executable</script>'}];
  assert.deepEqual(validateState(data).records,data.records);
  assert.throws(()=>validateState({...data,records:[record('1'),record('1')]}));
  assert.throws(()=>validateState({...data,reminder:'99:70'}));
  assert.throws(()=>validateState({...data,rest:['2026-02-30']}));
  assert.throws(()=>validateState({...data,version:2}));
});

test('세 테마만 활성화하고 이전 기록과 미래 문장은 보존',()=>{
  const data=emptyState(); data.records=[record('old','2026-10-10',['family','sns','home'])];
  data.futures={family:'가족의 미래',home:'나의 집',sns:'나의 콘텐츠'};
  const restored=validateState(data);
  assert.deepEqual(restored.records,data.records);
  assert.deepEqual(restored.futures,data.futures);
  assert.deepEqual(activeThemes(restored.records,'2026-10-10'),[false,false,false]);
  assert.throws(()=>validateRecord(record('new','2026-10-10',['family'])));
});

test('하루 꽃은 기록 건수가 아닌 실천한 테마 수로 0~3단계',()=>{
  const records=[];
  assert.equal(flowerStage(activeThemes(records,'2026-10-10')),0);
  records.push(record('1','2026-10-10',['health']));
  assert.equal(flowerStage(activeThemes(records,'2026-10-10')),1);
  records.push(record('2','2026-10-10',['health']));
  assert.equal(flowerStage(activeThemes(records,'2026-10-10')),1);
  records.push(record('3','2026-10-10',['career']));
  assert.equal(flowerStage(activeThemes(records,'2026-10-10')),2);
  records.push(record('4','2026-10-10',['money']));
  assert.equal(flowerStage(activeThemes(records,'2026-10-10')),3);
  assert.equal(flowerStage(activeThemes(records.slice(0,-1),'2026-10-10')),2);
  assert.equal(flowerStage(activeThemes(records,'2026-10-09')),0);
});
