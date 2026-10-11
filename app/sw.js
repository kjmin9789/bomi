// No offline cache of private records or authenticated pages.
self.addEventListener('push', event => {
  let message;
  try { message = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification('보미', {
    body:'혹시 오늘 해낸 일이 있나요? 하나만 남겨볼까요?',
    icon:'/assets/flower-stage-3.png', tag:`bomi-${message.day || 'today'}`, data:{url:'/'}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async()=>{
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing = windows.find(client=>new URL(client.url).origin===self.location.origin);
    if (existing) { await existing.navigate('/'); return existing.focus(); }
    return self.clients.openWindow('/');
  })());
});
