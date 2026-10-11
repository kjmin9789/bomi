import {runCollection} from './codex-runner.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,rename,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {today,validDate,THEMES} from './app/model.js';

const run=promisify(execFile);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const clean=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
export function validateDraft(raw,job) {
  if(!raw||raw.requestId!==job.id||raw.date!==job.date||!Array.isArray(raw.records)||raw.records.length>200||!clean(raw.note,2000))throw new Error('invalid');
  const seen=new Set();
  const records=raw.records.map(item=>{
    if(!item||(item.group!==undefined&&(!clean(item.group,80)||/[\r\n\t]/.test(item.group)))||!uuid.test(item.threadId)||((job.schemaVersion===2||item.taskKey!==undefined)&&(typeof item.taskKey!=='string'||!/^[a-zA-Z0-9._:-]{1,160}$/.test(item.taskKey)))||seen.has(`${item.threadId}:${item.taskKey||''}`)||!clean(item.title,200)||!item.title.trim()||!clean(item.text,1000)||!item.text.trim()||!clean(item.result,1000)||!clean(item.evidence,2000)||!item.evidence.trim()||!Array.isArray(item.themes)||item.themes.length>3||new Set(item.themes).size!==item.themes.length||item.themes.some(id=>!THEMES.some(t=>t.id===id)))throw new Error('invalid');
    seen.add(`${item.threadId}:${item.taskKey||''}`);
    return {id:`codex-${createHash('sha256').update(`${job.date}:${item.threadId}${item.taskKey?`:${item.taskKey}`:''}`).digest('hex')}`,date:job.date,...(item.group?.trim()?{group:item.group.trim()}:{}),threadId:item.threadId,title:item.title,text:item.text.trim(),result:item.result.trim(),themes:item.themes,evidence:item.evidence};
  });
  return {records,note:raw.note};
}
export function collectionLink(message) {
  const url=new URL('codex://threads/new');
  url.searchParams.set('originUrl','https://github.com/kjmin9789/bomi.git');
  url.searchParams.set('prompt',message);
  return url.href;
}
export async function dispatch(url,outputPath) {
  const execution=await runCollection(new URL(url).searchParams.get('prompt'),outputPath);
  run('/usr/bin/open',[`codex://threads/${execution.threadId}`],{timeout:10000}).catch(()=>{});
  return execution;
}
export function createBridge({directory=resolve('.data/codex'),send=dispatch}={}) {
  let busy=false;
  const save=async(name,value)=>{await mkdir(directory,{recursive:true,mode:0o700});const temp=join(directory,`${randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(value,null,2),{mode:0o600});await rename(temp,join(directory,name));};
  const read=async name=>{try{return JSON.parse(await readFile(join(directory,name),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
  async function status() {
    const job=await read('request.json');
    if(!job||job.status==='closed')return {connected:true,job:null};
    const result=join(directory,`${job.id}.result.json`);
    try {
      if((await stat(result)).size>1024*1024)throw new Error('invalid');
      const draft=validateDraft(JSON.parse(await readFile(result,'utf8')),job);
      return {connected:true,job:{...job,status:'ready',...draft}};
    } catch(error) {
      if(error.code!=='ENOENT')return {connected:true,job:{...job,status:'invalid',message:'정리 결과 형식을 확인하지 못했어요. Codex 채팅에서 결과 파일을 확인해주세요.'}};
    }
    const expired=Date.now()-Date.parse(job.createdAt)>15*60*1000;
    return {connected:true,job:{...job,...(expired&&job.status==='queued'?{status:'waiting',message:'아직 결과가 없어요. 연결된 Codex 채팅을 확인해주세요. 요청은 다시 보내지 않았어요.'}:{})}};
  }
  async function collect(date) {
    if(!validDate(date)||date>today())throw new Error('기록할 날짜를 확인해주세요.');
    if(busy)throw new Error('Codex에 요청을 전달하고 있어요.');
    busy=true;
    try {
      const current=await status();
      if(current.job&&!['ready'].includes(current.job.status))return current;
      const job={id:randomUUID(),date,schemaVersion:2,createdAt:new Date().toISOString(),status:'opening'};
      await save('request.json',job);
      const instructions={requestId:job.id,date,timezone:'Asia/Seoul',scope:'이 컴퓨터의 개인 프로젝트 전체. 회사 프로젝트와 범위가 불명확한 작업은 제외.',outputPath:join(directory,`${job.id}.result.json`),schema:{requestId:job.id,date,note:'누락·제외 범위와 불확실성. 없으면 빈 문자열',records:[{threadId:'이 작업의 근거가 있는 원본 채팅 UUID',taskKey:'첫 완료 근거 턴 ID와 작업 식별자 조합. 영문·숫자·._:- 160자 이하. 재수집에도 같은 작업은 같은 키',title:'원래 채팅 제목',group:'내용과 목적이 같은 작업의 공통 묶음 이름 (한 줄, 80자 이하). 채팅이나 프로젝트가 달라도 관련되면 동일한 이름 사용',text:'해당 날짜에 실제로 완료한 행동 요약 (1000자 이하)',result:'확인된 결과물만 (1000자 이하)',themes:['money 또는 career 또는 health. 불명확하면 빈 배열'],evidence:'완료한 턴의 시각·식별자와 근거 요약 (2000자 이하)'}]}};
      await save(`${job.id}.request.json`,instructions);
      const message=`[보미 자동 정리 요청 ${job.id}] 사용자가 보미 버튼으로 이 컴퓨터의 개인 프로젝트 전체에서 ${date}(Asia/Seoul)에 실제로 한 일을 정리해달라고 요청했습니다. ${join(directory,`${job.id}.request.json`)}를 읽고 그 스키마대로 결과 파일을 작성해주세요. 앱의 list_threads/read_thread 도구 등 읽기 전용 기능으로 로컬 개인 채팅을 확인하세요. 최근 목록을 충분히 확장하고 아카이브도 확인하되, 날짜가 다른 일·예정·제안·실패한 작업·회사 작업·범위가 불명확한 작업을 완료로 기록하지 마세요. 선택한 날짜는 ${date}이며 오늘 날짜로 바꾸지 마세요. 채팅 생성일·갱신일로 작업 날짜를 판단하지 말고 read_thread의 이전 페이지 커서를 따라 선택 날짜의 턴까지 조회하세요. 턴 시각을 Asia/Seoul로 환산해 ${date} 00:00 이상 다음 날 00:00 미만의 실제 행동과 완료 근거만 정리하세요. 비밀값·인증정보 파일·도구 출력 원문·회사 자료를 읽거나 노출하지 말고, 요약에 개인 식별정보나 비밀값을 넣지 마세요. 다른 채팅에 메시지를 보내지 마세요. 이 자동 정리 요청과 정리 자체는 실적으로 제외하세요. 한 채팅에 여러 작업이 있으면 주제와 완료 행동별로 여러 항목으로 나누세요. 각 항목의 원본 threadId와 안정적인 taskKey를 유지하세요. 같은 작업을 여러 채팅에서 논의했다면 중복 집계하지 말고 주된 원본 채팅을 정해 근거에 다른 채팅도 표시하세요. 채팅 제목이 아닌 실제 작업 내용과 목적을 보고 group을 붙여 관련 작업을 묶으세요. 프로젝트가 달라도 같은 목적이면 같은 group 문자열을 쓰고, 독립적인 프로젝트는 고유한 이름을 쓰세요. 단순히 재테크·커리어·건강으로 묶지 마세요. text는 묶음 아래에서 바로 읽을 수 있게 구체적인 대상과 완료 행동을 간결하게 적으세요. 여러 목적이 섞인 채팅은 목적별 항목으로 나누고 각기 맞는 묶음에 배치하세요. 재테크 money·커리어 career·건강 health를 제안하되 애매하면 themes를 비워주세요. 모든 완료 주장은 evidence에 근거를 남기고 미확인/누락 범위는 note에 적어주세요. 파일은 로컬에만 권한 0600으로 임시 파일에 저장 후 rename하세요. 보미 기록·DB·Google Drive·Git을 수정하지 마세요. 결과는 사용자 확인 전 초안이며 꽃을 올리지 않습니다. 출력 경로는 요청 JSON의 outputPath만 사용하세요. 이 새 세션은 정리 전용이며, 이 세션만 요약하지 말고 이 컴퓨터의 프로젝트 밖 채팅과 아카이브까지 확인하세요. list_projects로 bomi 프로젝트가 있는지 확인하고 있으면 이 정리 세션을 bomi 프로젝트에 두고, 없으면 현재 프로젝트를 사용하세요. 접근하지 못한 채팅이나 조사 범위는 note에 명시하고 전체를 다 읽었다고 추정하지 마세요.`;
      job.launchUrl=collectionLink(message);
      await save('request.json',job);
      let execution;
      try {
        execution=await send(job.launchUrl,join(directory,`${job.id}.output.json`));
        job.status=execution?'queued':'awaiting-send';
        if(execution) {
          job.threadId=execution.threadId;
        }
      }
      catch {job.status='uncertain';job.message='새 채팅을 열었는지 확인하지 못했어요. Codex에서 확인해주세요. 자동으로 다시 열지 않아요.';}
      await save('request.json',job);
      if(execution) {
          execution.done.then(async raw=>{validateDraft(raw,job);await save(`${job.id}.result.json`,raw);}).catch(async()=>{
            const current=await read('request.json');
            if(current?.id===job.id&&current.status!=='closed')await save('request.json',{...current,status:'failed',message:'정리를 완료하지 못했어요. Codex 채팅에서 로그인·사용량·결과 형식을 확인해주세요. 기존 초안은 보존돼요.'});
          }).catch(()=>{});
      }
      return status();
    } finally {busy=false;}
  }
  return {status,collect,async close(id){if(busy)throw new Error('요청 전달 중이에요.');const job=await read('request.json');if(job&&job.id!==id)throw new Error('다른 요청이 진행 중이에요.');if(job){await save(`${job.id}.dispatch.json`,job);await save('request.json',{...job,status:'closed'});}return status();}};
}
