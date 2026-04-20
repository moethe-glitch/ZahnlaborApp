// sw.js — Mothe App Service Worker v2
// Features: App-Shell-Caching + Push Notifications + Background Sync

const CACHE = 'mothe-app-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// ── Install: cache shell ──────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Network first, Cache fallback ──────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache API calls
  if (url.hostname.includes('supabase.co') ||
      url.pathname.startsWith('/.netlify/') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('twilio.com')) {
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Mothe App', body: 'Neue Benachrichtigung', tag: 'default', url: '/' };
  try { data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      tag:     data.tag,
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url },
      actions: data.actions || [],
    })
  );
});

// ── Notification click → open correct screen ─────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.postMessage({ type: 'NOTIFICATION_CLICK', url });
        } else {
          self.clients.openWindow(url);
        }
      })
  );
});

// ── Background Sync (future) ──────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-messages') {
    // Background message sync prepared for future use
  }
});
