// Service Worker del Sistema Contable "Los Serranitos".
//
// IMPORTANTE: esto SOLO cachea el "cascarón" de la app (el HTML/JS de la interfaz e íconos),
// para que el ícono instalado abra rápido y, si no hay señal, al menos abra la pantalla de
// login en vez de una pantalla en blanco. NUNCA cachea las llamadas a la API de Apps Script
// (que llevan socios, aportes, créditos, etc.) — esas SIEMPRE van a la red, en vivo, para no
// mostrar nunca datos viejos ni arriesgar guardar sobre una copia desactualizada.

const NOMBRE_CACHE = 'cooperativa-serranitos-v1';
const ARCHIVOS_CASCARON = [
  './cooperativa.html',
  './manifest.json',
  './pwa-icons/icon-192.png',
  './pwa-icons/icon-512.png',
  './pwa-icons/icon-maskable-512.png',
  './pwa-icons/apple-touch-icon.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOMBRE_CACHE).then((cache) => cache.addAll(ARCHIVOS_CASCARON))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== NOMBRE_CACHE)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  // Las llamadas a la API (siempre POST, hacia el Apps Script) NUNCA se interceptan: van
  // directo a la red, tal cual, para no arriesgar servir una respuesta vieja cacheada.
  if (peticion.method !== 'GET') return;

  // Solo nos interesa el cascarón propio de la app (mismo origen); cualquier otra petición
  // GET (ej. fuentes de Google, CDNs externos) se deja pasar sin intervenir.
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // Estrategia "red primero, con respaldo en caché": si hay señal, siempre se trae la versión
  // más nueva del cascarón (para que las actualizaciones del sistema lleguen sin tener que
  // desinstalar/reinstalar la app); si no hay señal, se sirve la última copia guardada.
  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(NOMBRE_CACHE).then((cache) => cache.put(peticion, copia));
        return respuesta;
      })
      .catch(() => caches.match(peticion))
  );
});
