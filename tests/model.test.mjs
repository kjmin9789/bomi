import test from 'node:test';
import assert from 'node:assert/strict';
import {putRecord,projectRecords,sortedWorkGroups,newestRecords,groupRecords,activeThemes,flowerStage,validateRecord,validateState,emptyState,weekStart,shiftDate,weekSummary,validDate} from '../app/model.js';
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
  assert.deepEqual(projectRecords(validateState(data)).map(({groupId,group,...r})=>r),data.records);
  assert.throws(()=>validateState({...data,records:[record('1'),record('1')]}));
  assert.throws(()=>validateState({...data,reminder:'99:70'}));
  assert.throws(()=>validateState({...data,rest:['2026-02-30']}));
  assert.throws(()=>validateState({...data,version:99}));
});

test('세 테마만 활성화하고 이전 기록과 미래 문장은 보존',()=>{
  const data=emptyState(); data.records=[record('old','2026-10-10',['family','sns','home'])];
  data.futures={family:'가족의 미래',home:'나의 집',sns:'나의 콘텐츠'};
  const restored=validateState(data);
  assert.deepEqual(projectRecords(restored).map(({groupId,group,...r})=>r),data.records);
  assert.deepEqual(restored.futures,data.futures);
  assert.deepEqual(activeThemes(projectRecords(restored),'2026-10-10'),[false,false,false]);
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
  assert.deepEqual(validateState(s).checkins,s.checkins.map(({bedtime,before,...answer})=>answer));
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
 assert.equal(projectRecords(restored)[0].group,'글 작성');
 assert.deepEqual((({groupId,group,...r})=>r)(projectRecords(restored)[3]),old);
 assert.deepEqual(activeThemes(projectRecords(restored),a.date),activeThemes(data.records,a.date));
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
  assert.equal(state.groups[0].title,'확인한 행동 완료');
  assert.equal(flowerStage(activeThemes(projectRecords(state),date)),1);
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
  assert.equal(projectRecords(state)[0].date,date);
  assert.equal(state.checkins[0].bedtime,`${previous}T23:30`);
  assert.equal(flowerStage(activeThemes(projectRecords(state),previous)),0);
  assert.equal(flowerStage(activeThemes(projectRecords(state),date)),1);
});
test('루틴 일정은 한국어 요일과 오전·오후로 표시한다',()=>{
  assert.equal(routineSchedule({days:[5,1,3],time:'20:30'}),'월·수·금요일 오후 8시 30분');
  assert.equal(routineSchedule({days:[0,1,2,3,4,5,6],time:'00:00'}),'매일 오전 12시');
});


test('루틴 메모는 백업에서도 보존하고 빈 값과 이전 일정도 지원한다',()=>{
  const r={id:'memo-test',title:'복습',kind:'bedtime',days:[1],time:'08:00',before:'01:00',enabled:true};
  const state=emptyState();state.routines=[validateRoutine({...r,memo:'  준비물 확인  '})];
  assert.equal(validateState(state).routines[0].memo,'준비물 확인');
  assert.equal(validateRoutine(r).before,'01:00');
  assert.equal(validateRoutine({...r,memo:''}).memo,undefined);
  assert.throws(()=>validateRoutine({...r,memo:'a'.repeat(501)}));
  assert.throws(()=>validateRoutine({...r,memo:42}));
});

