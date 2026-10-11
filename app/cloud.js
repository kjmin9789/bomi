import {validateState} from './model.js';

export async function api(path, method = 'GET', body) {
  const response = await fetch(path, {
    method, credentials:'same-origin', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(15000),
    ...(body === undefined ? {} : {headers:{'Content-Type':'application/json','X-Bomi-Request':'1'},body:JSON.stringify(body)})
  });
  let value;
  try { value = await response.json(); } catch { throw new Error('다시 로그인한 뒤 연결을 확인해주세요.'); }
  if (!response.ok) throw new Error(value.error || '저장하지 못했어요. 입력은 이 기기에 보존했어요.');
  return value;
}

export class CloudStore {
  constructor(owner, storage = localStorage, request = api) {
    this.prefix = `bomi.cloud.${owner}.`;
    this.storage = storage; this.request = request; this.revision = 0; this.busy = false;
  }
  pending() {
    const items = [];
    for (let i=0;i<this.storage.length;i++) {
      const key = this.storage.key(i);
      if (key.startsWith(`${this.prefix}pending:`)) items.push({key,input:JSON.parse(this.storage.getItem(key))});
    }
    return items;
  }
  async load() {
    const result = await this.request('/api/state');
    const state = validateState(result.state);
    if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw new Error('저장 상태를 확인해주세요.');
    this.revision = result.revision;
    return state;
  }
  async save(state, previous) {
    if (this.busy || this.pending().length) throw new Error('이전에 저장하던 내용을 먼저 확인해주세요.');
    this.busy = true;
    const input = {revision:this.revision,mutation:crypto.randomUUID(),state:validateState(state)};
    const key = `${this.prefix}pending:${input.mutation}`;
    try {
      // Local evidence and the proposed write exist before the remote mutation.
      this.storage.setItem(`${this.prefix}before`,JSON.stringify(validateState(previous)));
      this.storage.setItem(key,JSON.stringify(input));
      await this.commit({key,input});
    } finally { this.busy = false; }
  }
  async commit({key,input}) {
    const result = await this.request('/api/state','PUT',input);
    if (result.revision !== input.revision + 1) throw new Error('저장 결과를 다시 확인해주세요.');
    this.revision = result.revision;
    this.storage.removeItem(key);
  }
  async retry() {
    if (this.busy) throw new Error('저장 중이에요. 잠시 기다려주세요.');
    const items = this.pending();
    if (items.length !== 1) throw new Error('보존된 입력을 백업한 뒤 최신 기록을 불러와주세요.');
    this.busy = true;
    try { await this.commit(items[0]); return validateState(items[0].input.state); }
    finally { this.busy = false; }
  }
}

export async function enablePush(publicKey) {
  if (!publicKey) throw new Error('알림 연결을 준비하고 있어요.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('아이폰에서는 홈 화면에 보미를 추가한 뒤 알림을 켜주세요.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('이 기기의 알림 권한을 허용해주세요.');
  await navigator.serviceWorker.register('/sw.js');
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const key = Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const subscription = existing || await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await api('/api/push','POST',subscription.toJSON());
}

export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api('/api/push','DELETE',subscription.toJSON());
  await subscription.unsubscribe();
}

// Only this computer's loopback companion is contacted; credentials never leave the cloud origin.
export async function codexRequest(action, value, local = false) {
  const response = await fetch(`${local ? '' : 'http://127.0.0.1:4174'}/api/codex/${action}`, {
    method:value === undefined ? 'GET' : 'POST', credentials:'omit', redirect:'error', cache:'no-store',
    targetAddressSpace:'loopback', signal:AbortSignal.timeout(value === undefined ? 15000 : 50000),
    headers:{'X-Bomi-Request':'1', ...(value === undefined ? {} : {'Content-Type':'application/json'})},
    ...(value === undefined ? {} : {body:JSON.stringify(value)})
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '이 컴퓨터의 Codex 연결을 확인해주세요.');
  return result;
}
