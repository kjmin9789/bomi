import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app/app.js',import.meta.url),'utf8');
function fixture(updateResult=true) {
 const records=[{id:'a',groupId:'g',group:'원래 제목',text:'원문',summary:'요약',themes:['career']}];
 const input={value:'원래 제목',hidden:true,focus(){},select(){}},label={},select={querySelectorAll:()=>[]},edit={},heading={},editor={hidden:true},save={};
 const nodes={'#group-title-input':input,'#group-title-label':label,'#group-theme':select,'#group-title-edit':edit,'#group-title-heading':heading,'#group-title-editor':editor,'#group-title-save':save};
 const groups=[{id:'g',date:'2026-10-11',title:'원래 제목',themes:['career']}];
 let closed=0;const writes=[];
 const context=vm.createContext({patchGroup:(s,id,values)=>{Object.assign(s.groups.find(g=>g.id===id),values);records[0].group=s.groups[0].title;records[0].themes=s.groups[0].themes;},themeIcons:{},THEMES:[{id:'career',name:'커리어'},{id:'health',name:'건강'},{id:'money',name:'재테크'}],groupItems:()=>records,theme:id=>({name:id,color:id}),esc:String,showDialog(){},closeButton:'',recordRow:()=>'',dialog:{querySelector:s=>nodes[s],close:()=>closed++},update:async change=>{if(!updateResult)return false;change({records,groups});writes.push(structuredClone(records));return true;},render(){},saving:false,filter:''});
 vm.runInContext(source.slice(source.indexOf('let groupEditor=null;'),source.indexOf('function daily()')),context);
 context.groupDetail('a');
 return {context,input,select,edit,heading,editor,save,records,writes,closed:()=>closed};
}
test('제목 자동 저장은 제목만 바꾸며 실패 시 입력과 모달을 보존한다',async()=>{
 const f=fixture();f.edit.onclick();f.input.value='새 제목';await f.context.closeDialog();
 assert.equal(f.closed(),1);assert.equal(f.records[0].group,'새 제목');assert.equal(f.records[0].text,'원문');assert.equal(f.records[0].summary,'요약');assert.deepEqual(f.records[0].themes,['career']);
 const failed=fixture(false);failed.edit.onclick();failed.input.value='보존할 제목';await failed.context.closeDialog();
 assert.equal(failed.closed(),0);assert.equal(failed.input.value,'보존할 제목');assert.equal(failed.input.hidden,false);assert.equal(failed.records[0].group,'원래 제목');
});
test('테마 선택 직후 닫아도 테마와 제목을 순차 저장한다',async()=>{
 const f=fixture();f.edit.onclick();f.input.value='새 제목';f.select.onchange({target:{value:'health'}});await f.context.closeDialog();
 assert.equal(f.writes.length,2);assert.equal(f.writes[0][0].group,'원래 제목');assert.equal(f.writes[0][0].themes[0],'health');assert.equal(f.records[0].group,'새 제목');assert.equal(f.records[0].text,'원문');assert.equal(f.closed(),1);
});

