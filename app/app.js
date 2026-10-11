import {ALL_THEMES,THEMES,today,shiftDate,weekStart,activeThemes,flowerStage,validateRecord,emptyState,validateState,weekSummary,demoState} from './model.js';
const KEY='bomi.local.v1';
const app=document.querySelector('#app'), dialog=document.querySelector('#dialog');
// shortcut: 브라우저 로컬 저장. 계정 간 동기화를 도입할 때 인증된 서버 저장으로 교체한다.
let state=emptyState(), lastRaw=null, storageBlocked=false;
try { lastRaw=localStorage.getItem(KEY); if(lastRaw) state=validateState(JSON.parse(lastRaw)); }
catch { storageBlocked=true; }
let demo=false, demoData=demoState(), page='today', selected=today(), month=today().slice(0,7), filter='', reviewDate=weekStart(today()), timer, codexTimer;
const data=()=>demo?demoData:state;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const theme=id=>ALL_THEMES.find(t=>t.id===id);
const fmt=date=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(timer); timer=setTimeout(()=>el.classList.remove('show'),4500); }
function update(change) {
  const next=structuredClone(data()); change(next);
  try {
    const checked=validateState(next);
    if(demo) demoData=checked;
    else {
      if(storageBlocked) throw new Error('기존 저장 데이터를 읽지 못했어요. 설정에서 원본을 먼저 백업해주세요.');
      if(localStorage.getItem(KEY)!==lastRaw) throw new Error('다른 창에서 기록이 바뀌었어요. 입력 내용을 복사한 뒤 새로고침해주세요.');
      const raw=JSON.stringify(checked); localStorage.setItem(KEY,raw); state=checked; lastRaw=raw;
    }
    return true;
  } catch(error) { toast(error.message.startsWith('기존')||error.message.startsWith('다른')?error.message:'저장하지 못했어요. 입력을 보존하고 저장 공간·백업 파일을 확인해주세요.'); return false; }
}
function flower(active=Array(THEMES.length).fill(false),className='',label='') {
  const stage=flowerStage(active);
  return `<img class="flower ${className}" src="/assets/flower-stage-${stage}.png" width="1254" height="1254" alt="${esc(label||'')}" ${label?'':'aria-hidden="true"'}>`;
}

