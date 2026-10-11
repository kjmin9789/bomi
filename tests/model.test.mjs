import test from 'node:test';
import assert from 'node:assert/strict';
import {sortedWorkGroups,newestRecords,groupRecords,activeThemes,flowerStage,validateRecord,validateState,emptyState,weekStart,shiftDate,weekSummary,validDate} from '../app/model.js';
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

test('반복 질문은 한국시간 요일·시각과 개별 답변으로 판단한다', async()=>{
  const {validateRoutine,routineDue}=await import('../app/model.js');
  const s=emptyState();
  s.routines=[validateRoutine({id:'weekly',title:'연습했나요?',kind:'activity',days:[1,3,5],time:'19:00',before:'',enabled:true})];
  assert.equal(routineDue(s,new Date('2026-10-05T09:59:00Z')).length,0);
  assert.equal(routineDue(s,new Date('2026-10-05T10:00:00Z')).length,1);
  assert.equal(routineDue(s,new Date('2026-10-06T10:00:00Z')).length,0);
  s.records=[{date:'2026-10-05'}];
  assert.equal(routineDue(s,new Date('2026-10-05T10:00:00Z')).length,1);
  s.checkins=[{key:'2026-10-05:weekly'}];
  assert.equal(routineDue(s,new Date('2026-10-05T10:00:00Z')).length,0);
  assert.equal(routineDue(s,new Date('2026-10-07T10:00:00Z')).length,1);
  s.rest=['2026-10-07'];
  assert.equal(routineDue(s,new Date('2026-10-07T10:00:00Z')).length,0);
  s.rest=[];s.routines[0].enabled=false;
  assert.equal(routineDue(s,new Date('2026-10-07T10:00:00Z')).length,0);
});
test('누운 시각은 전날 밤과 당일 새벽을 구분하고 정확한 기준 시각은 이후다',async()=>{
  const {validateCheckin,bedtimeBefore}=await import('../app/model.js');
  const make=bedtime=>validateCheckin({key:'2026-10-05:sleep',routineId:'sleep',date:'2026-10-05',title:'취침 확인',answer:'bedtime',before:'02:00',bedtime},new Date('2026-10-05T00:00:00Z'));
  assert.equal(bedtimeBefore(make('2026-10-04T23:45')),true);
  assert.equal(bedtimeBefore(make('2026-10-05T01:59')),true);
  assert.equal(bedtimeBefore(make('2026-10-05T02:00')),false);
  assert.equal(bedtimeBefore(make('2026-10-05T02:01')),false);
  assert.throws(()=>make('2026-10-05T10:00'));
  assert.throws(()=>make('2026-10-03T23:00'));
  assert.throws(()=>make('2026-10-05T25:00'));
});
test('이전 백업 호환과 반복 질문·답변 보존, 중복 및 잘못된 입력 차단',async()=>{
  const {validateRoutine}=await import('../app/model.js');
  const s=emptyState();delete s.routines;delete s.checkins;
  assert.deepEqual(validateState(s).routines,[]);
  s.routines=[{id:'test',title:'복습',kind:'activity',days:[0],time:'10:00',before:'',enabled:true}];
  s.checkins=[{key:'2026-10-04:test',routineId:'test',date:'2026-10-04',title:'복습',answer:'done',bedtime:'',before:''}];
  assert.deepEqual(validateState(s).checkins,s.checkins);
  assert.equal(flowerStage(activeThemes(validateState(s).records,'2026-10-04')),0);
  for(const patch of [{days:[]},{days:[1,1]},{days:[7]},{time:'24:00'},{enabled:'true'},{id:'<unsafe>'}])assert.throws(()=>validateRoutine({...s.routines[0],...patch}));
  assert.throws(()=>validateState({...s,checkins:[...s.checkins,...s.checkins]}));
  assert.throws(()=>validateState({...s,routines:[...s.routines,...s.routines]}));
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

test('묶음은 개수, 건강·재테크·커리어, 최신 순으로 정렬한다',()=>{
 const r=(id,group,themes)=>({...record(id,'2026-10-10',themes),group});
 const rows=[r('1','career-old',['career']),r('2','money',['money']),r('3','health',['health']),r('4','large',['career']),r('5','large',['career']),r('6','career-new',['career'])];
 assert.deepEqual(sortedWorkGroups(rows).map(([name])=>name),['large','health','money','career-new','career-old']);
 assert.deepEqual(sortedWorkGroups([r('1','mixed',['career','health']),r('2','money',['money'])]).map(([name])=>name),['mixed','money']);
});

import {today,validateRoutine,saveRoutineAnswer,routineSchedule} from '../app/model.js';
test('루틴 완료 답변은 한 번만 기록하고 수정·건너뛰기를 반영한다',()=>{
  const state=emptyState(),date=today();
  state.routines=[validateRoutine({id:'test-routine',title:'확인한 행동',kind:'activity',days:[1],time:'08:00',enabled:true,themes:['health']})];
  const answer={key:`${date}:test-routine`,routineId:'test-routine',date,title:'확인한 행동',answer:'done'};
  saveRoutineAnswer(state,answer,['health']);saveRoutineAnswer(state,answer,['health']);
  assert.equal(state.records.length,1);assert.equal(state.checkins.length,1);
  assert.equal(flowerStage(activeThemes(state.records,date)),1);
  assert.equal(validateState(state).records.length,1);
  saveRoutineAnswer(state,{...answer,answer:'skip'},[]);
  assert.equal(state.records.length,0);assert.equal(state.checkins[0].answer,'skip');
});
test('확인하지 않은 테마·미래 취침은 기록하지 않고 원상태를 보존한다',()=>{
  const state=emptyState(),date=today();
  state.routines=[validateRoutine({id:'r',title:'행동',kind:'activity',days:[1],time:'08:00',enabled:true})];
  const before=JSON.stringify(state),answer={key:`${date}:r`,routineId:'r',date,title:'행동',answer:'done'};
  assert.throws(()=>saveRoutineAnswer(state,answer,[]));assert.equal(JSON.stringify(state),before);
  assert.throws(()=>saveRoutineAnswer(state,answer,['unknown']));assert.equal(JSON.stringify(state),before);
  const previous=shiftDate(date,-1);
  saveRoutineAnswer(state,{...answer,answer:'bedtime',bedtime:`${previous}T23:30`,before:'01:00'},['health']);
  assert.equal(state.records[0].date,previous);
});
test('루틴 일정은 한국어 요일과 오전·오후로 표시한다',()=>{
  assert.equal(routineSchedule({days:[5,1,3],time:'20:30'}),'월·수·금요일 오후 8시 30분');
  assert.equal(routineSchedule({days:[0,1,2,3,4,5,6],time:'00:00'}),'매일 오전 12시');
});
