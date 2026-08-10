/* =====================================================
 * 粤讲粤掂 · Service Worker v2
 * 策略：
 *   - 页面等核心资源：网络优先（永远拿最新版），断网回退缓存
 *   - 音频：缓存优先（内容不变，离线可用）
 * ===================================================== */
const CACHE = "yueyu-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // 只处理本站请求
  if (url.origin !== location.origin) return;

  // 音频：缓存优先（离线可用）
  if (url.pathname.includes("/audio/")) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        });
      })
    );
    return;
  }

  // 页面等核心资源：网络优先（保证最新），断网回退缓存
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => cached || caches.match("./index.html"))
    )
  );
});
