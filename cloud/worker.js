import {createRemoteJWKSet, jwtVerify} from 'jose';
import {buildPushPayload} from '@block65/webcrypto-web-push';
import {emptyState, validateState, routineDue} from '../app/model.js';

const MAX_BODY = 1024 * 1024;
const keySets = new Map();
const headers = {
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:4174; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
};
const json = (status, body) => Response.json(body, {status, headers});
const failure = (status, message) => Object.assign(new Error(message), {status});

export async function authenticate(request, env, resolver) {
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER || '') || !env.ACCESS_AUD || !env.ALLOWED_EMAIL) {
    throw failure(503, '로그인 연결을 준비하고 있어요.');
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw failure(401, '로그인이 필요해요. 새로고침해서 로그인해주세요.');
  try {
    if (!resolver) {
      if (!keySets.has(env.ACCESS_ISSUER)) keySets.set(env.ACCESS_ISSUER, createRemoteJWKSet(new URL(`${env.ACCESS_ISSUER}/cdn-cgi/access/certs`)));
      resolver = keySets.get(env.ACCESS_ISSUER);
    }
    const {payload} = await jwtVerify(token, resolver, {issuer:env.ACCESS_ISSUER, audience:env.ACCESS_AUD, algorithms:['RS256'], requiredClaims:['exp','iat','sub','email']});
    if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== env.ALLOWED_EMAIL.toLowerCase()) throw new Error();
    return payload.email.toLowerCase();
  } catch { throw failure(401, '로그인 권한을 확인해주세요.'); }
}

async function readBody(request, limit = MAX_BODY) {
  if (request.headers.get('Content-Type') !== 'application/json') throw failure(415, 'JSON 형식으로 요청해주세요.');
  if (Number(request.headers.get('Content-Length')) > limit) throw failure(413, '저장할 데이터가 너무 커요.');
  const reader = request.body?.getReader();
  if (!reader) throw failure(400, '내용을 확인해주세요.');
  let size = 0; const chunks = [];
  while (true) {
    const {done, value} = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw failure(413, '저장할 데이터가 너무 커요.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw failure(400, '내용을 확인해주세요.'); }
}

export async function readState(db, owner) {
  const row = await db.prepare('SELECT revision, body, mutation FROM states WHERE owner = ?').bind(owner).first();
  return row ? {revision:row.revision, state:validateState(JSON.parse(row.body)), mutation:row.mutation} : {revision:0, state:emptyState(), mutation:null};
}

export async function saveState(db, owner, input) {
  if (!Number.isSafeInteger(input?.revision) || input.revision < 0 || !/^[\da-f-]{36}$/i.test(input?.mutation || '')) throw failure(400, '저장 요청을 확인해주세요.');
  let state;
  try { state = validateState(input.state); } catch { throw failure(400, '기록 내용을 확인해주세요.'); }
  const body = JSON.stringify(state);
  if (new TextEncoder().encode(body).length > MAX_BODY - 1024) throw failure(413, '백업 후 기록 용량을 확인해주세요.');
  const current = await readState(db, owner);
  if ((current.state.routines.length || current.state.checkins.length) && (!Array.isArray(input.state.routines) || !Array.isArray(input.state.checkins))) throw failure(409, '반복 질문을 보존하려면 보미를 새로고침한 뒤 다시 저장해주세요.');
  if (current.mutation === input.mutation && JSON.stringify(current.state) === body) return {revision:current.revision};
  if (current.revision !== input.revision) throw failure(409, '다른 기기에서 기록이 바뀌었어요. 입력은 이 기기에 보존했어요.');
  const now = Date.now();
  const results = await db.batch([
    db.prepare('INSERT OR IGNORE INTO backups(owner, revision, body, created_at) SELECT owner, revision, body, ? FROM states WHERE owner = ? AND revision = ?').bind(now, owner, input.revision),
    db.prepare('INSERT INTO states(owner, revision, mutation, body, updated_at) VALUES (?, 1, ?, ?, ?) ON CONFLICT(owner) DO UPDATE SET revision = states.revision + 1, mutation = excluded.mutation, body = excluded.body, updated_at = excluded.updated_at WHERE states.revision = ?').bind(owner, input.mutation, body, now, input.revision),
    db.prepare('DELETE FROM backups WHERE owner = ? AND revision < (SELECT revision - 10 FROM states WHERE owner = ?)').bind(owner, owner)
  ]);
  if (results[1].meta.changes !== 1) throw failure(409, '다른 기기에서 기록이 바뀌었어요. 입력은 이 기기에 보존했어요.');
  return {revision:input.revision + 1};
}

export function validateSubscription(input) {
  let endpoint;
  try { endpoint = new URL(input.endpoint); } catch { throw failure(400, '알림 등록을 확인해주세요.'); }
  const host = endpoint.hostname;
  const allowed = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host === 'web.push.apple.com' || host.endsWith('.push.apple.com');
  if (!allowed || endpoint.protocol !== 'https:' || endpoint.port || endpoint.username || endpoint.password || endpoint.hash || endpoint.href.length > 2048 || !/^[\w-]{87}$/.test(input.keys?.p256dh || '') || !/^[\w-]{22}$/.test(input.keys?.auth || '')) throw failure(400, '지원하는 브라우저의 알림 등록인지 확인해주세요.');
  return {endpoint:endpoint.href, expirationTime:null, keys:{p256dh:input.keys.p256dh, auth:input.keys.auth}};
}
const subscriptionId = async endpoint => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)))].map(n=>n.toString(16).padStart(2,'0')).join('');