test('날짜별 테마 인덱스는 중복 및 과거 테마가 있어도 기존 꽃 계산과 같다',async()=>{
  const {themesByDate}=await import('../app/model.js');
  const records=[record('a','2026-10-10',['health','career']),record('b','2026-10-10',['health']),record('c','2026-10-11',['money','family'])];
  const indexed=themesByDate(records);
  for(const date of ['2026-10-10','2026-10-11'])assert.deepEqual(indexed.get(date),activeThemes(records,date));
  assert.equal(indexed.has('2026-10-12'),false);
});
test('일반 루틴과 완료 답변은 불필요한 빈 취침 필드를 저장하지 않는다',async()=>{
  const {validateRoutine,validateCheckin}=await import('../app/model.js');
  const routine=validateRoutine({id:'test',title:'운동',kind:'activity',days:[1],time:'08:00',enabled:true,before:'',themes:['health']});
  assert.equal('before' in routine,false);
  const answer=validateCheckin({key:'2026-10-10:test',routineId:'test',date:'2026-10-10',title:'운동',answer:'done',bedtime:'',before:''},new Date('2026-10-12T00:00:00Z'));
  assert.equal('before' in answer,false);assert.equal('bedtime' in answer,false);
});

test('v1 이관은 테마가 다른 기존 기록을 분리하고 내용·꽃·백업 왕복을 보존한다',()=>{
 const legacy={...emptyState(),version:1,records:[{...record('a'),group:'같은 제목'},{...record('b'),group:'같은 제목'},{...record('c','2026-10-10',['health']),group:'같은 제목'}]};delete legacy.groups;
 const next=validateState(legacy);
 assert.equal(next.version,2);assert.equal(next.groups.length,2);
 assert.equal(next.records[0].groupId,next.records[1].groupId);assert.notEqual(next.records[0].groupId,next.records[2].groupId);
 for(const r of next.records)for(const field of ['date','themes','group','saved'])assert.equal(field in r,false);
 assert.deepEqual(activeThemes(projectRecords(next),'2026-10-10'),activeThemes(legacy.records,'2026-10-10'));
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(next))),next);
 assert.throws(()=>validateState({...next,groups:[]}));
});
test('같은 제목의 독립 묶음과 제목 변경은 ID를 유지하고 개별 기록을 다시 쓰지 않는다',async()=>{
 const {putRecord,patchGroup}=await import('../app/model.js');const s=emptyState();
 putRecord(s,{...record('a'),group:'동일'},'g1');putRecord(s,{...record('b'),group:'동일'},'g2');
 const before=JSON.stringify(s.records);patchGroup(s,'g1',{title:'수정',themes:['health']});
 assert.equal(JSON.stringify(s.records),before);assert.equal(s.groups[1].title,'동일');
 assert.deepEqual(projectRecords(s)[0].themes,['health']);assert.equal(groupRecords(projectRecords(s)).length,2);
 s.records=s.records.filter(r=>r.groupId!=='g1');assert.deepEqual(validateState(s).groups.map(g=>g.id),['g2']);
});

test('묶음 합치기는 받는 쪽 테마만 적용하고 분리 후에도 내용·식별자·보관을 보존한다',async()=>{
 const {putRecord,mergeGroups,splitGroup}=await import('../app/model.js');const s=emptyState();
 putRecord(s,{...record('a'),summary:'요약',saved:true},'g1');
 putRecord(s,record('b'),'g1');putRecord(s,record('c','2026-10-10',['health']),'g2');
 const original=s.records.map(({groupId,...r})=>r);
 mergeGroups(s,['g1','g2'],'하나의 묶음');
 assert.equal(s.groups.length,1);assert.deepEqual(s.groups[0].themes,['career']);
 assert.ok(projectRecords(s).every(r=>r.themes.length===1&&r.themes[0]==='career'));
 splitGroup(s,'g1',['a'],'분리한 묶음','new');
 assert.equal(s.groups.length,2);assert.equal(s.records[0].groupId,'new');
 assert.deepEqual(s.records.map(({groupId,...r})=>r),original);
 assert.deepEqual(activeThemes(projectRecords(s),'2026-10-10'),[false,true,false]);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
});
test('잘못된 합치기·분리는 변경 없이 거절하고 같은 제목도 독립 묶음으로 둔다',async()=>{
 const {putRecord,mergeGroups,splitGroup}=await import('../app/model.js');const s=emptyState();
 putRecord(s,record('a'),'g1');putRecord(s,record('b'),'g1');putRecord(s,record('c','2026-10-09'),'g2');
 for(const run of [()=>mergeGroups(s,['g1'],'제목'),()=>mergeGroups(s,['g1','g2'],'제목'),()=>mergeGroups(s,['g1','missing'],'제목'),()=>splitGroup(s,'g1',[],'제목','new'),()=>splitGroup(s,'g1',['a','b'],'제목','new'),()=>splitGroup(s,'g1',['c'],'제목','new'),()=>splitGroup(s,'g1',['a'],'제목','g2'),()=>splitGroup(s,'g1',['a'],'','new')]){
  const before=structuredClone(s);assert.throws(run);assert.deepEqual(s,before);
 }
 splitGroup(s,'g1',['a'],'동일','new');s.groups.find(g=>g.id==='g1').title='동일';
 assert.equal(groupRecords(projectRecords(validateState(s))).length,3);
});

