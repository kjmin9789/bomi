import test from 'node:test';
import assert from 'node:assert/strict';
import {newestRecords,groupRecords,activeThemes,flowerStage,validateRecord,validateState,emptyState,weekStart,shiftDate,weekSummary,validDate} from '../app/model.js';
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


test('내용 묶음은 순서와 원본을 보존하고 백업에서도 유지된다',()=>{
 const a={...record('a'),group:' 글 작성 '},b={...record('b'),group:'생활 도구 만들기'},c={...record('c'),group:'글 작성'},old=record('old');
 assert.deepEqual(groupRecords([a,b,c,old]),[['글 작성',[a,c]],['생활 도구 만들기',[b]],['',[old]]]);
 const data=emptyState();data.records=[a,b,c,old];
 const restored=validateState(JSON.parse(JSON.stringify(data)));
 assert.equal(restored.records[0].group,'글 작성');
 assert.deepEqual(restored.records[3],old);
 assert.deepEqual(activeThemes(restored.records,a.date),activeThemes(data.records,a.date));
 for(const group of [null,{},'x'.repeat(81),'두\n줄'])assert.throws(()=>validateRecord({...a,group}));
});

test('짧은 제목은 상세와 별도로 검증하고 백업 왕복에도 보존한다',()=>{
  const entry={...record('brief'),summary:' 글을 임시저장했다 ',text:'사진과 본문을 수정하고 편집기에 임시저장했다.'};
  const restored=validateState({...emptyState(),records:[entry]}).records[0];
  assert.equal(restored.summary,'글을 임시저장했다');
  assert.equal(restored.text,entry.text);
  assert.equal(validateRecord({...entry,summary:''}).summary,undefined);
  for(const summary of [42,'x'.repeat(81),'첫 줄\n다음 줄'])assert.throws(()=>validateRecord({...entry,summary}));
});

test('묶음 미리보기는 날짜와 같은 날짜의 저장 순서로 최신 기록을 선택한다',()=>{
 const records=[record('old','2026-10-09'),record('first'),record('last')];
 assert.deepEqual(newestRecords(records).map(r=>r.id),['last','first','old']);
 assert.deepEqual(records.map(r=>r.id),['old','first','last']);
 assert.deepEqual(newestRecords([]),[]);
});
