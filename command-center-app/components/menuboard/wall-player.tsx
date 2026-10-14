"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DeliMenuTemplate } from "@/components/menuboard/deli-menu-template";
import {
  isMenuBoardPublishPayload,
  type MenuBoardPublishPayload,
} from "@/lib/menuboard/player-types";
import {
  isMenuBoardWallManifest,
  type MenuBoardPromotionSlide,
  type MenuBoardWallManifest,
} from "@/lib/menuboard/wall-types";

const TOKEN_KEY = "networkconnectit.menuboard.wallPlayerToken";
const CACHE_KEY = "networkconnectit.menuboard.wallLastKnownGood";
const POLL_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

function appBasePath() {
  return (process.env.NEXT_PUBLIC_APP_BASE_PATH ?? "").replace(/\/$/, "");
}

function apiPath(path: string) {
  return `${appBasePath()}${path}`;
}

function readCachedManifest(): MenuBoardWallManifest | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isMenuBoardWallManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedManifest(manifest: MenuBoardWallManifest) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(manifest));
  } catch {
    // Live playback continues even if persistent browser storage is unavailable.
  }
}

function clearWallIdentity() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // In-memory state is cleared by the caller as well.
  }
}

function menuAsTemplate(payload: MenuBoardPublishPayload) {
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
      items: section.items.map((item) => ({ ...item, isAvailable: true })),
    })),
  };
}

