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
export function flowerStage(active) {
  return Math.min(3, active.filter(Boolean).length);
}
export function groupRecords(records) {
  const groups=new Map();
  for(const record of records) {
    const name=record.group?.trim()||'';
    if(!groups.has(name))groups.set(name,[]);
    groups.get(name).push(record);
  }
  return [...groups];
}
// Same-day records have no completion timestamp; use their saved insertion order.
export function newestRecords(records) {
  return records.map((record,index)=>({record,index})).sort((a,b)=>b.record.date.localeCompare(a.record.date)||b.index-a.index).map(item=>item.record);
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
export const emptyState = () => ({version:1,records:[],futures:{},reviews:{},rest:[],reminder:'',snoozed:{},onboarded:false});
export function validateState(data) {
  if (!data || data.version!==1 || !Array.isArray(data.records) || data.records.length>20000) throw new Error('지원하는 보미 백업 파일이 아니에요.');
  const next = emptyState(); next.records=data.records.map(r=>validateRecord(r,today(),true));
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
  next.reminder=data.reminder||''; next.onboarded=data.onboarded===true;
  for(const [date,value] of Object.entries(data.snoozed||{})) if(validDate(date)&&Number.isFinite(value)) next.snoozed[date]=value;
  return next;
}
export function weekSummary(records, start) {
  const end=shiftDate(start,6); const entries=records.filter(r=>r.date>=start&&r.date<=end);
  return {entries, days:new Set(entries.map(r=>r.date)).size, themes:THEMES.map(t=>({...t, days:new Set(entries.filter(r=>r.themes.includes(t.id)).map(r=>r.date)).size}))};
}
export function demoState() {
  const state=emptyState(); state.onboarded=true;
  THEMES.forEach(t=>state.futures[t.id]=t.future);
  const examples=[['이번 주 지출을 정리했어','지출 내역을 확인했어요.',['money']],['업무 노트를 정리했어','다음에 참고할 메모가 남았어요.',['career']],['산책을 다녀왔어','몸을 움직이는 시간을 보냈어요.',['health']]];
  for(let day=0;day<Math.min(21,Number(today().slice(-2)));day++) {
    for(let j=0;j<(day===0?2:1+(day%3));j++) { const [text,result,themes]=examples[(day+j)%examples.length]; state.records.push({id:`demo-${day}-${j}`,date:shiftDate(today(),-day),text,result,themes,saved:false}); }
  }
  return state;
}