test('개별 수정은 입력된 내용만 바꾸고 날짜·테마·묶음과 기존 결과를 이어받는다',async()=>{
 const old={id:'a',date:'2026-10-11',themes:['health'],group:'운동',result:'기존 자료',saved:true};
 let submit,reviewed;
 const context=vm.createContext({document:{addEventListener:(_,handler)=>submit=handler},FormData:class {get(key){return {text:'수정한 내용',summary:'수정 요약',date:'2026-10-01',group:'다른 묶음',result:'변경 시도'}[key]}getAll(){return ['career']}},data:()=>({records:[old]}),selected:'2026-10-12',today:()=> '2026-10-12',validateRecord:r=>r,saveRecord:r=>reviewed=r});
 const start=source.indexOf("document.addEventListener('submit',");
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('change',",start)),context);
 await submit({preventDefault(){},target:{classList:{contains:()=>false},id:'record-form',dataset:{id:'a'},querySelector:()=>null}});
 assert.equal(reviewed.text,'수정한 내용');assert.equal(reviewed.summary,undefined);
 for(const key of ['date','themes','group','result','saved'])assert.deepEqual(reviewed[key],old[key]);
});

test('새 기록은 선택한 날짜와 처음 고른 테마를 사용한다',async()=>{
 let submit,reviewed;
 const context=vm.createContext({document:{addEventListener:(_,handler)=>submit=handler},FormData:class {get(key){return {text:'걷기',summary:'산책했다',group:'운동'}[key]}getAll(){return ['health']}},data:()=>({records:[]}),crypto:{randomUUID:()=> 'new'},selected:'2026-10-10',today:()=> '2026-10-12',validateRecord:r=>r,saveRecord:r=>reviewed=r});
 const start=source.indexOf("document.addEventListener('submit',");
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('change',",start)),context);
 await submit({preventDefault(){},target:{classList:{contains:()=>false},id:'record-form',dataset:{id:''},querySelector:()=>null}});
 assert.equal(reviewed.date,'2026-10-10');assert.equal(reviewed.themes[0],'health');assert.equal(reviewed.result,'');
});


test('바로 저장은 성공 후에만 묶음으로 돌아가고 실패 시 편집창을 유지한다',async()=>{
 for(const succeeds of [true,false]) {
  const records=[{id:'a',date:'2026-10-11',text:'원문',themes:['career']}];
  let opened=0,rendered=0;
  const context=vm.createContext({putRecord:(s,r)=>{s.records[s.records.findIndex(x=>x.id===r.id)]=r;},saving:false,data:()=>({records}),update:async change=>{if(!succeeds)return false;change({records});return true;},groupDetail:()=>opened++,render:()=>rendered++,toast(){}});
  vm.runInContext(source.slice(source.indexOf('async function saveRecord('),source.indexOf('function download(')),context);
  await context.saveRecord({...records[0],text:'수정 본문'});
  assert.equal(records[0].text,succeeds?'수정 본문':'원문');assert.equal(opened,succeeds?1:0);assert.equal(rendered,succeeds?1:0);
 }
});


test('제목 편집 시 제목·개수·연필을 숨기고 저장 버튼으로 원래 표시를 복원한다',async()=>{
 const f=fixture();f.edit.onclick();
 assert.equal(f.heading.hidden,true);assert.equal(f.edit.hidden,true);assert.equal(f.editor.hidden,false);
 f.input.value='바꾼 제목';await f.save.onclick();
 assert.equal(f.records[0].group,'바꾼 제목');assert.equal(f.editor.hidden,true);assert.equal(f.heading.hidden,false);assert.equal(f.edit.hidden,false);
 const failed=fixture(false);failed.edit.onclick();failed.input.value='새 제목';await failed.save.onclick();
 assert.equal(failed.editor.hidden,false);assert.equal(failed.heading.hidden,true);assert.equal(failed.save.disabled,false);
});

test('자동 갱신은 새 서버 기록을 반영하되 편집 중이거나 저장이 경합하면 건너뛴다',async()=>{
 let rendered=0,resolve,blocked=false;
 const cloud={revision:1,busy:false,pending:()=>[]};
 const document={hidden:false,querySelector:()=>blocked,querySelectorAll:()=>[],addEventListener(){}};
 const context=vm.createContext({cloud,demo:false,saving:false,dialog:{open:false,addEventListener(){}},document,window:{addEventListener(){}},setInterval(){},api:()=>new Promise(r=>resolve=r),validateState:s=>s,render:()=>rendered++});
 vm.runInContext(source.slice(source.indexOf('let refreshingCloud=false;')),context);
 const first=context.refreshCloudRecords();resolve({revision:2,state:{records:['remote']}});await first;
 assert.equal(cloud.revision,2);assert.equal(rendered,1);
 blocked=true;await context.refreshCloudRecords();assert.equal(rendered,1);
 blocked=false;const race=context.refreshCloudRecords();cloud.revision=3;resolve({revision:2,state:{records:[]}});await race;
 assert.equal(cloud.revision,3);assert.equal(rendered,1);
});

test('저장 버튼은 변경 시 활성화되고 원래 값으로 복원하면 다시 비활성화된다',()=>{
 const record={id:'a',summary:'요약',text:'원문',themes:['career']};
 const values={text:'요약'},handlers={},save={disabled:true},cancel={},field={focus(){}},row={dataset:{recordId:'a'}};let returned;
 const form={querySelector:s=>s==='#save-record'?save:s==='#record-text'?field:cancel,addEventListener:(name,fn)=>handlers[name]=fn};
 const context=vm.createContext({data:()=>({records:[record]}),THEMES:[],ALL_THEMES:[],showDialog(){},closeButton:'',esc:String,dialog:{querySelector:s=>s==='#record-form'&&!row.innerHTML?null:form,querySelectorAll:()=>[row]},groupDetail:id=>returned=id,FormData:class {[Symbol.iterator](){return Object.entries(values)[Symbol.iterator]();}}});
 vm.runInContext(source.slice(source.indexOf('function recordForm('),source.indexOf('async function saveRecord(')),context);
 context.recordForm('a');assert.equal(save.disabled,true);assert.ok(row.innerHTML.includes('>요약</textarea>'));assert.ok(!row.innerHTML.includes('실제로 한 일'));assert.ok(!row.innerHTML.includes('name="summary"'));
 values.text='수정';handlers.input();assert.equal(save.disabled,false);
 values.text='요약';handlers.input();assert.equal(save.disabled,true);
 cancel.onclick();assert.equal(returned,'a');assert.equal(record.text,'원문');
});


test('반복 질문은 오늘 미답변이 있을 때만 표시한다',()=>{
  const context=vm.createContext({selected:'2026-10-12',today:()=> '2026-10-12',data:()=>({routines:[],checkins:[{date:'2026-10-12',answer:'done'}]}),routineThemes:()=>'',routineDue:()=>[],esc:s=>s});
  vm.runInContext(source.slice(source.indexOf('function checkinAnswerForm('),source.indexOf('function routineForm(')),context);
  assert.equal(vm.runInContext('checkinsPanel()',context),'');
  context.routineDue=()=>[{id:'pending',title:'확인할 일',kind:'activity'}];
  assert.match(vm.runInContext('checkinsPanel()',context),/value="done">예<\/button>/);
  context.selected='2026-10-11';assert.equal(vm.runInContext('checkinsPanel()',context),'');
});
test('정각이 되면 없던 질문 카드도 꽃 앞에 삽입한다',()=>{
  let inserted;
  const context=vm.createContext({demo:false,storageBlocked:false,page:'today',dialog:{open:false},saving:false,localMode:false,document:{querySelector:s=>s==='#checkins'?null:{insertAdjacentHTML:(position,html)=>inserted={position,html}}},checkinsPanel:()=>'<section id="checkins">질문</section>'});
  const start=source.indexOf('function routineCheck()');
  vm.runInContext(source.slice(start,source.indexOf('setInterval(routineCheck',start)),context);
  vm.runInContext('routineCheck()',context);
  assert.equal(inserted.position,'afterbegin');assert.match(inserted.html,/checkins/);
});

test('묶음 안에서 추가하면 묶음 날짜·테마·식별자를 그대로 전달한다',async()=>{
 let submit,reviewed,target;
 const group={id:'g',date:'2026-10-09',title:'운동',themes:['health']};
 const context=vm.createContext({document:{addEventListener:(_,handler)=>submit=handler},FormData:class {get(key){return {text:'걷기',summary:'산책했다',group:'다른 묶음'}[key]}getAll(){return ['career']}},data:()=>({records:[],groups:[group]}),crypto:{randomUUID:()=> 'new'},selected:'2026-10-10',today:()=> '2026-10-12',validateRecord:r=>r,saveRecord:(r,g)=>{reviewed=r;target=g;}});
 const start=source.indexOf("document.addEventListener('submit',");
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('change',",start)),context);
 await submit({preventDefault(){},target:{classList:{contains:()=>false},id:'record-form',dataset:{id:'',groupId:'g'},querySelector:()=>null}});
 assert.equal(target,'g');assert.equal(reviewed.date,group.date);assert.equal(reviewed.group,group.title);assert.deepEqual(reviewed.themes,group.themes);
});

test('Codex 재가져오기는 직접 합치거나 분리한 묶음을 되돌리지 않는다',async()=>{
 const {emptyState,putRecord,mergeGroups,splitGroup,validateState}=await import('../app/model.js');
 const state=emptyState(),base={date:'2026-10-10',text:'원문',result:'',themes:['career']};
 putRecord(state,{...base,id:'a',group:'원본 A'},'import-a');putRecord(state,{...base,id:'b',group:'원본 B'},'import-b');putRecord(state,{...base,id:'c',group:'원본 B'},'import-b');
 mergeGroups(state,['import-a','import-b'],'직접 합침');splitGroup(state,'import-a',['c'],'직접 분리','custom');
 const groups=structuredClone(state.groups),entries=[{groupId:'import-b',record:{...base,id:'c',text:'새 내용',group:'새 AI 제목',themes:['health']}}];
 const context=vm.createContext({entries,putRecord,s:state});
 const start=source.indexOf('for(const {groupId,record} of entries)');
 vm.runInContext(source.slice(start,source.indexOf('}))return;',start)),context);
 assert.deepEqual(state.groups,groups);assert.equal(state.records.find(r=>r.id==='c').groupId,'custom');assert.equal(state.records.find(r=>r.id==='c').text,'새 내용');assert.doesNotThrow(()=>validateState(state));
});

test('드롭 저장 실패는 묶음과 실행 취소 상태를 바꾸지 않고 성공 후에만 갱신한다',async()=>{
 const {emptyState,putRecord,mergeGroups,moveGroupedRecord,restoreWork,projectRecords}=await import('../app/model.js');
 for(const success of [false,true]){
  const state=emptyState(),base={date:'2026-10-10',text:'실제 행동',result:'',themes:['career']};
  putRecord(state,{...base,id:'a',group:'첫 묶음'},'g1');putRecord(state,{...base,id:'b',group:'받는 묶음'},'g2');
  const before=structuredClone(state);let renders=0;
  const context=vm.createContext({state,demo:false,saving:false,arranging:true,workUndo:null,pickedItem:{type:'group',id:'g1'},expandedGroups:new Set(),structuredClone,crypto:{randomUUID:()=> 'new'},data:()=>({...state,records:projectRecords(state)}),mergeGroups,moveGroupedRecord,restoreWork,update:async change=>{if(!success)return false;change(state);return true;},render:()=>renders++,toast(){}});
  vm.runInContext(source.slice(source.indexOf('async function arrangeDrop('),source.indexOf('let groupDrag=')),context);
  await context.arrangeDrop({type:'group',id:'g1'},'g2');
  if(success){assert.equal(state.groups.length,1);assert.equal(state.groups[0].title,'받는 묶음');assert.equal(renders,1);await context.undoArrange();assert.deepEqual(state,before);}
  else{assert.deepEqual(state,before);assert.equal(context.workUndo,null);assert.equal(renders,0);assert.equal(context.pickedItem.id,'g1');}
 }
});

test('Codex 안내 닫기는 자동 확인과 늦은 응답을 막고 선택한 재연결로 재개한다',async()=>{
 let resolve,calls=0;const notice={innerHTML:''},saved={};
 const context=vm.createContext({mobileDevice:false,demo:false,document:{hidden:false,querySelector:()=>notice},dialog:{open:false},localStorage:{getItem:()=> '1',setItem:(k,v)=>saved[k]=v},codexApi:()=>{calls++;return new Promise(r=>resolve=r);},esc:String,fmt:String,closeIcon:'<svg></svg>'});
 vm.runInContext(source.slice(source.indexOf('let codexWatch=false;'),source.indexOf('setInterval(refreshCodexNotice')),context);
 const pending=context.refreshCodexNotice();context.dismissCodexNotice();resolve({job:{date:'2026-10-12',status:'queued'}});await pending;
 assert.equal(notice.innerHTML,'');assert.equal(saved['bomi.codex.watch'],'0');
 await context.refreshCodexNotice();assert.equal(calls,1);
 vm.runInContext('codexWatch=true',context);
 const resumed=context.refreshCodexNotice();resolve({job:{date:'2026-10-12',status:'ready',records:[]}});await resumed;
 assert.match(notice.innerHTML,/Codex 연결 안내 닫기/);assert.match(notice.innerHTML,/정리 결과 확인/);
 context.mobileDevice=true;await context.refreshCodexNotice();assert.equal(calls,2);
});

test('Codex 안내 X 클릭은 닫기 처리로 연결된다',async()=>{
 let dismissed=0;
 const context=vm.createContext({suppressDragClick:false,groupEditor:null,saving:false,dismissCodexNotice:()=>dismissed++});
 const start=source.indexOf('async function action(event)');
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('click'",start)),context);
 await context.action({target:{closest:()=>({dataset:{action:'codex-notice-dismiss'}})},preventDefault(){}});
 assert.equal(dismissed,1);
});

test('주간 회고는 하루 목록의 묶음 제목만 표시한다',async()=>{
 const model=await import('../app/model.js');
 const records=[
  {id:'a',groupId:'g',group:'일정 조율',date:'2026-10-12',text:'상세 메모',result:'확인한 결과',themes:['money']},
  {id:'b',groupId:'g',group:'일정 조율',date:'2026-10-12',text:'추가 메모',result:'',themes:['money']},
  {id:'c',groupId:'r',group:'수영 완료',date:'2026-10-12',text:'수영 완료',result:'',themes:['health']}
 ];
 const context=vm.createContext({...model,data:()=>({records,reviews:{}}),reviewDate:'2026-10-12',fmt:String,esc:String,flower:()=>''});
 vm.runInContext(source.slice(source.indexOf('function reviewPage()'),source.indexOf('function settingsPage()')),context);
 const html=context.reviewPage();
 assert.equal(html.split('<strong>일정 조율</strong>').length-1,1);
 for(const text of ['상세 메모','추가 메모','확인한 결과'])assert.ok(!html.includes(`<p>${text}</p>`));
 assert.ok(html.includes('<strong>수영 완료</strong>'));
 assert.ok(!html.includes('<p>수영 완료</p>'));
});


test('요약 메모 수정은 표시된 한 줄만 바꾸고 숨겨진 원문과 결과를 보존한다',async()=>{
 const old={id:'a',groupId:'g',date:'2026-10-11',text:'보존할 상세 원문',summary:'기존 메모',result:'기존 결과',group:'묶음',themes:['career']};
 let submit,saved;
 const context=vm.createContext({document:{addEventListener:(_,handler)=>submit=handler},FormData:class {get(){return '새 메모'}},data:()=>({records:[old]}),today:()=> '2026-10-13',validateRecord:r=>r,saveRecord:r=>saved=r});
 const start=source.indexOf("document.addEventListener('submit',");
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('change',",start)),context);
 await submit({preventDefault(){},target:{classList:{contains:()=>false},id:'record-form',dataset:{id:'a'},querySelector:()=>null}});
 assert.equal(saved.summary,'새 메모');assert.equal(saved.text,old.text);assert.equal(saved.result,old.result);
});


test('모든 루틴은 같은 예·아니오 양식이며 날짜·시각 입력을 요구하지 않는다',()=>{
 const context=vm.createContext({data:()=>({routines:[{id:'r',themes:['health']}]}),esc:String,routineThemes:()=>'',today:()=> '2026-10-12'});
 vm.runInContext(source.slice(source.indexOf('function checkinAnswerForm('),source.indexOf('function checkinsPanel()')),context);
 for(const kind of ['activity','bedtime']) {
  const html=context.checkinAnswerForm({id:'r',title:'테스트',kind,before:kind==='bedtime'?'01:00':undefined,memo:'등록한 기준'},'2026-10-12');
  assert.match(html,/value="done">예<\/button>/);assert.match(html,/value="skip">아니오<\/button>/);
  assert.match(html,/등록한 기준/);assert.doesNotMatch(html,/datetime-local|type="radio"/);
 }
});

test('빠른 답변은 저장 성공 때만 닫히며 실패·중복 요청은 보존한다',async()=>{
 let writes=0,closed=0,rendered=0,fail=false;
 const buttons=[{disabled:false},{disabled:false}],error={textContent:''};
 const form={id:'',dataset:{date:'2026-10-12',routine:'r',title:'테스트'},classList:{contains:()=>true},querySelectorAll:()=>buttons,querySelector:()=>error};
 const context=vm.createContext({saving:false,data:()=>({}),structuredClone,validateCheckin:a=>a,saveRoutineAnswer:()=>{},update:async()=>{writes++;return !fail},dialog:{contains:()=>false,close:()=>closed++},render:()=>rendered++,toast(){}});
 vm.runInContext(source.slice(source.indexOf('async function routineSubmit('),source.indexOf('const notifiedRoutines')),context);
 const fd={get:()=> 'done',getAll:()=>['health']};
 await context.routineSubmit(form,fd);assert.equal(writes,1);assert.equal(rendered,1);assert.equal(closed,0);
 fail=true;await context.routineSubmit(form,fd);assert.equal(rendered,1);assert.ok(buttons.every(b=>!b.disabled));
 context.saving=true;await context.routineSubmit(form,fd);assert.equal(writes,2);
});