function PromotionZone({ slides }: { slides: MenuBoardPromotionSlide[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (!slide || slides.length < 2) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, slide.durationSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [slide, slides]);

  if (!slide) return null;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-zinc-950 text-white">
      {slide.mediaUrl ? (
        // Promotion media is deliberately image-first for the deli pilot.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/15" />
      <div className="relative mt-auto w-full p-[5%]">
        <p className="text-[clamp(0.7rem,1.1vw,1.1rem)] font-bold uppercase tracking-[0.25em] text-amber-300">
          Special offer
        </p>
        <h2 className="mt-3 text-[clamp(2rem,4.4vw,5rem)] font-black leading-[0.92] tracking-tight">
          {slide.headline}
        </h2>
        {slide.body ? <p className="mt-4 max-w-2xl text-[clamp(1rem,1.6vw,2rem)] text-white/80">{slide.body}</p> : null}
        {slide.offerText ? <p className="mt-6 text-[clamp(2.2rem,5vw,6rem)] font-black text-amber-300">{slide.offerText}</p> : null}
      </div>
    </div>
  );
}

export function MenuBoardWallPlayer() {
  const [token, setToken] = useState("");
  const [manifest, setManifest] = useState<MenuBoardWallManifest | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingPending, setPairingPending] = useState(false);
  const [status, setStatus] = useState<"booting" | "pairing" | "online" | "offline" | "waiting" | "invalid">("booting");
  const [message, setMessage] = useState("Starting MenuBoard wall player…");
  const manifestRef = useRef<MenuBoardWallManifest | null>(null);

  useEffect(() => {
    const cached = readCachedManifest();
    if (cached) {
      setManifest(cached);
      manifestRef.current = cached;
      setStatus("offline");
      setMessage("Offline · showing last known-good wall.");
    }

    try {
      const savedToken = window.localStorage.getItem(TOKEN_KEY) ?? "";
      if (savedToken) setToken(savedToken);
      else if (!cached) setStatus("pairing");
    } catch {
      if (!cached) setStatus("pairing");
    }
  }, []);

  const refreshManifest = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(apiPath("/api/menuboard/wall/manifest"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 401) {
        clearWallIdentity();
        setToken("");
        setManifest(null);
        manifestRef.current = null;
        setStatus("invalid");
        setMessage("Wall credential is invalid or revoked. Pair again.");
        return;
      }
      if (!response.ok) throw new Error("Wall manifest request failed.");
      const body: unknown = await response.json();
      const candidate = body as { ready?: unknown; manifest?: unknown };
      if (candidate.ready !== true || !isMenuBoardWallManifest(candidate.manifest)) {
        setStatus("waiting");
        setMessage("Wall is paired. Assign and publish content for all three zones.");
        return;
      }
      setManifest(candidate.manifest);
      manifestRef.current = candidate.manifest;
      writeCachedManifest(candidate.manifest);
      setStatus("online");
      setMessage("Live · 3-zone wall synchronized");
    } catch {
      const cached = readCachedManifest();
      if (cached) {
        setManifest(cached);
        manifestRef.current = cached;
        setStatus("offline");
        setMessage("Offline · showing last known-good wall.");
      } else {
        setStatus("offline");
        setMessage("Offline and no verified wall manifest is cached yet.");
      }
    }
  }, [token]);

  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    const current = manifestRef.current;
    try {
      await fetch(apiPath("/api/menuboard/wall/heartbeat"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          playerVersion: "wall-web-player-v1",
          manifestHash: current?.manifestHash ?? null,
          displayedZones: current?.zones.map((zone) => ({
            position: zone.position,
            role: zone.role,
            publishId: zone.content.publishId,
            version: zone.content.version,
            payloadHash: zone.content.payloadHash,
          })) ?? [],
        }),
        cache: "no-store",
      });
    } catch {
      // Best effort only; playback must continue offline.
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void refreshManifest();
    const poll = window.setInterval(() => void refreshManifest(), POLL_INTERVAL_MS);
    const heartbeat = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(heartbeat);
    };
  }, [refreshManifest, sendHeartbeat, token]);

  async function submitPairing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = pairingCode.replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      setMessage("Enter the six-digit wall pairing code from Command Center.");
      return;
    }
    setPairingPending(true);
    try {
      const response = await fetch(apiPath("/api/menuboard/wall/pair"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        cache: "no-store",
      });
      const body = (await response.json()) as { error?: string; playerToken?: string };
      if (!response.ok || !body.playerToken) {
        setStatus("pairing");
        setMessage(body.error ?? "Wall pairing failed.");
        return;
      }
      window.localStorage.removeItem(CACHE_KEY);
      window.localStorage.setItem(TOKEN_KEY, body.playerToken);
      setManifest(null);
      manifestRef.current = null;
      setToken(body.playerToken);
      setPairingCode("");
      setStatus("online");
      setMessage("Paired. Loading the three-zone wall…");
    } catch {
      setStatus("pairing");
      setMessage("Cannot reach the server. Check Internet and try again.");
    } finally {
      setPairingPending(false);
    }
  }

  const orderedZones = useMemo(() => manifest ? [...manifest.zones].sort((a, b) => a.position - b.position) : [], [manifest]);

  if (!token && !manifest) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
        <form onSubmit={submitPairing} className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">NetworkConnectIT MenuBoard</p>
          <h1 className="mt-3 text-3xl font-black">Pair this 3-TV wall</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Enter the one-time wall pairing code generated in Command Center.</p>
          <input value={pairingCode} onChange={(event) => setPairingCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="mt-6 w-full rounded-2xl border border-white/15 bg-black px-5 py-4 text-center font-mono text-4xl font-black tracking-[0.35em] outline-none focus:border-amber-300" />
          <button type="submit" disabled={pairingPending} className="mt-4 w-full rounded-2xl bg-amber-300 px-5 py-4 font-bold text-zinc-950 disabled:opacity-50">{pairingPending ? "Pairing…" : "Pair wall"}</button>
          <p className="mt-4 text-sm text-zinc-400">{message}</p>
        </form>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {orderedZones.length === 3 ? (
        <div className="grid h-full w-full grid-cols-3">
          {orderedZones.map((zone) => (
            <section key={zone.position} className="h-full min-w-0 overflow-hidden border-r border-black last:border-r-0">
              {zone.content.contentType === "MENU" && isMenuBoardPublishPayload(zone.content.payload) ? (
                <DeliMenuTemplate menu={menuAsTemplate(zone.content.payload)} storeFallbackName={manifest?.displayGroup.name} className="h-full w-full max-w-none rounded-none shadow-none" />
              ) : zone.content.contentType === "PROMOTION" ? (
                <PromotionZone slides={zone.content.slides} />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-zinc-400">Zone content unavailable.</div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center"><div><h1 className="text-3xl font-black">Wall ready</h1><p className="mt-3 text-zinc-400">{message}</p></div></div>
      )}
      <div className="pointer-events-none fixed bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 backdrop-blur">{status} · {manifest?.displayGroup.name ?? "wall player"}</div>
    </main>
  );
}