export function reminderDue(state, now) {
  const day = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul'}).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Seoul', hour:'2-digit', minute:'2-digit', hour12:false}).format(now);
  // A single daily check-in; no assumption that an unrecorded day was inactive.
  return state.reminder && time >= state.reminder && !state.rest.includes(day) && !state.records.some(r=>r.date===day) && !(state.snoozed[day] > +now) ? day : null;
}

export function dueNotifications(state,now) {
  const day=reminderDue(state,now);
  return [...(day?[{key:day,body:'혹시 오늘 해낸 일이 있나요? 하나만 남겨볼까요?'}]:[]),...routineDue(state,now).map(r=>({key:r.key,body:r.kind==='bedtime'?`${r.title}: 지난밤 몇 시에 누웠나요?`:`${r.title}, 완료했나요?`}))];
}
export async function sendReminders(env, now = new Date(), send = fetch) {
  if (!env.ALLOWED_EMAIL || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return;
  const owner = env.ALLOWED_EMAIL.toLowerCase();
  const {state} = await readState(env.DB, owner);
  const questions=dueNotifications(state,now); if(!questions.length)return;
  const {results} = await env.DB.prepare('SELECT id, body FROM subscriptions WHERE owner = ?').bind(owner).all();
  for (const row of results) for(const question of questions) {
    const latest = await readState(env.DB, owner);
    const current=dueNotifications(latest.state,now).find(q=>q.key===question.key);
    if(!current)continue;
    const day=current.key;
    const claim = await env.DB.prepare("INSERT OR IGNORE INTO deliveries(owner, subscription_id, day, status) VALUES (?, ?, ?, 'attempted')").bind(owner, row.id, day).run();
    if (!claim.meta.changes) continue;
    try {
      const subscription = validateSubscription(JSON.parse(row.body));
      const payload = await buildPushPayload({data:JSON.stringify({title:'보미',body:current.body,day}),options:{ttl:300}}, subscription, {subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
      const response = await send(subscription.endpoint, {...payload, redirect:'error', signal:AbortSignal.timeout(10000)});
      if (response.status === 404 || response.status === 410) await env.DB.prepare('DELETE FROM subscriptions WHERE owner = ? AND id = ?').bind(owner,row.id).run();
      await env.DB.prepare('UPDATE deliveries SET status = ? WHERE owner = ? AND subscription_id = ? AND day = ?').bind(response.ok ? 'sent' : 'failed',owner,row.id,day).run();
    } catch {
      // shortcut: an ambiguous send is not retried today, avoiding repeated nudges.
      await env.DB.prepare("UPDATE deliveries SET status = 'failed' WHERE owner = ? AND subscription_id = ? AND day = ?").bind(owner,row.id,day).run();
    }
  }
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(now);
  await env.DB.prepare("DELETE FROM deliveries WHERE day < date(?, '-30 days')").bind(day).run();
}

export async function handleRequest(request, env, resolver) {
  const url = new URL(request.url);
  try {
    if (!url.pathname.startsWith('/api/')) {
      if (!['GET','HEAD'].includes(request.method)) return json(405, {error:'지원하지 않는 요청이에요.'});
      const response = await env.ASSETS.fetch(request);
      const secured = new Response(response.body, response);
      for (const [key,value] of Object.entries(headers)) secured.headers.set(key,value);
      return secured;
    }
    const owner = await authenticate(request, env, resolver);
    if (!['GET','HEAD'].includes(request.method) && (request.headers.get('Origin') !== url.origin || request.headers.get('X-Bomi-Request') !== '1')) throw failure(403, '보미 화면에서 요청해주세요.');
    if (url.pathname === '/api/config' && request.method === 'GET') return json(200, {mode:'cloud',owner,pushPublicKey:env.VAPID_PUBLIC_KEY || ''});
    if (url.pathname === '/api/state' && request.method === 'GET') return json(200, await readState(env.DB, owner));
    if (url.pathname === '/api/state' && request.method === 'PUT') return json(200, await saveState(env.DB, owner, await readBody(request)));
    if (url.pathname === '/api/push' && ['POST','DELETE'].includes(request.method)) {
      const subscription = validateSubscription(await readBody(request, 8192));
      const id = await subscriptionId(subscription.endpoint);
      if (request.method === 'DELETE') await env.DB.prepare('DELETE FROM subscriptions WHERE owner = ? AND id = ?').bind(owner,id).run();
      else {
        if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) throw failure(503,'알림 연결을 준비하고 있어요.');
        const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM subscriptions WHERE owner = ? AND id != ?').bind(owner,id).first();
        if (count.n >= 10) throw failure(400,'등록된 기기가 많아요. 사용하지 않는 기기의 알림을 해제해주세요.');
        await env.DB.prepare('INSERT INTO subscriptions(owner,id,body) VALUES (?,?,?) ON CONFLICT(owner,id) DO UPDATE SET body = excluded.body').bind(owner,id,JSON.stringify(subscription)).run();
      }
      return json(200,{ok:true});
    }
    return json(404,{error:'이 기능은 로컬 보미에서 사용할 수 있어요.'});
  } catch (error) { return json(error.status || 500,{error:error.status ? error.message : '연결을 확인하고 다시 시도해주세요.'}); }
}

export default {
  fetch(request, env) { return handleRequest(request, env); },
  async scheduled(event, env) { await sendReminders(env, new Date(event.scheduledTime)); }
};
