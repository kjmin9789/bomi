export const ALL_THEMES = [
  {id:'home', name:'주거', color:'var(--flower-orange)', mark:'⌂', future:'안정적이고 편안한 나의 집', prompt:'살고 싶은 동네의 좋은 점을 하나 적어볼까?'},
  {id:'money', name:'재테크', color:'var(--flower-yellow)', mark:'₩', future:'꾸준히 내일을 준비하는 삶', prompt:'오늘 지출 한 건을 돌아볼까?'},
  {id:'career', name:'커리어', color:'var(--vivid-blue)', mark:'↗', future:'나의 가치를 인정받으며 일하는 삶', prompt:'오늘 업무에서 배운 것 하나만 남겨볼까?'},
  {id:'sns', name:'SNS 사업', color:'var(--primary)', mark:'✦', future:'내 콘텐츠로 만들어가는 일과 생활', prompt:'준비 중인 콘텐츠의 제목 하나를 다듬어볼까?'},
  {id:'health', name:'건강', color:'var(--vivid-green)', mark:'♡', future:'좋아하는 운동을 꾸준히 하는 나', prompt:'가볍게 몸을 움직이고, 무엇을 했는지 남겨볼까?'},
  {id:'family', name:'가족', color:'var(--primary)', mark:'∞', future:'함께 시간을 나누는 따뜻한 가족', prompt:'가족에게 전하고 싶은 안부 한마디를 건네볼까?'}
];
export const THEMES = ['money','career','health'].map(id=>ALL_THEMES.find(t=>t.id===id));
export const today = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
}
export function shiftDate(value, days) {
  const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10);
}
export function weekStart(date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); return shiftDate(date, -(weekday+6)%7);
}
export function activeThemes(records, date) {
  const ids = new Set(records.filter(r=>r.date===date).flatMap(r=>r.themes));
  return THEMES.map(t=>ids.has(t.id));
}
export function themesByDate(records) {
  const dates=new Map();
  for(const record of records) {
    if(!dates.has(record.date))dates.set(record.date,new Set());
    for(const id of record.themes)dates.get(record.date).add(id);
  }
  return new Map([...dates].map(([date,ids])=>[date,THEMES.map(t=>ids.has(t.id))]));
}
export function flowerStage(active) {
  return Math.min(3, active.filter(Boolean).length);
}
export function groupRecords(records) {
  const groups=new Map();
  for(const record of records) {
    const key=record.groupId||`${record.date||''}:${record.group?.trim()||''}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(record);
  }
  return [...groups.values()].map(items=>[items[0].group?.trim()||'',items]);
}
// Same-day records have no completion timestamp; use their saved insertion order.
export function newestRecords(records) {
  return records.map((record,index)=>({record,index})).sort((a,b)=>b.record.date.localeCompare(a.record.date)||b.index-a.index).map(item=>item.record);
}
export function sortedWorkGroups(records) {
  const rank=items=>Math.min(...items.flatMap(r=>r.themes.map(id=>({health:0,money:1,career:2}[id]??3))));
  return groupRecords(newestRecords(records)).sort((a,b)=>b[1].length-a[1].length||rank(a[1])-rank(b[1]));
}
export function reviewCodexDraft(job,records) {
  const groups=job.groups||groupRecords(job.records||[]).map(([title,items])=>({id:`import:${items[0].id}`,title,themes:[...new Set(items.flatMap(r=>r.themes))],items}));
  const counts={new:0,updated:0,existing:0,possible:0},byId=new Map(records.map(r=>[r.id,r])),candidates=[...records];
  const normalize=text=>(text||'').trim().replace(/\s+/g,' ');
  const same=(a,b)=>['summary','text','result'].every(key=>normalize(a[key])===normalize(b[key]));
  return {counts,groups:groups.map(g=>({...g,items:g.items.map(item=>{
    const old=byId.get(item.id);
    const status=old?(same(old,item)?'existing':'updated'):candidates.some(r=>r.date===job.date&&normalize(r.text)===normalize(item.text)&&normalize(r.result)===normalize(item.result))?'possible':'new';
    counts[status]++;candidates.push({...item,date:job.date});return {...item,reviewStatus:status};
  })}))};
}
export function validateRecord(record, maxDate=today(), allowLegacy=false) {
  if (!record || typeof record.id !== 'string' || record.id.length>100 || !record.id) throw new Error('기록 식별자를 확인해주세요.');
  if (!validDate(record.date) || record.date>maxDate) throw new Error('실제로 한 일은 오늘까지의 날짜로 남겨주세요.');
  if (typeof record.text!=='string' || !record.text.trim() || record.text.length>1000) throw new Error('한 일을 1~1,000자로 적어주세요.');
  if (typeof record.result!=='string' || record.result.length>1000) throw new Error('남은 결과는 1,000자까지 적을 수 있어요.');
  if (!Array.isArray(record.themes) || !record.themes.length || record.themes.length>(allowLegacy?ALL_THEMES.length:THEMES.length) || new Set(record.themes).size!==record.themes.length || record.themes.some(id=>!(allowLegacy?ALL_THEMES:THEMES).some(t=>t.id===id))) throw new Error('관련 테마를 한 개 이상 골라주세요.');
  if(record.group!==undefined && (typeof record.group!=='string'||record.group.length>80||/[\u0000-\u001f]/.test(record.group)))throw new Error('작업 묶음 이름은 한 줄로 80자까지 적어주세요.');
  if(record.summary!==undefined && (typeof record.summary!=='string'||record.summary.length>80||/[\u0000-\u001f]/.test(record.summary)))throw new Error('목록의 한 줄은 80자까지 적어주세요.');
  return {...(record.summary?.trim()?{summary:record.summary.trim()}:{}),...(record.group?.trim()?{group:record.group.trim()}:{}),id:record.id,date:record.date,text:record.text.trim(),result:record.result.trim(),themes:[...record.themes], saved:record.saved===true};
}
export function projectRecords(state) {
  const groups=new Map((state.groups||[]).map(g=>[g.id,g]));
  for(const r of state.records) {
    const g=groups.get(r.groupId);
    if(g&&(!g.title||g.title==='해낸 일'))groups.set(g.id,{...g,title:(r.summary||r.text).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,80)});
  }
  const routineItems=new Map();
  for(const r of state.records) {
    if(groups.get(r.groupId)?.title!=='고정 루틴')continue;
    if(!routineItems.has(r.groupId))routineItems.set(r.groupId,[]);
    routineItems.get(r.groupId).push(r);
  }
  for(const [id,items] of routineItems) {
    if(items.every(r=>r.id.startsWith('routine-')))groups.set(id,{...groups.get(id),title:items.map(r=>r.text).join(' · ').replace(/[\u0000-\u001f]/g,' ').slice(0,80)});
  }
  return state.records.map(r=>{
    if(!r.groupId)return r;
    const g=groups.get(r.groupId);
    if(!g)throw new Error('기록의 묶음을 찾지 못했어요.');
    return {...r,date:g.date,group:g.title,themes:g.themes,result:r.result||'',saved:r.saved===true};
  });
}
function validateGroup(g) {
  if(!g||typeof g.id!=='string'||!g.id||g.id.length>240||!validDate(g.date)||g.date>today()||typeof g.title!=='string'||g.title.length>80||/[\u0000-\u001f]/.test(g.title)||!Array.isArray(g.themes)||!g.themes.length||g.themes.length>ALL_THEMES.length||new Set(g.themes).size!==g.themes.length||g.themes.some(id=>!ALL_THEMES.some(t=>t.id===id)))throw new Error('묶음의 제목·날짜·테마를 확인해주세요.');
  return {id:g.id,date:g.date,title:g.title.trim(),themes:[...g.themes]};
}
function compactRecord(r,groupId) {
  return {id:r.id,groupId,text:r.text,...(r.summary?{summary:r.summary}:{}),...(r.result?{result:r.result}:{}),...(r.saved?{saved:true}:{})};
}
function normalizeWork(data) {
  if(data.groups!==undefined&&(!Array.isArray(data.groups)||data.groups.length>20000))throw new Error('묶음 데이터를 확인해주세요.');
  const groups=(data.groups||[]).map(validateGroup),byId=new Map(groups.map(g=>[g.id,g]));
  if(byId.size!==groups.length)throw new Error('중복된 묶음 식별자가 있어요.');
  const legacy=new Map();
  const records=data.records.map(raw=>{
    if(raw.groupId!==undefined){
      const g=byId.get(raw.groupId);if(!g)throw new Error('기록의 묶음을 찾지 못했어요.');
      return compactRecord(validateRecord({...raw,date:g.date,group:g.title,themes:g.themes,result:raw.result??''},today(),true),g.id);
    }
    const r=validateRecord(raw,today(),true),key=JSON.stringify([r.date,r.group||'',[...r.themes].sort()]);
    if(!legacy.has(key)){
      const g=validateGroup({id:`legacy:${r.id}`,date:r.date,title:r.group||'',themes:r.themes});
      if(byId.has(g.id))throw new Error('묶음 식별자가 충돌했어요.');
      groups.push(g);byId.set(g.id,g);legacy.set(key,g);
    }
    return compactRecord(r,legacy.get(key).id);
  });
  const used=new Set(records.map(r=>r.groupId));
  return {groups:groups.filter(g=>used.has(g.id)),records};
}
export function putRecord(state,input,groupId) {
  const r=validateRecord(input,today(),true),old=state.records.find(item=>item.id===r.id);
  const id=groupId||old?.groupId||`record:${r.id}`;
  let group=state.groups.find(g=>g.id===id);
  if(!group){group={id,date:r.date,title:r.group||(r.summary||r.text).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,80),themes:[...r.themes]};state.groups.push(group);}
  const item=compactRecord(r,id),i=state.records.findIndex(item=>item.id===r.id);
  if(i<0)state.records.push(item);else state.records[i]=item;
}
export function patchGroup(state,id,values) {
  const group=state.groups.find(g=>g.id===id);if(!group)throw new Error('묶음이 변경됐어요. 다시 열어주세요.');
  Object.assign(group,validateGroup({...group,...values}));
}
export function mergeGroups(state,ids,title) {
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length<2)throw new Error('합칠 묶음을 두 개 이상 골라주세요.');
  const groups=ids.map(id=>state.groups.find(g=>g.id===id));
  if(groups.some(g=>!g)||groups.some(g=>g.date!==groups[0].date))throw new Error('같은 날짜의 묶음만 합칠 수 있어요. 다시 선택해주세요.');
  const target=validateGroup({...groups[0],title});
  if(!target.title)throw new Error('합친 묶음의 이름을 적어주세요.');
  const chosen=new Set(ids);
  state.groups=state.groups.filter(g=>!chosen.has(g.id)||g.id===target.id).map(g=>g.id===target.id?target:g);
  state.records=state.records.map(r=>chosen.has(r.groupId)?{...r,groupId:target.id}:r);
}
export function splitGroup(state,id,recordIds,title,newId) {
  const group=state.groups.find(g=>g.id===id),items=state.records.filter(r=>r.groupId===id);
  if(!group||!Array.isArray(recordIds)||!recordIds.length||new Set(recordIds).size!==recordIds.length||recordIds.length>=items.length||recordIds.some(id=>!items.some(r=>r.id===id)))throw new Error('분리할 기록을 골라주세요. 원래 묶음에도 하나 이상 남겨주세요.');
  if(state.groups.some(g=>g.id===newId))throw new Error('묶음 식별자가 중복돼요. 다시 시도해주세요.');
  const created=validateGroup({...group,id:newId,title});
  if(!created.title)throw new Error('새 묶음의 이름을 적어주세요.');
  state.groups.push(created);
  const chosen=new Set(recordIds);
  state.records=state.records.map(r=>chosen.has(r.id)?{...r,groupId:newId}:r);
}
export function moveGroupedRecord(state,recordId,targetId,newId) {
  const record=state.records.find(r=>r.id===recordId);
  if(!record)throw new Error('기록이 변경됐어요. 다시 선택해주세요.');
  const source=state.groups.find(g=>g.id===record.groupId);
  if(!targetId) {
    const title=(record.summary||record.text).split(/[\r\n]/)[0].trim().slice(0,80)||'해낸 일';
    splitGroup(state,source.id,[recordId],title,newId);
    return;
  }
  const target=state.groups.find(g=>g.id===targetId);
  if(!target||target.date!==source.date||target.id===source.id)throw new Error('다른 묶음 위에 놓아주세요.');
  record.groupId=target.id;
  if(!state.records.some(r=>r.groupId===source.id))state.groups=state.groups.filter(g=>g.id!==source.id);
}
export function restoreWork(state,before,after) {
  if(JSON.stringify([state.groups,state.records])!==JSON.stringify([after.groups,after.records]))throw new Error('이후 기록이 변경되어 실행 취소할 수 없어요. 현재 기록을 확인해주세요.');
  state.groups=structuredClone(before.groups);state.records=structuredClone(before.records);
}
export const emptyState = () => ({version:2,groups:[],records:[],futures:{},reviews:{},rest:[],reminder:'',snoozed:{},routines:[],checkins:[]});
export function validateState(data) {
  if (!data || ![1,2].includes(data.version) || !Array.isArray(data.records) || data.records.length>20000) throw new Error('지원하는 보미 백업 파일이 아니에요.');
  const next = emptyState(); Object.assign(next,normalizeWork(data));
  if (new Set(next.records.map(r=>r.id)).size!==next.records.length) throw new Error('중복된 기록 식별자가 있어요.');
  for (const theme of ALL_THEMES) {
    const value=data.futures?.[theme.id];
    if (value!==undefined) { if(typeof value!=='string'||value.length>1000) throw new Error('미래 문장을 확인해주세요.'); next.futures[theme.id]=value; }
  }
  if (data.rest!==undefined && (!Array.isArray(data.rest)||data.rest.some(d=>!validDate(d)||d>today()))) throw new Error('쉬어간 날짜를 확인해주세요.');
  next.rest=[...new Set(data.rest||[])];
  for (const [date, review] of Object.entries(data.reviews||{})) {
    if(!validDate(date)||!review||!['여유 있었어','적당했어','버거웠어',''].includes(review.mood)||typeof review.note!=='string'||review.note.length>2000) throw new Error('회고 내용을 확인해주세요.');
    next.reviews[date]={mood:review.mood,note:review.note};
  }
  if (data.reminder && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminder)) throw new Error('알림 시각을 확인해주세요.');
  next.reminder=data.reminder||'';
  for(const [date,value] of Object.entries(data.snoozed||{})) if(validDate(date)&&Number.isFinite(value)) next.snoozed[date]=value;
  if(!Array.isArray(data.routines??[]) || (data.routines??[]).length>100 || !Array.isArray(data.checkins??[]) || (data.checkins??[]).length>20000) throw new Error('반복 질문 데이터를 확인해주세요.');
  next.routines=(data.routines??[]).map(validateRoutine);
  next.checkins=(data.checkins??[]).map(a=>validateCheckin(a));
  if(new Set(next.routines.map(r=>r.id)).size!==next.routines.length || new Set(next.checkins.map(a=>a.key)).size!==next.checkins.length) throw new Error('중복된 반복 질문이나 답변이 있어요.');
  return next;
}
export function weekSummary(records, start) {
  const end=shiftDate(start,6); const entries=records.filter(r=>r.date>=start&&r.date<=end);
  return {entries, days:new Set(entries.map(r=>r.date)).size, themes:THEMES.map(t=>({...t, days:new Set(entries.filter(r=>r.themes.includes(t.id)).map(r=>r.date)).size}))};
}
export function demoState() {
  const state=emptyState();
  THEMES.forEach(t=>state.futures[t.id]=t.future);
  const examples=[['이번 주 지출을 정리했어','지출 내역을 확인했어요.',['money']],['업무 노트를 정리했어','다음에 참고할 메모가 남았어요.',['career']],['산책을 다녀왔어','몸을 움직이는 시간을 보냈어요.',['health']]];
  for(let day=0;day<Math.min(21,Number(today().slice(-2)));day++) {
    for(let j=0;j<(day===0?2:1+(day%3));j++) { const [text,result,themes]=examples[(day+j)%examples.length]; state.records.push({id:`demo-${day}-${j}`,date:shiftDate(today(),-day),text,result,themes,saved:false}); }
  }
  return validateState(state);
}

export const validTime = value => typeof value==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function validateRoutine(r) {
  if(!r || typeof r.id!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(r.id) || typeof r.title!=='string' || !r.title.trim() || r.title.length>100 || !['activity','bedtime'].includes(r.kind) || !validTime(r.time) || !Array.isArray(r.days) || !r.days.length || r.days.length>7 || new Set(r.days).size!==r.days.length || r.days.some(d=>!Number.isInteger(d)||d<0||d>6) || typeof r.enabled!=='boolean' || (r.kind==='bedtime'&&!validTime(r.before))) throw new Error('반복 질문의 이름·요일·시각을 확인해주세요.');
  const themes=r.themes??[];
  if(!Array.isArray(themes)||themes.length>3||new Set(themes).size!==themes.length||themes.some(id=>!THEMES.some(t=>t.id===id)))throw new Error('루틴 테마를 확인해주세요.');
  if(r.memo!==undefined&&(typeof r.memo!=='string'||r.memo.length>500))throw new Error('메모는 500자까지 적을 수 있어요.');
  return {...(r.memo?.trim()?{memo:r.memo.trim()}:{}),themes:[...themes],id:r.id,title:r.title.trim(),kind:r.kind,time:r.time,days:[...r.days],enabled:r.enabled,...(r.kind==='bedtime'?{before:r.before}:{})};
}
// Weekly adherence follows the scheduled occurrence, including answers given the next day.
export function routineWeekSummary(state,date,asOf=today()) {
  const start=weekStart(date);
  const answers=new Map(state.checkins.map(a=>[a.key,a]));
  return state.routines.map(r=>{
    const days=Array.from({length:7},(_,i)=>{
      const date=shiftDate(start,i), scheduled=r.days.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
      const answer=answers.get(routineOccurrence(r,date));
      const done=answer?.answer==='done'||(answer?.answer==='bedtime'&&bedtimeBefore(answer));
      const status=!scheduled?'off':date>asOf?'upcoming':done?'done':answer?'skip':'unanswered';
      return {date,status};
    });
    const target=days.filter(d=>d.status!=='off').length, completed=days.filter(d=>d.status==='done').length;
    return {id:r.id,title:r.title,target,completed,percent:target?Math.round(completed/target*100):0,days};
  });
}
export function routineOccurrence(r,date) { return `${date}:${r.id}`; }
export function routineDue(state, now=new Date()) {
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(now);
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  const weekday=new Date(`${date}T12:00:00Z`).getUTCDay();
  if(state.rest.includes(date))return [];
  const answered=new Set(state.checkins.map(a=>a.key));
  return state.routines.filter(r=>r.enabled&&r.days.includes(weekday)&&r.time<=time&&!answered.has(routineOccurrence(r,date))).map(r=>({...r,date,key:routineOccurrence(r,date)}));
}
// Keep yesterday's unanswered occurrences available through today.
export function pendingRoutines(state, now=new Date()) {
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(now);
  if(state.rest.includes(date))return [];
  const yesterday=shiftDate(date,-1);
  return [...routineDue(state,new Date(`${yesterday}T23:59:59+09:00`)),...routineDue(state,now)];
}
export function routineReminders(state, now=new Date()) {
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(now);
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  return pendingRoutines(state,now).filter(r=>r.date===date||time>='08:00').map(r=>({...r,deliveryKey:r.date===date?r.key:`${r.key}:morning`,previous:r.date<date}));
}
export function validateCheckin(a, now=new Date()) {
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(now);
  if(!a || typeof a.routineId!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(a.routineId) || !validDate(a.date) || a.date>date || a.key!==`${a.date}:${a.routineId}` || typeof a.title!=='string' || !a.title.trim() || a.title.length>100 || !['done','skip','bedtime'].includes(a.answer)) throw new Error('답변 내용을 확인해주세요.');
  const next={key:a.key,routineId:a.routineId,date:a.date,title:a.title,answer:a.answer,...(validTime(a.before)?{before:a.before}:{})};
  if(a.answer==='bedtime') {
    if(typeof a.bedtime!=='string'|| !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(a.bedtime)||!validDate(a.bedtime.slice(0,10))||!validTime(a.bedtime.slice(11))||!validTime(a.before))throw new Error('누운 날짜와 시각을 확인해주세요.');
    if(a.bedtime<`${shiftDate(a.date,-1)}T00:00`||a.bedtime>=`${shiftDate(a.date,1)}T00:00`||+new Date(`${a.bedtime}:00+09:00`)>+now)throw new Error('지난밤 실제로 누운 날짜와 시각을 골라주세요.');
    next.bedtime=a.bedtime;next.before=a.before;
  }
  return next;
}
export function bedtimeBefore(a) { return a.bedtime<`${a.date}T${a.before}`; }

export function routineSchedule(r) {
  const days=r.days.length===7?'매일':r.days.slice().sort((a,b)=>a-b).map(d=>['일','월','화','수','목','금','토'][d]).join('·')+'요일';
  return `${days} ${routineTime(r.time)}`;
}
export function routineTime(time) {
  const [hour,minute]=time.split(':').map(Number);
  return `${hour<12?'오전':'오후'} ${hour%12||12}시${minute?` ${minute}분`:''}`;
}
export function saveRoutineAnswer(state,input,themes) {
  const answer=validateCheckin(input);
  const routine=state.routines.find(r=>r.id===answer.routineId);
  if(!routine)throw new Error('루틴을 찾지 못했어요. 새로고침해주세요.');
  const recordId=`routine-${answer.key}`;
  const existing=projectRecords(state).find(r=>r.id===recordId);
  let record;
  if(answer.answer!=='skip') {
    const text=answer.answer==='bedtime'?`${answer.bedtime.replace('T',' ')}에 누웠어요.`:`${routine.title} 완료`;
    record=validateRecord({id:recordId,date:existing?.date??today(),
      text,
      result:'',themes,group:text.replace(/[\u0000-\u001f]/g,' ').slice(0,80),saved:existing?.saved??false});
  }
  const i=state.checkins.findIndex(a=>a.key===answer.key);
  if(i<0)state.checkins.push(answer);else state.checkins[i]=answer;
  state.records=state.records.filter(r=>r.id!==recordId);
  if(record){putRecord(state,record,`routine:${routine.id}:${record.date}`);patchGroup(state,`routine:${routine.id}:${record.date}`,{themes:record.themes});routine.themes=[...record.themes];}
}
