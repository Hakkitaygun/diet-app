// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Hatırlatıcı',
    icon: '/icon.png',
    badge: '/badge.png',
    tag: data.tag || 'reminder',
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Diyet Rehberi', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
