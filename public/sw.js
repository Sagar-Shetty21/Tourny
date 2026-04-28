// Firebase Cloud Messaging integration
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA5jIcoCw27DTnECAJm62zxzYaRkh33vlw",
  authDomain: "tourny-4b116.firebaseapp.com",
  projectId: "tourny-4b116",
  storageBucket: "tourny-4b116.firebasestorage.app",
  messagingSenderId: "881814609335",
  appId: "1:881814609335:web:b5f03d491953926471dc32",
});

const messaging = firebase.messaging();

// Service Worker for Tourny PWA
const CACHE_NAME = 'tourny-v2';
const urlsToCache = [
  '/',
  '/offline.html',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip auth-related URLs - NEVER cache these
  if (url.pathname.includes('sign-in') ||
      url.pathname.includes('sign-up') ||
      url.pathname.includes('/api/auth')) {
    return;
  }

  // Network-first strategy for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline - API not available' }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }

  // Network-first strategy for protected routes (dashboard, tournaments)
  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/tournaments')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Try to serve from cache if offline
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // Cache-first strategy for static assets only
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }

          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
        })
    );
    return;
  }

  // For all other requests, use network-first
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match('/offline.html');
      })
  );
});

// Handle background push messages via Firebase Cloud Messaging
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title;
  if (!title) return;

  const notificationOptions = {
    body: data.body || "",
    icon: data.icon || "/icon-192x192.png",
    badge: data.badge || "/badge-96x96.png",
    data: {
      url: data.url || "/dashboard",
    },
    ...(data.tag ? { tag: data.tag, renotify: true } : {}),
  };

  self.registration.showNotification(title, notificationOptions);
});

// Handle notification click — open or focus the relevant page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