test('기록을 기존 묶음으로 옮기면 내용과 날짜를 보존하고 빈 묶음만 정리한다',async()=>{
 const {putRecord,moveGroupedRecord}=await import('../app/model.js'),s=emptyState();
 putRecord(s,{...record('a'),group:'첫 묶음',summary:'요약',saved:true},'g1');
 putRecord(s,{...record('b','2026-10-10',['health']),group:'받는 묶음'},'g2');
 const before=structuredClone(s.records[0]);moveGroupedRecord(s,'a','g2');
 assert.deepEqual(s.records[0],{...before,groupId:'g2'});assert.equal(s.groups.length,1);assert.equal(s.groups[0].title,'받는 묶음');
 assert.deepEqual(s.groups[0].themes,['health']);assert.doesNotThrow(()=>validateState(s));
 const same=structuredClone(s);assert.throws(()=>moveGroupedRecord(s,'a','g2'));assert.deepEqual(s,same);
});
test('일부 기록 이동은 받는 태그를 따르고 원래 묶음에 남은 태그는 보존한다',async()=>{
 const {moveGroupedRecord}=await import('../app/model.js'),s=emptyState();
 putRecord(s,record('a'),'g1');putRecord(s,record('b'),'g1');
 putRecord(s,record('c','2026-10-10',['health']),'g2');
 moveGroupedRecord(s,'a','g2');
 const records=projectRecords(validateState(JSON.parse(JSON.stringify(s))));
 assert.deepEqual(records.find(r=>r.id==='a').themes,['health']);
 assert.deepEqual(records.find(r=>r.id==='b').themes,['career']);
 assert.deepEqual(records.find(r=>r.id==='c').themes,['health']);
});
test('묶음 밖으로 꺼낼 때 제목은 기록에서 가져오고 단독 기록은 꺼내지 않는다',async()=>{
 const {putRecord,moveGroupedRecord}=await import('../app/model.js'),s=emptyState();
 putRecord(s,{...record('a'),summary:'꺼낸 기록'},'g');putRecord(s,record('b'),'g');
 moveGroupedRecord(s,'a','','new');assert.equal(s.groups.find(g=>g.id==='new').title,'꺼낸 기록');
 assert.equal(s.records.find(r=>r.id==='a').groupId,'new');assert.equal(s.records.find(r=>r.id==='b').groupId,'g');
 const before=structuredClone(s);assert.throws(()=>moveGroupedRecord(s,'a','','another'));assert.deepEqual(s,before);
});
test('묶음 실행 취소는 미래 등 다른 설정을 보존하고 이후 기록 변경은 덮어쓰지 않는다',async()=>{
 const {putRecord,mergeGroups,restoreWork}=await import('../app/model.js'),s=emptyState();
 putRecord(s,record('a'),'g1');putRecord(s,record('b','2026-10-10',['health']),'g2');const before=structuredClone(s);
 mergeGroups(s,['g2','g1'],'합친 이름');const after=structuredClone(s);
 s.futures.career='바뀐 미래';restoreWork(s,before,after);assert.deepEqual(s.groups,before.groups);assert.equal(s.futures.career,'바뀐 미래');
 const changed=structuredClone(after);changed.records[0].text='다른 기기 수정';const preserved=structuredClone(changed);
 assert.throws(()=>restoreWork(changed,before,after));assert.deepEqual(changed,preserved);
});


