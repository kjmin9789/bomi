import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app/app.js',import.meta.url),'utf8');
function fixture(updateResult=true) {
 const records=[{id:'a',group:'원래 제목',text:'원문',summary:'요약',themes:['career']}];
 const input={value:'원래 제목',hidden:true,focus(){},select(){}},label={},select={value:'career',style:{setProperty(){}}},edit={};
 const nodes={'#group-title-input':input,'#group-title-label':label,'#group-theme':select,'#group-title-edit':edit};
 let closed=0;const writes=[];
 const context=vm.createContext({THEMES:[{id:'career',name:'커리어'},{id:'health',name:'건강'},{id:'money',name:'재테크'}],groupItems:()=>records,theme:id=>({name:id,color:id}),esc:String,showDialog(){},closeButton:'',recordRow:()=>'',dialog:{querySelector:s=>nodes[s],close:()=>closed++},update:async change=>{if(!updateResult)return false;change({records});writes.push(structuredClone(records));return true;},render(){},saving:false,filter:''});
 vm.runInContext(source.slice(source.indexOf('let groupEditor=null;'),source.indexOf('function daily()')),context);
 context.groupDetail('a');
 return {context,input,select,edit,records,writes,closed:()=>closed};
}
test('제목 자동 저장은 제목만 바꾸며 실패 시 입력과 모달을 보존한다',async()=>{
 const f=fixture();f.edit.onclick();f.input.value='새 제목';await f.context.closeDialog();
 assert.equal(f.closed(),1);assert.equal(f.records[0].group,'새 제목');assert.equal(f.records[0].text,'원문');assert.equal(f.records[0].summary,'요약');assert.deepEqual(f.records[0].themes,['career']);
 const failed=fixture(false);failed.edit.onclick();failed.input.value='보존할 제목';await failed.context.closeDialog();
 assert.equal(failed.closed(),0);assert.equal(failed.input.value,'보존할 제목');assert.equal(failed.input.hidden,false);assert.equal(failed.records[0].group,'원래 제목');
});
test('테마 선택 직후 닫아도 테마와 제목을 순차 저장한다',async()=>{
 const f=fixture();f.edit.onclick();f.input.value='새 제목';f.select.value='health';f.select.onchange();await f.context.closeDialog();
 assert.equal(f.writes.length,2);assert.equal(f.writes[0][0].group,'원래 제목');assert.equal(f.writes[0][0].themes[0],'health');assert.equal(f.records[0].group,'새 제목');assert.equal(f.records[0].text,'원문');assert.equal(f.closed(),1);
});

test('개별 수정은 입력된 내용만 바꾸고 날짜·테마·묶음과 기존 결과를 이어받는다',async()=>{
 const old={id:'a',date:'2026-10-11',themes:['health'],group:'운동',result:'기존 자료',saved:true};
 let submit,reviewed;
 const context=vm.createContext({document:{addEventListener:(_,handler)=>submit=handler},FormData:class {get(key){return {text:'수정한 내용',summary:'수정 요약',date:'2026-10-01',group:'다른 묶음',result:'변경 시도'}[key]}getAll(){return ['career']}},data:()=>({records:[old]}),selected:'2026-10-12',today:()=> '2026-10-12',validateRecord:r=>r,saveRecord:r=>reviewed=r});
 const start=source.indexOf("document.addEventListener('submit',");
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('change',",start)),context);
 await submit({preventDefault(){},target:{id:'record-form',dataset:{id:'a'}}});
 assert.equal(reviewed.text,'수정한 내용');assert.equal(reviewed.summary,'수정 요약');
 for(const key of ['date','themes','group','result','saved'])assert.deepEqual(reviewed[key],old[key]);
});

test('새 기록은 선택한 날짜와 처음 고른 테마를 사용한다',async()=>{
 let submit,reviewed;
 const context=vm.createContext({document:{addEventListener:(_,handler)=>submit=handler},FormData:class {get(key){return {text:'걷기',summary:'산책했다',group:'운동'}[key]}getAll(){return ['health']}},data:()=>({records:[]}),crypto:{randomUUID:()=> 'new'},selected:'2026-10-10',today:()=> '2026-10-12',validateRecord:r=>r,saveRecord:r=>reviewed=r});
 const start=source.indexOf("document.addEventListener('submit',");
 vm.runInContext(source.slice(start,source.indexOf("document.addEventListener('change',",start)),context);
 await submit({preventDefault(){},target:{id:'record-form',dataset:{id:''}}});
 assert.equal(reviewed.date,'2026-10-10');assert.equal(reviewed.themes[0],'health');assert.equal(reviewed.result,'');
});


test('바로 저장은 성공 후에만 묶음으로 돌아가고 실패 시 편집창을 유지한다',async()=>{
 for(const succeeds of [true,false]) {
  const records=[{id:'a',date:'2026-10-11',text:'원문',themes:['career']}];
  let opened=0,rendered=0;
  const context=vm.createContext({saving:false,data:()=>({records}),update:async change=>{if(!succeeds)return false;change({records});return true;},groupDetail:()=>opened++,render:()=>rendered++,toast(){}});
  vm.runInContext(source.slice(source.indexOf('async function saveRecord('),source.indexOf('function download(')),context);
  await context.saveRecord({...records[0],text:'수정 본문'});
  assert.equal(records[0].text,succeeds?'수정 본문':'원문');assert.equal(opened,succeeds?1:0);assert.equal(rendered,succeeds?1:0);
 }
});
