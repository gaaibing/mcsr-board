const CACHE = "board-v30";
const ASSETS = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fetchAndCache(req) {
  return fetch(req).then(res => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML 走 network-first：部署新版后首屏即新版，断网才回退缓存
  if (req.mode === "navigate") {
    e.respondWith(
      fetchAndCache(req).catch(() =>
        caches.match(req).then(hit => hit || caches.match("./index.html"))
      )
    );
    return;
  }

  // 其他同源 GET 走 cache-first，后台更新（waitUntil 防止 SW 提前终止）
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        e.waitUntil(fetchAndCache(req).catch(() => {}));
        return hit;
      }
      return fetchAndCache(req).catch(() => caches.match("./index.html"));
    })
  );
});
