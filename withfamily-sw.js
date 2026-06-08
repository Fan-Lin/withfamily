// WithFamily Service Worker v3
// 新增: push 事件处理 → 系统级通知（锁屏/后台也能收到）

const CACHE = 'withfamily-v3';
const ASSETS = ['./'];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: offline fallback ───────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./')));
  }
});

// ── Push: 收到服务端推送 → 弹系统通知 ─────────────────────────────────────────
self.addEventListener('push', e => {
  let data = {
    title: '👋 家人催你啦！',
    body: '快打个卡报平安吧',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'wf-nudge',
  };
  if (e.data) {
    try { data = { ...data, ...e.data.json() }; } catch (_) {}
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:             data.body,
      icon:             data.icon,
      badge:            data.badge,
      tag:              data.tag,
      renotify:         true,
      vibrate:          [200, 80, 200, 80, 300],
      requireInteraction: false,
      data: { url: self.location.origin + self.registration.scope },
    })
  );
});

// ── Notification click: 点通知打开 App ────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url ?? self.registration.scope;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
