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
 await submit({preventDefault(){},target:{id:'record-form',dataset:{id:'a'},querySelector:()=>null}});
 assert.equal(reviewed.text,'수정한 내용');assert.equal(reviewed.summary,'수정 요약');
 for(const key of ['date','themes','group','result','saved'])assert.deepEqual(reviewed[key],old[key]);
});

test('새 기록은 선택한 날짜와 처음 고른 테마를 사용한다',async()=>{
 let submit,reviewed;
 const context=vm.createContext({document:{addEventListener:(_,handler)=>submit=handler},FormData:class {get(key){return {text:'걷기',summary:'산책했다',group:'운동'}[key]}getAll(){return ['health']}},data:()=>({records:[]}),crypto:{randomUUID:()=> 'new'},selected:'2026-10-10',today:()=> '2026-10-12',validateRecord:r=>r,saveRecord:r=>reviewed=r});
 const start=source.indexOf("document.addEventListener('submit',");
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('change',",start)),context);
 await submit({preventDefault(){},target:{id:'record-form',dataset:{id:''},querySelector:()=>null}});
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
 const values={summary:'요약',text:'원문'},handlers={},save={disabled:true},cancel={};let returned;
 const form={querySelector:s=>s==='#save-record'?save:cancel,addEventListener:(name,fn)=>handlers[name]=fn};
 const context=vm.createContext({data:()=>({records:[record]}),THEMES:[],ALL_THEMES:[],showDialog(){},closeButton:'',esc:String,dialog:{querySelector:()=>form},groupDetail:id=>returned=id,FormData:class {[Symbol.iterator](){return Object.entries(values)[Symbol.iterator]();}}});
 vm.runInContext(source.slice(source.indexOf('function recordForm('),source.indexOf('async function saveRecord(')),context);
 context.recordForm('a');assert.equal(save.disabled,true);
 values.text='수정';handlers.input();assert.equal(save.disabled,false);
 values.text='원문';handlers.input();assert.equal(save.disabled,true);
 cancel.onclick();assert.equal(returned,'a');assert.equal(record.text,'원문');
});


test('반복 질문은 오늘 미답변이 있을 때만 표시한다',()=>{
  const context=vm.createContext({selected:'2026-10-12',today:()=> '2026-10-12',data:()=>({checkins:[{date:'2026-10-12',answer:'done'}]}),routineDue:()=>[],esc:s=>s});
  vm.runInContext(source.slice(source.indexOf('function checkinsPanel()'),source.indexOf('function routineForm(')),context);
  assert.equal(vm.runInContext('checkinsPanel()',context),'');
  context.routineDue=()=>[{id:'pending',title:'확인할 일',kind:'activity'}];
  assert.match(vm.runInContext('checkinsPanel()',context),/답변하기/);
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
 await submit({preventDefault(){},target:{id:'record-form',dataset:{id:'',groupId:'g'},querySelector:()=>null}});
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
