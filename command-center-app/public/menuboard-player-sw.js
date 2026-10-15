const SHELL_CACHE = "networkconnectit-menuboard-shell-v1";
const ASSET_CACHE = "networkconnectit-menuboard-assets-v1";
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith("networkconnectit-menuboard-") &&
                  !KNOWN_CACHES.includes(key)
              )
              .map((key) => caches.delete(key))
          )
        )
    ])
  );
});

function isMenuBoardApi(url) {
  return url.pathname.includes("/api/menuboard/");
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    const all = await cache.keys();
    const playerEntry = all.find((entry) =>
      new URL(entry.url).pathname.endsWith("/menuboard/player")
    );

    if (playerEntry) {
      const fallback = await cache.match(playerEntry);
      if (fallback) {
        return fallback;
      }
    }

    throw new Error("No cached MenuBoard player shell is available.");
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (isMenuBoardApi(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});
