"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DeliMenuTemplate } from "@/components/menuboard/deli-menu-template";
import type {
  MenuBoardPlayerContent,
  MenuBoardPublishPayload
} from "@/lib/menuboard/player-types";

const TOKEN_KEY = "networkconnectit.menuboard.playerToken";
const CACHE_KEY = "networkconnectit.menuboard.lastKnownGood";
const POLL_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

function appBasePath() {
  return (process.env.NEXT_PUBLIC_APP_BASE_PATH ?? "").replace(/\/$/, "");
}

function apiPath(path: string) {
  return `${appBasePath()}${path}`;
}

function readCachedContent(): MenuBoardPlayerContent | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MenuBoardPlayerContent) : null;
  } catch {
    return null;
  }
}

function writeCachedContent(content: MenuBoardPlayerContent) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(content));
  } catch {
    // Keep the live in-memory payload even if local storage is unavailable.
  }
}

function clearPlayerIdentity() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures; caller also clears in-memory token state.
  }
}

function publishedPayloadAsTemplateMenu(payload: MenuBoardPublishPayload) {
  return {
    name: payload.menuName,
    displayName: payload.storeDisplayName,
    logoUrl: payload.logoUrl,
    promotionTitle: payload.promotionTitle,
    promotionText: payload.promotionText,
    currency: payload.currency,
    sections: payload.sections.map((section) => ({
      id: section.id,
      name: section.name,
      items: section.items.map((item) => ({
        ...item,
        isAvailable: true
      }))
    }))
  };
}

export function MenuBoardWebPlayer() {
  const [token, setToken] = useState("");
  const [content, setContent] = useState<MenuBoardPlayerContent | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [status, setStatus] = useState<
    "booting" | "pairing" | "online" | "offline" | "waiting" | "invalid"
  >("booting");
  const [message, setMessage] = useState("Starting MenuBoard player…");
  const [pairingPending, setPairingPending] = useState(false);
  const latestVersionRef = useRef<number | null>(null);

  useEffect(() => {
    const cached = readCachedContent();
    if (cached?.activePublish) {
      setContent(cached);
      latestVersionRef.current = cached.activePublish.version;
      setStatus("offline");
      setMessage("Showing cached menu while reconnecting.");
    }

    try {
      const savedToken = window.localStorage.getItem(TOKEN_KEY) ?? "";
      if (savedToken) {
        setToken(savedToken);
      } else if (!cached?.activePublish) {
        setStatus("pairing");
        setMessage("Pair this screen to continue.");
      }
    } catch {
      if (!cached?.activePublish) {
        setStatus("pairing");
        setMessage("Pair this screen to continue.");
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(apiPath("/menuboard-player-sw.js"), {
          scope: apiPath("/menuboard/")
        })
        .catch(() => undefined);
    }
  }, []);

  const refreshContent = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(apiPath("/api/menuboard/player/content"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

      if (response.status === 401) {
        clearPlayerIdentity();
        setToken("");
        setStatus("invalid");
        setMessage("Player credential is invalid or revoked. Pair this screen again.");
        return;
      }

      if (!response.ok) {
        throw new Error("Player content request failed.");
      }

      const next = (await response.json()) as MenuBoardPlayerContent;
      setContent(next);

      if (next.activePublish) {
        latestVersionRef.current = next.activePublish.version;
        writeCachedContent(next);
        setStatus("online");
        setMessage(`Live · version ${next.activePublish.version}`);
      } else {
        setStatus("waiting");
        setMessage("Screen is paired. Publish and assign a menu to display it.");
      }
    } catch {
      const cached = readCachedContent();
      if (cached?.activePublish) {
        setContent(cached);
        latestVersionRef.current = cached.activePublish.version;
        setStatus("offline");
        setMessage("Offline · showing last known-good menu.");
      } else {
        setStatus("offline");
        setMessage("Offline and no published menu is cached yet.");
      }
    }
  }, [token]);

  const sendHeartbeat = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      await fetch(apiPath("/api/menuboard/player/heartbeat"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerVersion: "web-player-v1",
          publishVersion: latestVersionRef.current
        }),
        cache: "no-store"
      });
    } catch {
      // Heartbeats are best-effort; cached playback must continue.
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshContent();
    const poll = window.setInterval(() => {
      void refreshContent();
    }, POLL_INTERVAL_MS);
    const heartbeat = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(poll);
      window.clearInterval(heartbeat);
    };
  }, [refreshContent, sendHeartbeat, token]);

  async function submitPairing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = pairingCode.replace(/\D/g, "");

    if (!/^\d{6}$/.test(normalized)) {
      setMessage("Enter the six-digit pairing code shown in Command Center.");
      return;
    }

    setPairingPending(true);
    setMessage("Pairing screen…");

    try {
      const response = await fetch(apiPath("/api/menuboard/pair"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: normalized
        }),
        cache: "no-store"
      });

      const body = (await response.json()) as {
        error?: string;
        playerToken?: string;
      };

      if (!response.ok || !body.playerToken) {
        setStatus("pairing");
        setMessage(body.error ?? "Pairing failed. Generate a new code and try again.");
        return;
      }

      window.localStorage.setItem(TOKEN_KEY, body.playerToken);
      setToken(body.playerToken);
      setPairingCode("");
      setStatus("online");
      setMessage("Paired. Loading published menu…");
    } catch {
      setStatus("pairing");
      setMessage("Cannot reach the server. Check Internet and try again.");
    } finally {
      setPairingPending(false);
    }
  }

  const renderedMenu = useMemo(() => {
    if (!content?.activePublish?.payload) {
      return null;
    }

    return publishedPayloadAsTemplateMenu(content.activePublish.payload);
  }, [content]);

  if (!token && !renderedMenu) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
        <form
          onSubmit={submitPairing}
          className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
            NetworkConnectIT MenuBoard
          </p>
          <h1 className="mt-3 text-3xl font-black">Pair this screen</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            In Command Center, open MenuBoard → Screen Fleet, generate a one-time
            pairing code, then enter it here.
          </p>

          <input
            value={pairingCode}
            onChange={(event) =>
              setPairingCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="mt-6 w-full rounded-2xl border border-white/15 bg-black px-5 py-4 text-center font-mono text-4xl font-black tracking-[0.35em] outline-none focus:border-amber-300"
          />

          <button
            type="submit"
            disabled={pairingPending}
            className="mt-4 w-full rounded-2xl bg-amber-300 px-5 py-4 font-bold text-zinc-950 disabled:opacity-50"
          >
            {pairingPending ? "Pairing…" : "Pair screen"}
          </button>

          <p className="mt-4 text-sm text-zinc-400">{message}</p>
        </form>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {renderedMenu ? (
        <div className="flex min-h-screen items-center justify-center bg-black">
          <DeliMenuTemplate
            menu={renderedMenu}
            storeFallbackName={content?.screen.name}
            className="h-screen max-h-screen w-screen max-w-none rounded-none shadow-none"
          />
        </div>
      ) : (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              NetworkConnectIT MenuBoard
            </p>
            <h1 className="mt-3 text-3xl font-black">Screen ready</h1>
            <p className="mt-3 text-zinc-400">{message}</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 backdrop-blur">
        {status} · {content?.screen.name ?? "player"}
      </div>
    </main>
  );
}
