// Louvor Conectado - Service Worker
// Version: 5.0.0 - FIREBASE FCM PUSH NOTIFICATIONS

const CACHE_NAME = 'louvor-conectado-v5';
const STATIC_CACHE_NAME = 'louvor-static-v5';
const API_CACHE_NAME = 'louvor-api-v5';

// Arquivos estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
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
  console.log('[SW] Activating Service Worker...');
  
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
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Estratégia: Cache First para arquivos estáticos
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache HIT (static):', request.url);
    return cachedResponse;
  }
  
  console.log('[SW] Cache MISS (static):', request.url);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed for static:', error);
    
    // Retorna página offline básica para navegação
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
    console.log('[SW] Network request (API):', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache apenas respostas GET
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    // Se a resposta não foi ok, tenta o cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Using cached API response:', request.url);
      return cachedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retorna resposta de erro offline
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

// Estratégia: Stale While Revalidate para recursos dinâmicos
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições não-GET para cache (exceto para network)
  if (request.method !== 'GET' && !url.pathname.startsWith('/api/')) {
    return;
  }
  
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
  
  // Páginas de navegação - Stale While Revalidate
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // Default: Network First
  event.respondWith(networkFirst(request));
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

// Background sync para formulários offline (futuro)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-availability') {
    // Futuro: sincronizar disponibilidade quando voltar online
  }
});

// Push notifications (futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nova notificação do Louvor Conectado',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
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

console.log('[SW] Service Worker loaded');