test('이전 고정 루틴 묶음은 실제 행동을 표시하고 원본과 사용자 제목은 보존한다',()=>{
  const state=emptyState();
  state.groups=[{id:'routine:swim:2026-10-10',date:'2026-10-10',title:'고정 루틴',themes:['health']}];
  state.records=[{id:'routine-2026-10-10:swim',groupId:state.groups[0].id,text:'수영 완료'}];
  const before=JSON.stringify(state);
  assert.equal(projectRecords(state)[0].group,'수영 완료');
  assert.equal(JSON.stringify(state),before);
  state.groups[0].title='나의 운동';
  assert.equal(projectRecords(state)[0].group,'나의 운동');
  state.groups[0].title='고정 루틴';
  state.records.push({id:'manual',groupId:state.groups[0].id,text:'직접 추가한 일'});
  assert.equal(projectRecords(state)[0].group,'고정 루틴');
});


test('제목 없는 기존 기록은 메모를 제목으로 표시하고 새 기록은 같은 제목을 저장한다',()=>{
 const state=emptyState();state.groups=[{id:'g',date:'2026-10-10',title:'',themes:['health']}];state.records=[{id:'a',groupId:'g',summary:'산책 완료',text:'기존 상세 원문'}];
 assert.equal(projectRecords(state)[0].group,'산책 완료');assert.equal(state.groups[0].title,'');
 state.groups[0].title='내 제목';assert.equal(projectRecords(state)[0].group,'내 제목');
 putRecord(state,{id:'new',date:'2026-10-10',text:'수영 완료',result:'',themes:['health']});
 assert.equal(projectRecords(state).find(r=>r.id==='new').group,'수영 완료');
});


test('이전 취침 루틴도 시각 없이 예·아니오로 답하며 중복 기록하지 않는다',()=>{
 const state=emptyState(),date=today();
 state.routines=[validateRoutine({id:'legacy',title:'등록한 기준',kind:'bedtime',before:'01:00',days:[1],time:'08:00',enabled:true,themes:['health']})];
 const answer={key:`${date}:legacy`,routineId:'legacy',title:'등록한 기준',date,answer:'done'};
 saveRoutineAnswer(state,answer,['health']);saveRoutineAnswer(state,answer,['health']);
 assert.equal(state.records.length,1);assert.equal(state.checkins.length,1);assert.equal(projectRecords(state)[0].date,date);
 assert.equal('bedtime' in state.checkins[0],false);assert.equal(state.routines[0].before,'01:00');
 saveRoutineAnswer(state,{...answer,answer:'skip'},[]);assert.equal(state.records.length,0);
 assert.equal(validateState(state).checkins[0].answer,'skip');
});

