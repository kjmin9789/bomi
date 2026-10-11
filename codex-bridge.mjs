import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile,rename,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {today,validDate,THEMES} from './app/model.js';

const run=promisify(execFile);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const binary=()=>process.env.BOMI_CODEX_BIN||[
  '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex',
  '/Applications/ChatGPT.app/Contents/Resources/codex'
].find(existsSync)||'codex';
const clean=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
export function validateDraft(raw,job) {
  if(!raw||raw.requestId!==job.id||raw.date!==job.date||!Array.isArray(raw.records)||raw.records.length>100||!clean(raw.note,2000))throw new Error('invalid');
  const seen=new Set();
  const records=raw.records.map(item=>{
    if(!item||!uuid.test(item.threadId)||seen.has(item.threadId)||!clean(item.title,200)||!item.title.trim()||!clean(item.text,1000)||!item.text.trim()||!clean(item.result,1000)||!clean(item.evidence,2000)||!item.evidence.trim()||!Array.isArray(item.themes)||item.themes.length>3||new Set(item.themes).size!==item.themes.length||item.themes.some(id=>!THEMES.some(t=>t.id===id)))throw new Error('invalid');
    seen.add(item.threadId);
    return {id:`codex-${createHash('sha256').update(`${job.date}:${item.threadId}`).digest('hex')}`,date:job.date,threadId:item.threadId,title:item.title,text:item.text.trim(),result:item.result.trim(),themes:item.themes,evidence:item.evidence};
  });
  return {records,note:raw.note};
}
export async function dispatch(threadId,message) {
  await run(binary(),['queue','--thread',threadId,'--message',message],{timeout:30000,maxBuffer:1024*1024});
  // Queue acceptance is not task completion; only a validated result file completes the request.
  await run('/usr/bin/open',[`codex://threads/${threadId}`],{timeout:10000});
}
export function createBridge({directory=resolve('.data/codex'),send=dispatch,threadId=process.env.BOMI_CODEX_THREAD_ID||process.env.CODEX_THREAD_ID}={}) {
  let busy=false;
  const save=async(name,value)=>{await mkdir(directory,{recursive:true,mode:0o700});const temp=join(directory,`${randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(value,null,2),{mode:0o600});await rename(temp,join(directory,name));};
  const read=async name=>{try{return JSON.parse(await readFile(join(directory,name),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
  const config=async()=>{
    let value=await read('connection.json');
    if(!value&&uuid.test(threadId||'')){value={threadId};await save('connection.json',value);}
    return value&&uuid.test(value.threadId)?value:null;
  };
  async function status() {
    const connection=await config(),job=await read('request.json');
    if(!job||job.status==='closed')return {connected:!!connection,job:null};
    const result=join(directory,`${job.id}.result.json`);
    try {
      if((await stat(result)).size>1024*1024)throw new Error('invalid');
      const draft=validateDraft(JSON.parse(await readFile(result,'utf8')),job);
      return {connected:!!connection,job:{...job,status:'ready',...draft}};
    } catch(error) {
      if(error.code!=='ENOENT')return {connected:!!connection,job:{...job,status:'invalid',message:'정리 결과 형식을 확인하지 못했어요. Codex 채팅에서 결과 파일을 확인해주세요.'}};
    }
    const expired=Date.now()-Date.parse(job.createdAt)>15*60*1000;
    return {connected:!!connection,job:{...job,...(expired&&job.status==='queued'?{status:'waiting',message:'아직 결과가 없어요. 연결된 Codex 채팅을 확인해주세요. 요청은 다시 보내지 않았어요.'}:{})}};
  }
  async function collect(date) {
    if(!validDate(date)||date>today())throw new Error('기록할 날짜를 확인해주세요.');
    if(busy)throw new Error('Codex에 요청을 전달하고 있어요.');
    busy=true;
    try {
      const current=await status();
      if(current.job&&!['ready'].includes(current.job.status))return current;
      const connection=await config();
      if(!connection)throw new Error('Codex 채팅 연결이 필요해요. 설정에서 채팅 ID를 등록해주세요.');
      const job={id:randomUUID(),date,createdAt:new Date().toISOString(),status:'sending',threadId:connection.threadId};
      await save('request.json',job);
      const instructions={requestId:job.id,date,timezone:'Asia/Seoul',scope:'이 컴퓨터의 개인 프로젝트 전체. 회사 프로젝트와 범위가 불명확한 작업은 제외.',outputPath:join(directory,`${job.id}.result.json`),schema:{requestId:job.id,date,note:'누락·제외 범위와 불확실성. 없으면 빈 문자열',records:[{threadId:'근거 채팅의 UUID. 채팅당 하루 한 항목',title:'원래 채팅 제목',text:'해당 날짜에 실제로 완료한 행동 요약 (1000자 이하)',result:'확인된 결과물만 (1000자 이하)',themes:['money 또는 career 또는 health. 불명확하면 빈 배열'],evidence:'완료한 턴의 시각·식별자와 근거 요약 (2000자 이하)'}]}};
      await save(`${job.id}.request.json`,instructions);
      const message=`[보미 자동 정리 요청 ${job.id}] 사용자가 보미 버튼으로 이 컴퓨터의 개인 프로젝트 전체에서 ${date}(Asia/Seoul)에 실제로 한 일을 정리해달라고 요청했습니다. ${join(directory,`${job.id}.request.json`)}를 읽고 그 스키마대로 결과 파일을 작성해주세요. 앱의 list_threads/read_thread 도구 등 읽기 전용 기능으로 로컬 개인 채팅을 확인하세요. 최근 목록을 충분히 확장하고 아카이브도 확인하되, 날짜가 다른 일·예정·제안·실패한 작업·회사 작업·범위가 불명확한 작업을 완료로 기록하지 마세요. 채팅 갱신일만 보고 오늘 완료했다고 판단하지 말고 해당 날짜의 턴 근거를 확인하세요. 비밀값·인증정보 파일·도구 출력 원문·회사 자료를 읽거나 노출하지 말고, 요약에 개인 식별정보나 비밀값을 넣지 마세요. 다른 채팅에 메시지를 보내지 마세요. 이 자동 정리 요청과 정리 자체는 실적으로 제외하세요. 채팅당 하루 한 항목으로 합치고 재테크 money·커리어 career·건강 health를 제안하되 애매하면 themes를 비워주세요. 모든 완료 주장은 evidence에 근거를 남기고 미확인/누락 범위는 note에 적어주세요. 파일은 로컬에만 권한 0600으로 임시 파일에 저장 후 rename하세요. 보미 기록·DB·Google Drive·Git을 수정하지 마세요. 결과는 사용자 확인 전 초안이며 꽃을 올리지 않습니다. 출력 경로는 요청 JSON의 outputPath만 사용하세요. 현재 다른 작업이 진행 중이면 이 요청은 대기열 순서대로 처리하세요.`;
      try {await send(connection.threadId,message);job.status='queued';}
      catch {job.status='uncertain';job.message='전달 여부를 확정하지 못했어요. 연결된 Codex 채팅에서 접수를 확인해주세요. 중복 요청은 보내지 않았어요.';}
      await save('request.json',job);
      return status();
    } finally {busy=false;}
  }
  return {status,collect,async close(id){if(busy)throw new Error('요청 전달 중이에요.');const job=await read('request.json');if(job&&job.id!==id)throw new Error('다른 요청이 진행 중이에요.');if(job){await save(`${job.id}.dispatch.json`,job);await save('request.json',{...job,status:'closed'});}return status();},async connect(id){if(busy)throw new Error('요청 전달 후 연결을 변경해주세요.');if(!uuid.test(id||''))throw new Error('Codex 채팅 ID를 확인해주세요.');await save('connection.json',{threadId:id});return status();}};
}
