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