test('밤의 미답변은 다음날 남고 08시부터 별도 회차로 재알림한다',async()=>{
 const {pendingRoutines,routineReminders}=await import('../app/model.js');
 const state=emptyState();
 state.routines=[validateRoutine({id:'practice',title:'연습',kind:'activity',days:[1],time:'23:55',enabled:true,themes:['career']})];
 const at=time=>new Date(`2026-10-13T${time}:00+09:00`);
 assert.deepEqual(pendingRoutines(state,at('07:59')).map(r=>r.key),['2026-10-12:practice']);
 assert.equal(routineReminders(state,at('07:59')).length,0);
 assert.equal(routineReminders(state,at('08:00'))[0].deliveryKey,'2026-10-12:practice:morning');
 assert.equal(routineReminders(state,at('23:59')).length,1);
 assert.equal(pendingRoutines(state,new Date('2026-10-14T08:00:00+09:00')).length,0);
 for(const answer of ['done','skip']){
  state.checkins=[{key:'2026-10-12:practice',answer}];
  assert.equal(pendingRoutines(state,at('08:00')).length,0);
  assert.equal(routineReminders(state,at('08:00')).length,0);
 }
 state.checkins=[];state.rest=['2026-10-13'];assert.equal(pendingRoutines(state,at('08:00')).length,0);
 state.rest=['2026-10-12'];assert.equal(pendingRoutines(state,at('08:00')).length,0);
 state.rest=[];state.routines[0].enabled=false;assert.equal(pendingRoutines(state,at('08:00')).length,0);
});
test('전날 질문 답변은 회차를 보존하면서 답한 날짜에 한 번만 기록한다',()=>{
 const state=emptyState(),date=shiftDate(today(),-1);
 state.routines=[validateRoutine({id:'practice',title:'연습',kind:'activity',days:[1],time:'23:55',enabled:true,themes:['career']})];
 const answer={key:`${date}:practice`,routineId:'practice',date,title:'연습',answer:'done'};
 saveRoutineAnswer(state,answer,['career']);saveRoutineAnswer(state,answer,['career']);
 assert.equal(state.checkins[0].date,date);assert.equal(state.records.length,1);
 assert.equal(projectRecords(state)[0].date,today());assert.equal(flowerStage(activeThemes(projectRecords(state),date)),0);
 assert.equal(validateState(state).records.length,1);
 saveRoutineAnswer(state,{...answer,answer:'skip'},[]);assert.equal(state.records.length,0);
});


test('이미 저장한 과거 루틴 답변을 수정해도 원래 기록 날짜는 유지한다',()=>{
 const state=emptyState(),date=shiftDate(today(),-2);
 state.routines=[validateRoutine({id:'practice',title:'연습',kind:'activity',days:[1],time:'23:55',enabled:true,themes:['career']})];
 const answer={key:`${date}:practice`,routineId:'practice',date,title:'연습',answer:'done'};
 putRecord(state,{id:`routine-${answer.key}`,date,text:'연습 완료',result:'',themes:['career'],saved:true},`routine:practice:${date}`);
 state.checkins=[answer];saveRoutineAnswer(state,answer,['career']);
 assert.equal(projectRecords(state)[0].date,date);assert.equal(state.records[0].saved,true);
 assert.equal(state.records.length,1);
});

test('재수집을 신규·변경·기존·중복 가능으로 구분하고 사용자 묶음 변경은 신규로 세지 않는다',async()=>{
 const {reviewCodexDraft}=await import('../app/model.js');
 const records=[{id:'a',date:'2026-10-13',summary:'첫 작업',text:'첫 작업 완료',result:'',group:'사용자가 옮긴 묶음',themes:['health']},{id:'b',date:'2026-10-14',text:'직접 작성한 일',result:''}];
 const job={date:'2026-10-14',groups:[{id:'g',title:'자동 묶음',themes:['career'],items:[
  {id:'a',summary:'첫 작업',text:'첫 작업 완료',result:''},
  {id:'b',text:'수정된 내용',result:''},
  {id:'c',text:'직접 작성한 일',result:''},
  {id:'d',text:'새 작업',result:''}
 ]}]};
 const before=structuredClone(records),review=reviewCodexDraft(job,records);
 assert.deepEqual(review.counts,{new:1,updated:1,existing:1,possible:1});assert.deepEqual(records,before);
 job.date='2026-10-15';assert.equal(reviewCodexDraft(job,records).counts.possible,0);
});

test('같은 초안 안의 식별자만 다른 동일 내용도 중복 가능으로 표시한다',async()=>{
 const {reviewCodexDraft}=await import('../app/model.js');const job={date:'2026-10-14',groups:[{id:'g',items:[{id:'a',text:'행동을 마쳤다',result:''},{id:'b',text:'행동을 마쳤다',result:''}]}]};
 assert.deepEqual(reviewCodexDraft(job,[]).counts,{new:1,updated:0,existing:0,possible:1});
});