const chips=ids=>ids.map(id=>`<span class="chip"><i style="background:${theme(id).color}"></i>${theme(id).name}</span>`).join('');
function calendar() {
  const first=`${month}-01`, offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7;
  const days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
  return `<section class="card calendar"><div class="section-top"><div><h2>${Number(month.slice(0,4))}년 ${Number(month.slice(5))}월</h2></div><div class="arrows"><button data-action="month" data-delta="-1" aria-label="이전 달">‹</button><button data-action="month" data-delta="1" aria-label="다음 달">›</button></div></div><div class="weekdays">${['월','화','수','목','금','토','일'].map(w=>`<span>${w}</span>`).join('')}</div><div class="calendar-grid">${'<span></span>'.repeat(offset)}${Array.from({length:days},(_,i)=>{
    const date=`${month}-${String(i+1).padStart(2,'0')}`, flags=activeThemes(data().records,date), n=flags.filter(Boolean).length;
    const rest=data().rest.includes(date), future=date>today();
    const names=THEMES.filter((_,j)=>flags[j]).map(t=>t.name).join(', ');
    return `<button class="day ${date===selected?'selected':''} ${date===today()?'is-today':''}" data-action="date" data-date="${date}" ${future?'disabled':''} aria-pressed="${date===selected}" aria-label="${esc(fmt(date))}, ${n?names+' 실천':rest?'쉬어감':'기록 없음'}"><span>${i+1}</span>${flower(flags)}${rest?'<small class="rest-dot" title="쉬어감">◡</small>':''}</button>`;
  }).join('')}</div><div class="calendar-foot"><span><i class="tiny-dot"></i>오늘</span><span>회색은 실천 기록이 없는 날이에요.</span></div></section>`;
}
function recordsList(records) {
  if(!records.length) return `<div class="empty"><span>아직 기록이 없어요.</span><p>이미 한 일이 있다면 한 줄만 적어보세요.</p></div>`;
  return records.map(r=>`<article class="record"><div class="record-mark" style="--accent:${theme(r.themes[0]).color}">✓</div><div class="record-body"><div class="chips">${chips(r.themes)}</div><h3>${esc(r.text)}</h3>${r.result?`<p>${esc(r.result)}</p>`:''}<div class="record-actions"><button data-action="edit" data-id="${esc(r.id)}">수정</button><button data-action="save-tip" data-id="${esc(r.id)}" aria-pressed="${r.saved}">${r.saved?'♥ 보관 중':'♡ 다시 볼 기록'}</button><button data-action="delete" data-id="${esc(r.id)}">삭제</button></div></div></article>`).join('');
}
function daily() {
  const flags=activeThemes(data().records,selected), total=flags.filter(Boolean).length;
  const records=data().records.filter(r=>r.date===selected&&(!filter||r.themes.includes(filter)));
  const rest=data().rest.includes(selected), isToday=selected===today();
  const nudgeTheme=(total?THEMES.find((_,i)=>flags[i]):THEMES.find((_,i)=>!flags[i]))||THEMES[0];
  const future=data().futures[nudgeTheme.id];
  return `<div class="page-heading"><div><h1 class="date-heading"><time datetime="${selected}">${selected.replaceAll('-','.')} ${new Intl.DateTimeFormat('ko-KR',{weekday:'long',timeZone:'UTC'}).format(new Date(`${selected}T12:00:00Z`))}</time></h1></div><div class="heading-actions"><button class="text-button" data-action="record">직접 기록하기</button><button class="primary" data-action="codex">${isToday?'오늘':'이날'} 한 일 가져오기</button></div></div><div class="dashboard"><div class="daily-column"><section class="bloom-card"><div class="bloom-head"><span class="pill">${isToday?'오늘의 꽃':'이날의 꽃'}</span><span class="quiet">${rest?'쉬어가는 날':total?`${total}단계 · ${total}개 테마 실천`:'0단계 · 아직 기록 없음'}</span></div><div class="hero-flower">${flower(flags,'',`${total}개 테마 실천`)}</div><h2>${total?'잘했어요! 해낸 일이 쌓이고 있어요.':rest?'오늘은 편하게 쉬어요.':'이미 한 일이 있나요?'}</h2><p>${total?'아래 도장에서 어떤 일을 했는지 확인해요.':rest?'나중에 기록하고 싶을 때 다시 와도 돼요.':'Codex에서 가져오거나 직접 기록해보세요.'}</p><div class="stamps">${THEMES.map((t,i)=>`<button class="stamp ${flags[i]?'done':''} ${filter===t.id?'active':''}" data-action="filter" data-theme="${t.id}" style="--accent:${t.color}" aria-pressed="${filter===t.id}" aria-label="${t.name} ${flags[i]?'완료':'기록 없음'}, 기록 보기"><span class="stamp-shape">${flags[i]?'✓':t.mark}</span><strong>${t.name}</strong><small>${flags[i]?'해냈어요':'아직 기록 없음'}</small></button>`).join('')}</div></section>
    ${isToday?`<section class="nudge"><span class="nudge-symbol">✦</span><div><span class="eyebrow">이것부터 해볼까요?</span><h3>${rest?'오늘은 편하게 쉬어가요.':total?'하나 해냈네요. 잘했어요!':nudgeTheme.prompt}</h3><p>${rest?'다시 시작하고 싶을 때 돌아오세요.':total?'더 하지 않아도 괜찮아요. 해낸 일을 확인해보세요.':future?esc(future):'이것 하나만 해봐요. 끝나면 한 줄로 기록해요.'}</p>${!rest&&!total&&!(data().snoozed[today()]>Date.now())?`<div class="inline-actions"><button data-action="start" data-theme="${nudgeTheme.id}">지금 시작 ↗</button><button data-action="snooze">나중에</button></div>`:''}</div></section>`:''}
    <section class="card records"><div class="section-top"><h2>${filter?theme(filter).name+'의 기록':'이날 해낸 일'} <span class="count">${records.length}</span></h2>${filter?'<button class="text-button" data-action="clear-filter">전체 보기</button>':''}<button class="text-button" data-action="rest">${rest?'쉬어감 취소':'오늘은 쉬어가기'}</button></div>${recordsList(records)}</section></div><aside>${calendar()}</aside></div>`;
}
function futurePage() {
  return `<div class="page-heading"><div><h1>10년 뒤, 어떤 하루일까요?</h1><p>바라는 모습을 한 줄만 적어보세요. 나중에 바꿔도 돼요.</p></div></div><form id="future-form"><div class="future-grid">${THEMES.map((t,i)=>`<section class="card future-card"><div class="future-theme"><span class="future-theme-mark" style="color:${t.color}">${t.mark}</span><h2>${t.name}</h2></div><label for="future-${t.id}">이 테마에서 바라는 나의 모습</label><textarea id="future-${t.id}" name="${t.id}" maxlength="1000" placeholder="예: ${t.future}">${esc(data().futures[t.id]||'')}</textarea></section>`).join('')}</div><div class="save-row"><span class="quiet">지금 떠오르는 것만 적어도 좋아요. 언제든 바꿀 수 있어요.</span><button class="primary">내 미래 저장하기</button></div></form>`;
}
function reviewPage() {
  const summary=weekSummary(data().records,reviewDate), review=data().reviews[reviewDate]||{mood:'',note:''};
  return `<div class="page-heading"><div><h1>이번 주에 한 일을 확인해볼까요?</h1><p>${fmt(reviewDate)} — ${fmt(shiftDate(reviewDate,6))}</p></div><div class="arrows"><button data-action="week" data-delta="-7" aria-label="이전 주">‹</button><button data-action="week" data-delta="7" aria-label="다음 주" ${reviewDate>=weekStart(today())?'disabled':''}>›</button></div></div><section class="card weekly"><div class="weekly-flowers">${Array.from({length:7},(_,i)=>{const date=shiftDate(reviewDate,i);return `<button data-action="date" data-date="${date}" ${date>today()?'disabled':''}><span>${['월','화','수','목','금','토','일'][i]}</span>${flower(activeThemes(data().records,date))}<small>${date.slice(5).replace('-','.')}</small></button>`;}).join('')}</div><h2>${summary.days?`이번 주 ${summary.days}일 실천했어요. 잘했어요!`:'아직 이 주에 남긴 기록이 없어요.'}</h2><p>빠뜨린 일이 있다면 날짜를 눌러 추가해요.</p><div class="week-stats">${summary.themes.map(t=>`<div><i style="background:${t.color}"></i><span>${t.name}</span><strong>${t.days}일</strong></div>`).join('')}</div></section><div class="review-grid"><section class="card"><h2>이번 주에 남긴 것</h2>${summary.entries.length?`<ul class="outcomes">${summary.entries.slice().reverse().map(r=>`<li><span>${r.date.slice(5).replace('-','.')}</span><div><strong>${esc(r.text)}</strong>${r.result?`<p>${esc(r.result)}</p>`:''}</div></li>`).join('')}</ul>`:'<p class="quiet">조사와 준비, 연습도 실제로 한 일이라면 남겨주세요.</p>'}</section><form id="review-form" class="card"><h2>이번 주의 양은 어땠어요?</h2><p class="quiet">다음 주를 재촉하지 않고, 내 페이스를 알아가요.</p><fieldset class="moods"><legend class="sr-only">체감 부담</legend>${['여유 있었어','적당했어','버거웠어'].map(m=>`<label><input type="radio" name="mood" value="${m}" ${review.mood===m?'checked':''}><span>${m}</span></label>`).join('')}</fieldset><label for="review-note">남기고 싶은 이야기</label><textarea id="review-note" name="note" maxlength="2000" placeholder="잘했던 일, 버거웠던 사정, 다음에 이어가고 싶은 것…">${esc(review.note)}</textarea><button class="primary">회고 저장하기</button><p class="footnote">실제 기록을 모은 회고예요. AI 분석은 아직 연결하지 않았어요.</p></form></div>`;
}
function settingsPage() {
  return `<div class="page-heading"><div><h1>기록과 알림을 설정해요.</h1><p>기록과 알림을 직접 관리해요.</p></div></div><div class="settings-grid"><section class="card"><span class="pill">이 기기에서 사용 중</span><h2>나의 기록 보관</h2><button class="text-button" data-action="codex-settings">이 컴퓨터의 Codex 연결 설정</button><p>지금은 이 브라우저에 저장돼요. 브라우저 데이터를 지우기 전에 백업해주세요. 다른 기기와 자동으로 동기화되지는 않아요.</p><div class="inline-actions"><button class="secondary" data-action="export">기록 백업하기 ↓</button><label class="secondary file-label">백업 가져오기<input type="file" id="import-file" accept="application/json,.json"></label></div>${storageBlocked?'<p class="error">기존 저장 데이터를 읽지 못해 덮어쓰기를 막았어요. 먼저 원본을 백업해주세요.</p><button data-action="raw-export">원본 데이터 다운로드</button>':''}</section><section class="card"><h2>하루를 챙기는 알림</h2><p>로컬 버전에서는 보미가 열려 있는 동안에만 알림을 확인해요. 앱을 닫아도 오는 푸시는 아직 연결 전이에요.</p><form id="reminder-form"><label for="reminder-time">알림 받을 시각 · 한국시간</label><input type="time" id="reminder-time" name="time" value="${esc(data().reminder)}"><div class="inline-actions"><button class="primary">시각 저장</button><button type="button" data-action="reminder-off">끄기</button><button type="button" data-action="notification-test">알림 테스트</button></div></form><p class="footnote">쉬어가거나 이미 기록한 날에는 재촉하지 않아요.</p></section></div>`;
}
function render() {
  const views={today:daily,future:futurePage,review:reviewPage,saved:()=>`<div class="page-heading"><div><h1>다음에도 꺼내볼 기록.</h1><p>다시 활용하고 싶은 결과와 배운 점을 모아두세요.</p></div></div><section class="card">${recordsList(data().records.filter(r=>r.saved).slice().reverse())}</section>`,settings:settingsPage};
  app.innerHTML=`<a class="skip" href="#main">본문으로 이동</a><aside class="sidebar"><a class="brand" href="#" data-action="nav" data-page="today"><img src="/assets/bomi-logo.png" alt="보미" width="1981" height="724"></a><nav aria-label="주 메뉴">${[['today','✿','오늘의 보미'],['future','◈','나의 미래'],['review','▦','주간 회고'],['saved','♡','보관함'],['settings','⚙','설정']].map(([id,icon,name])=>`<button data-action="nav" data-page="${id}" class="${page===id?'current':''}" ${page===id?'aria-current="page"':''}><span>${icon}</span>${name}${id==='today'?'<i></i>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="small-flower">${flower([false,true,false])}</div><p>한꺼번에 말고,<br>쉬운 것 하나부터.</p><button class="demo-button" data-action="demo">${demo?'내 기록으로 돌아가기':'예시로 둘러보기 ↗'}</button><small>로컬 미리보기 · 이 브라우저에 저장</small></div></aside><div class="workspace">${demo?'<div class="banner">예시 모드예요. 아래 기록은 실제 활동이 아니며 저장되지 않아요. <button data-action="demo">내 기록으로 돌아가기</button></div>':''}${storageBlocked?'<div class="banner error">저장 데이터를 읽지 못했어요. 설정에서 원본을 백업해주세요.</div>':''}<main id="main">${views[page]()}</main></div>`;
}
function showDialog(html) { clearTimeout(codexTimer); delete dialog.dataset.codex; dialog.setAttribute('aria-label','보미 기록과 확인'); dialog.innerHTML=html; if(!dialog.open) dialog.showModal(); }
const closeButton='<button type="button" class="close" data-action="close" aria-label="닫기">×</button>';
function recordForm(id='',preferred='') {
  const record=id?data().records.find(r=>r.id===id):null;
  if(id&&!record)return;
  const choices=[...THEMES,...ALL_THEMES.filter(t=>record?.themes.includes(t.id)&&!THEMES.some(active=>active.id===t.id))];
  showDialog(`${closeButton}<h2>${record?'기록 다듬기':'한 일을 한 줄로 적어볼까요?'}</h2><p class="quiet">실천한 테마가 늘어나면 꽃이 다음 단계로 바뀌어요.</p><form id="record-form" data-id="${esc(id)}"><label for="record-date">언제 했나요?</label><input id="record-date" type="date" name="date" max="${today()}" value="${record?.date||selected}" required><label for="record-text">실제로 한 일</label><textarea id="record-text" name="text" maxlength="1000" required placeholder="예: 준비하던 글의 제목을 다듬었어">${esc(record?.text||'')}</textarea><label for="record-result">무엇이 남았나요? <span class="quiet">선택</span></label><input id="record-result" name="result" maxlength="1000" placeholder="결과물, 배운 점, 다음에 쓸 준비" value="${esc(record?.result||'')}"><fieldset class="theme-picker"><legend>관련된 테마를 직접 골라주세요</legend>${choices.map(t=>`<label style="--accent:${t.color}"><input type="checkbox" name="themes" value="${t.id}" ${(record?.themes||[preferred]).includes(t.id)?'checked':''}><span><i style="background:${t.color}"></i>${t.name}</span></label>`).join('')}</fieldset><p class="footnote">계획이나 예정이 아닌, 실제로 한 일인지 확인해주세요.</p><div class="form-error" role="alert"></div><button class="primary full">내용 확인하기 →</button></form>`);
}
function reviewRecord(record) {
  showDialog(`${closeButton}<h2>이렇게 남길까요?</h2><p class="quiet">${fmt(record.date)}</p><div class="preview-record"><div class="chips">${chips(record.themes)}</div><h3>${esc(record.text)}</h3>${record.result?`<p>${esc(record.result)}</p>`:''}</div><p>확인하면 도장과 오늘의 꽃 단계에 반영돼요.</p><div class="inline-actions"><button class="secondary" id="back-record">다시 다듬기</button><button class="primary" id="confirm-record">확인하고 기록 남기기</button></div>`);
  document.querySelector('#back-record').onclick=()=>{recordForm(data().records.some(r=>r.id===record.id)?record.id:'');const f=document.querySelector('#record-form');f.elements.date.value=record.date;f.elements.text.value=record.text;f.elements.result.value=record.result;f.querySelectorAll('[name="themes"]').forEach(el=>el.checked=record.themes.includes(el.value));};
  document.querySelector('#confirm-record').onclick=()=>{
    const duplicate=data().records.some(r=>r.id!==record.id&&r.date===record.date&&r.text===record.text&&[...r.themes].sort().join() === [...record.themes].sort().join());
    if(duplicate){toast('같은 날짜에 같은 기록이 있어요. 기존 기록을 확인해주세요.');return;}
    if(!update(s=>{const index=s.records.findIndex(r=>r.id===record.id); if(index<0)s.records.push(record);else s.records[index]=record;}))return;
    selected=record.date;month=selected.slice(0,7);filter='';page='today';render();
    const future=record.themes.map(id=>data().futures[id]).find(Boolean);
    showDialog(`${closeButton}<div class="celebration">${flower(activeThemes(data().records,selected),'pop')}<h2>잘했어요! 해낸 일을 기록했어요.</h2><p class="celebration-text">${esc(record.text)}</p>${record.result?`<p>${esc(record.result)}</p>`:''}<div class="chips">${chips(record.themes)}</div><p class="quiet">${future?`바라던 모습: “${esc(future)}”<br>선택한 테마에 실제 한 일을 남겼어요.`:'직접 해낸 일이에요. 나중에 다시 확인할 수 있어요.'}</p><button class="primary full" data-action="close">내 꽃 보러 가기</button></div>`);
  };
}
function download(value,name) { const blob=new Blob([value],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
// shortcut: 열린 페이지에서만 알림을 검사한다. 닫힌 앱 알림은 서버 푸시 연결이 필요하다.
function reminderCheck() {
  if(demo||storageBlocked||!state.reminder||state.rest.includes(today())||state.records.some(r=>r.date===today())||state.snoozed[today()]>Date.now())return;
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  if(time<state.reminder)return;
  if(!update(s=>s.snoozed[today()]=Date.now()+24*60*60*1000))return;
  if('Notification'in window&&Notification.permission==='granted') {const n=new Notification('보미 · 하나만 해볼까요?',{body:'오늘 해낸 일 하나만 같이 남겨볼까요?',icon:'/assets/flower-stage-3.png'});n.onclick=()=>{window.focus();selected=today();recordForm();n.close();};}
  toast('보미가 왔어요. 오늘 해낸 일 하나만 같이 남겨볼까요?');
}
async function action(event) {
  const button=event.target.closest('[data-action]');if(!button)return;
  event.preventDefault();const kind=button.dataset.action,id=button.dataset.id;
  if(kind==='close'){dialog.close();return;}
  if(kind==='nav'){page=button.dataset.page;render();window.scrollTo({top:0});return;}
  if(kind==='demo'){demo=!demo;page='today';selected=today();month=selected.slice(0,7);filter='';render();return;}
  if(kind==='codex'){await collectCodex();return;}
  if(kind==='codex-settings'){await codexSettings();return;}
  if(kind==='record'){recordForm('',filter);return;}
  if(kind==='edit'){recordForm(id);return;}
  if(kind==='filter'){filter=filter===button.dataset.theme?'':button.dataset.theme;render();return;}
  if(kind==='clear-filter'){filter='';render();return;}
  if(kind==='date'){selected=button.dataset.date;month=selected.slice(0,7);page='today';filter='';render();return;}
  if(kind==='month'){const d=new Date(`${month}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+Number(button.dataset.delta));month=d.toISOString().slice(0,7);render();return;}
  if(kind==='week'){reviewDate=shiftDate(reviewDate,Number(button.dataset.delta));render();return;}
  if(kind==='rest'){if(update(s=>{s.rest=s.rest.includes(selected)?s.rest.filter(d=>d!==selected):[...s.rest,selected];})){render();toast(data().rest.includes(selected)?'쉬어가는 날로 남겼어요. 기존 기록은 그대로예요.':'쉬어감 표시를 취소했어요.');}return;}
  if(kind==='snooze'){if(update(s=>s.snoozed[today()]=Date.now()+60*60*1000)){render();toast('한 시간 동안 쉬어갈게요.');}return;}
  if(kind==='start'){showDialog(`${closeButton}<span class="eyebrow">한 가지면 충분해요</span><h2>${theme(button.dataset.theme).prompt}</h2><p>실제로 마친 뒤 한 줄로 남겨주세요. 시작 버튼만 눌러서는 꽃 단계가 오르지 않아요.</p><button class="primary" id="start-record">했어요, 기록할게요</button>`);document.querySelector('#start-record').onclick=()=>recordForm('',button.dataset.theme);return;}
  if(kind==='save-tip'){if(update(s=>{const r=s.records.find(r=>r.id===id);r.saved=!r.saved;})){render();toast('보관함을 업데이트했어요.');}return;}
  if(kind==='delete'){
    showDialog(`${closeButton}<h2>이 기록을 삭제할까요?</h2><p>해당 테마의 마지막 기록이면 도장과 꽃 단계도 함께 바뀌어요.</p><div class="inline-actions"><button data-action="close" class="secondary">취소</button><button id="confirm-delete" class="danger">기록 삭제</button></div>`);
    document.querySelector('#confirm-delete').onclick=()=>{if(update(s=>s.records=s.records.filter(r=>r.id!==id))){dialog.close();render();toast('기록을 삭제했어요.');}};return;
  }
  if(kind==='export'){download(JSON.stringify(data(),null,2),`bomi-${demo?'example-':''}${today()}.json`);return;}
  if(kind==='raw-export'){download(lastRaw||'null',`bomi-original-${today()}.json`);return;}
  if(kind==='reminder-off'){if(update(s=>s.reminder='')){render();toast('알림을 껐어요.');}return;}
  if(kind==='notification-test'){
    if(!('Notification'in window)){toast('이 브라우저는 시스템 알림을 지원하지 않아요.');return;}
    try {const permission=await Notification.requestPermission();if(permission==='granted')new Notification('보미의 테스트 알림',{body:'오늘 한 일 하나만 기록해볼까요?',icon:'/assets/flower-stage-3.png'});else toast('알림 권한이 허용되지 않았어요.');}catch{toast('이 환경에서는 시스템 알림을 사용할 수 없어요.');}return;
  }
}
document.addEventListener('click',action);
document.addEventListener('submit',event=>{
  const form=event.target;event.preventDefault();const fd=new FormData(form);
  if(form.id==='record-form') {
    try { const old=data().records.find(r=>r.id===form.dataset.id);const record=validateRecord({id:old?.id||crypto.randomUUID(),date:fd.get('date'),text:fd.get('text'),result:fd.get('result'),themes:fd.getAll('themes'),saved:old?.saved||false},today(),!!old);reviewRecord(record); }
    catch(error){form.querySelector('.form-error').textContent=error.message;}return;
  }
  if(form.id==='future-form'){if(update(s=>{for(const t of THEMES)s.futures[t.id]=fd.get(t.id).trim();s.onboarded=true;})){toast('바라는 미래를 저장했어요.');}return;}
  if(form.id==='review-form'){if(update(s=>s.reviews[reviewDate]={mood:fd.get('mood')||'',note:fd.get('note').trim()}))toast('이번 주의 이야기를 저장했어요.');return;}
  if(form.id==='reminder-form'){if(update(s=>{s.reminder=fd.get('time');delete s.snoozed[today()];}))toast(fd.get('time')?'보미가 열려 있을 때 이 시각부터 알림을 확인할게요.':'알림을 껐어요.');return;}
});
document.addEventListener('change',async event=>{
  if(event.target.id!=='import-file')return;
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>10*1024*1024)throw new Error('10MB 이하의 백업 파일을 선택해주세요.');
    const incoming=validateState(JSON.parse(await file.text()));
    showDialog(`${closeButton}<h2>백업 ${incoming.records.length}건을 가져올까요?</h2><p>현재 기록을 자동으로 백업한 다음, 선택한 파일의 내용으로 바꿔요.</p><div class="inline-actions"><button data-action="close" class="secondary">취소</button><button id="confirm-import" class="primary">백업하고 가져오기</button></div>`);
    document.querySelector('#confirm-import').onclick=()=>{
      download(storageBlocked?lastRaw:JSON.stringify(data(),null,2),`bomi-before-import-${today()}.json`);
      if(storageBlocked){toast('읽지 못한 원본은 보존했어요. 복구를 확인하기 전에는 교체하지 않아요.');return;}
      if(update(s=>Object.assign(s,incoming))){dialog.close();render();toast('백업을 가져왔어요.');}
    };
  } catch(error) {toast(error instanceof SyntaxError?'JSON 백업 파일을 확인해주세요.':error.message);}
  event.target.value='';
});
window.addEventListener('storage',event=>{if(event.key===KEY){toast('다른 창의 변경이 있어요. 입력 중인 내용이 없다면 새로고침해주세요.');}});
render();
setInterval(reminderCheck,30000);


async function codexApi(action,value) {
  const response=await fetch(`/api/codex/${action}`,value===undefined?{signal:AbortSignal.timeout(15000)}:{method:'POST',headers:{'Content-Type':'application/json','X-Bomi-Request':'1'},body:JSON.stringify(value),signal:AbortSignal.timeout(50000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Codex 연결을 확인해주세요.');return result;
}
async function codexSettings() {
  let connected=false;try{connected=(await codexApi('status')).connected;}catch{}
  showDialog(`${closeButton}<h2>이 컴퓨터의 Codex 연결</h2><p class="quiet">${connected?'연결된 채팅이 있어요.':'아직 연결된 채팅이 없어요.'} 정리를 맡길 Codex 채팅의 링크에 있는 ID를 입력해주세요. 이 컴퓨터에만 저장돼요.</p><form id="codex-connect"><label for="codex-thread">Codex 채팅 ID</label><input id="codex-thread" name="threadId" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"><p class="footnote">개인 프로젝트만 정리해요. 회사 작업은 포함하지 않아요. 다른 컴퓨터에서는 그 기기의 Codex를 별도로 연결해주세요.</p><p class="form-error" role="alert"></p><button class="primary full">연결 저장</button></form>`);
  document.querySelector('#codex-connect').onsubmit=async event=>{event.preventDefault();const f=event.currentTarget;try{await codexApi('connect',{threadId:f.elements.threadId.value.trim()});dialog.close();toast('이 컴퓨터의 Codex 채팅을 연결했어요.');}catch{f.querySelector('.form-error').textContent='채팅 ID와 로컬 서버 연결을 확인해주세요.';}};
}
async function collectCodex() {
  if(demo){toast('예시 모드를 마친 뒤 개인 작업을 가져올 수 있어요.');return;}
  if(storageBlocked){toast('설정에서 기존 기록을 먼저 복구해주세요.');return;}
  const date=selected;
  showDialog(`${closeButton}<h2>Codex에 연결하고 있어요</h2><p class="quiet" role="status">이 컴퓨터의 개인 프로젝트에서 ${fmt(date)}에 한 일을 가져와요.</p>`);
  dialog.dataset.codex='pending';
  try {
    let result=await codexApi('status');
    if(!dialog.open||dialog.dataset.codex!=='pending')return;
    if(!result.connected){await codexSettings();return;}
    if(!result.job)result=await codexApi('collect',{date});
    if(dialog.open&&dialog.dataset.codex==='pending')showCodexStatus(result);
  } catch {if(dialog.open&&dialog.dataset.codex==='pending')showDialog(`${closeButton}<h2>연결 상태를 확인해주세요</h2><p>Codex 앱과 보미 로컬 서버가 실행 중인지 확인해주세요. 전달 여부가 불명확할 때는 새 요청을 자동으로 보내지 않아요.</p><button class="primary full" data-action="codex">상태 다시 확인</button>`);}
}
function showCodexStatus(result) {
  const job=result.job;
  if(!job){dialog.close();return;}
  if(job.status==='ready'){reviewCodex(job);return;}
  showDialog(`${closeButton}<h2>${['sending','queued'].includes(job.status)?'Codex에 정리를 요청했어요':'Codex 채팅을 확인해주세요'}</h2><p class="quiet" role="status">${esc(job.message||'개인 프로젝트의 실제 완료 내역을 확인하고 테마를 제안해요. 채팅에서 다른 작업이 진행 중이면 순서대로 처리돼요.')}</p><p class="footnote">${esc(fmt(job.date))} · 확인 전에는 기록과 꽃에 반영하지 않아요. 창을 닫아도 요청은 유지돼요.</p><div class="inline-actions"><a class="secondary" href="codex://threads/${esc(job.threadId)}">Codex 채팅 열기</a><button class="text-button" id="end-codex">이 요청 종료하기</button></div><p class="footnote">요청을 종료해도 Codex에서 진행 중인 작업은 중단되지 않아요.</p>`);
  dialog.dataset.codex='pending';
  document.querySelector('#end-codex').onclick=async()=>{try{await codexApi('close',{id:job.id});dialog.close();toast('보미에서 결과 기다리기를 종료했어요.');}catch{toast('연결 상태를 확인해주세요.');}};
  codexTimer=setTimeout(async()=>{if(!dialog.open||dialog.dataset.codex!=='pending')return;try{const state=await codexApi('status');if(dialog.open&&dialog.dataset.codex==='pending')showCodexStatus(state);}catch{if(dialog.open&&dialog.dataset.codex==='pending')showDialog(`${closeButton}<h2>연결이 잠시 끊겼어요</h2><p>요청은 보존돼요. 다시 연결하면 진행 상태를 확인할 수 있어요.</p><button class="primary full" data-action="codex">상태 다시 확인</button>`);}},3000);
}
function reviewCodex(job) {
  showDialog(`${closeButton}<h2>정리한 일을 확인해주세요</h2><form id="codex-review">${job.records.map((r,i)=>`<details class="codex-draft"><summary><span class="draft-number">${i+1}</span><span class="draft-heading"><strong>${esc(r.title)}</strong><span class="draft-themes">${THEMES.filter(t=>r.themes.includes(t.id)).map(t=>t.name).join(' · ')||'연결된 테마 없음'}</span></span><span class="draft-chevron" aria-hidden="true">⌄</span></summary><div class="draft-body"><label class="draft-include"><input type="checkbox" name="include" value="${i}" checked> 이 일 기록하기</label>${data().records.some(old=>old.id===r.id)?'<p class="quiet">이미 가져온 기록이에요. 확인하면 아래 내용으로 갱신돼요.</p>':''}<label for="codex-text-${i}">실제로 한 일</label><textarea id="codex-text-${i}" name="text-${i}" maxlength="1000">${esc(r.text)}</textarea><label for="codex-result-${i}">남은 결과</label><textarea id="codex-result-${i}" name="result-${i}" maxlength="1000">${esc(r.result)}</textarea><fieldset class="theme-picker"><legend>연결할 테마</legend>${THEMES.map(t=>`<label><input type="checkbox" name="themes-${i}" value="${t.id}" ${r.themes.includes(t.id)?'checked':''}><span>${t.name}</span></label>`).join('')}</fieldset><details><summary>정리 근거 보기</summary><p class="footnote">${esc(r.evidence)}</p><a href="codex://threads/${esc(r.threadId)}">원래 Codex 채팅 열기</a></details></div></details>`).join('')}${job.records.length?'':'<p class="empty">확인할 수 있는 완료 내역이 없어요. 활동을 하지 않았다는 뜻은 아니에요.</p>'}<p class="form-error" role="alert"></p><div class="inline-actions">${job.records.length?'<button class="primary">선택한 일 확인하고 기록하기</button>':''}<button type="button" id="discard-codex" class="secondary">이번 초안 닫기</button></div></form>`);
  document.querySelector('#codex-review').onchange=event=>{
    const item=event.target.closest('.codex-draft');
    if(!item)return;
    const themes=[...item.querySelectorAll('.theme-picker input:checked')].map(input=>THEMES.find(t=>t.id===input.value).name);
    item.querySelector('.draft-themes').textContent=item.querySelector('[name="include"]').checked?(themes.join(' · ')||'연결된 테마 없음'):'기록에서 제외';
  };
  document.querySelector('#discard-codex').onclick=async()=>{try{await codexApi('close',{id:job.id});dialog.close();}catch{toast('연결 상태를 확인해주세요.');}};
  document.querySelector('#codex-review').onsubmit=async event=>{
    event.preventDefault();const f=event.currentTarget,fd=new FormData(f);
    try {
      const records=fd.getAll('include').map(value=>{const i=Number(value),draft=job.records[i];return validateRecord({...draft,text:fd.get(`text-${i}`),result:fd.get(`result-${i}`),themes:fd.getAll(`themes-${i}`),saved:data().records.find(r=>r.id===draft.id)?.saved||false});});
      if(!records.length)throw new Error('실제로 한 일을 한 개 이상 선택해주세요.');
      if(!update(s=>{for(const record of records){const index=s.records.findIndex(r=>r.id===record.id);if(index<0)s.records.push(record);else s.records[index]=record;}}))return;
      // Local records are committed first; a failed acknowledgement remains safely repeatable by stable IDs.
      let acknowledged=true;try{await codexApi('close',{id:job.id});}catch{acknowledged=false;}
      selected=job.date;month=selected.slice(0,7);page='today';filter='';render();
      showDialog(`${closeButton}<div class="celebration">${flower(activeThemes(data().records,selected),'pop')}<h2>해낸 일 ${records.length}개를 기록했어요.</h2><p>확인한 테마를 도장과 꽃에 반영했어요.</p>${acknowledged?'':'<p class="footnote">기록은 저장했지만 요청 종료 확인이 지연됐어요. 다시 확인해도 같은 기록은 중복되지 않아요.</p>'}<button class="primary full" data-action="close">내 기록 보기</button></div>`);
    } catch(error){f.querySelector('.form-error').textContent=error.message;}
  };
}
