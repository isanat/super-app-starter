// Louvor Conectado - Service Worker
// Version: 6.0.0 - TRUE PWA INSTALLABLE APP

const CACHE_NAME = 'louvor-conectado-v6';
const STATIC_CACHE_NAME = 'louvor-static-v6';
const API_CACHE_NAME = 'louvor-api-v6';

// Arquivos estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v6...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v6...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE_NAME && 
                     cacheName !== API_CACHE_NAME &&
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated - PWA Ready!');
        return self.clients.claim();
      })
  );
});

// Estratégia: Cache First para arquivos estáticos
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed for static:', error);
    
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Estratégia: Network First para API
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'offline', 
        message: 'Você está offline. Verifique sua conexão.' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora chrome-extension e outros protocolos
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Arquivos estáticos - Cache First
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.ico'];
  const isStaticFile = staticExtensions.some(ext => url.pathname.endsWith(ext)) || 
                       url.pathname === '/' ||
                       url.pathname === '/manifest.json';
  
  if (isStaticFile) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Páginas de navegação - Network First com fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/'))
    );
    return;
  }
});

// Listener para mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nova notificação do Louvor Conectado',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192-maskable.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Louvor Conectado', options)
    );
  }
});

// Click na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[SW] Service Worker loaded - PWA Installable!');
