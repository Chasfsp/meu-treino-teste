/* Meu Treino: funciona sem internet e busca atualizações quando há conexão */
const VERSAO = '4.5';
/* oficial e teste ficam no mesmo domínio: cada um usa e limpa só a própria cópia */
const AMB = self.registration.scope.includes('/meu-treino-teste/') ? 'teste' : 'oficial';
const CACHE = `meu-treino-${AMB}-${VERSAO}`;
const ARQUIVOS = ['./', './index.html', './fotos.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ARQUIVOS.map(a => c.add(a)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  const minha = k => k.startsWith(`meu-treino-${AMB}-`) || (AMB === 'oficial' && /^meu-treino-\d/.test(k));
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => minha(k) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    /* o app: rede primeiro, para pegar atualizações; sem internet, a cópia guardada */
    e.respondWith(fetch(req).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdn.jsdelivr.net') {
    /* fontes e biblioteca de login: a cópia guardada primeiro */
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return resp; })));
  }
  /* chamadas ao Supabase (login e dados) nunca passam pelo cache */
});
