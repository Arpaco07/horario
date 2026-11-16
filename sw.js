// Service worker de Los Pares 84x88 - Horario del Personal
//
// Estrategia: PRIMERO INTERNET, y la copia guardada solo si no hay senal.
// Asi nunca se queda pegada una version vieja: cuando hay red, siempre
// se sirve lo ultimo que esta publicado.
//
// Nunca se guardan las respuestas de Supabase ni de otros dominios:
// los datos siempre salen en vivo. Esto solo guarda la pantalla.
//
// Para forzar que todos bajen de nuevo el sistema: subir el numero de CACHE.

const CACHE = 'pares-horario-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Solo lecturas. Nada de POST/PATCH/DELETE.
  if (req.method !== 'GET') return;

  // Solo lo que vive en este mismo dominio. Supabase y las fuentes
  // de Google se piden siempre en vivo.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('./index.html'))
      )
  );
});
