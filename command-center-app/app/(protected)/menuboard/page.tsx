import Link from "next/link";
import { Monitor, PanelsTopLeft, WifiOff } from "lucide-react";

import { MenuBoardScreenForm } from "@/components/menuboard/screen-form";
import { ScreenPairingControl } from "@/components/menuboard/screen-pairing-control";
import { MenuBoardWallForm } from "@/components/menuboard/wall-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";
import { getMenuBoardScreenOptions, listMenuBoardScreens } from "@/lib/menuboard/screens";
import { getMenuBoardConnectivityState, isDisplayedPublishCurrent } from "@/lib/menuboard/health";
import { listMenuBoardDisplayGroups } from "@/lib/menuboard/wall";
import { formatDate, formatEnumLabel } from "@/lib/utils";

import {
  createMenuBoardScreenAction,
  createMenuBoardWallAction,
  generateMenuBoardPairingCodeAction,
  generateMenuBoardWallPairingCodeAction,
  revokeMenuBoardPlayerAction,
  revokeMenuBoardWallPlayerAction,
} from "./actions";

export default async function MenuBoardPage() {
  const user = await requireRoles(routeAccess.menuBoard);
  const [organizations, screens, walls] = await Promise.all([
    getMenuBoardScreenOptions(user),
    listMenuBoardScreens(user),
    listMenuBoardDisplayGroups(user),
  ]);
  const canWrite = canWriteTenantInventory(user.role);
  const sites = organizations.flatMap((organization) =>
    organization.sites.map((site) => ({ id: site.id, name: site.name, organizationId: organization.id, organizationName: organization.name })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MenuBoard"
        title="Digital menu screens"
        description="Manage independent screens and single-player 3-TV deli walls from one tenant-safe control surface."
        breadcrumbs={[{ label: "Command Center", href: "/dashboard" }, { label: "MenuBoard" }]}
        actions={<Button asChild><Link href="/menuboard/menus">Manage menus & prices</Link></Button>}
      />

      {canWrite ? <MenuBoardWallForm action={createMenuBoardWallAction} sites={sites} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>3-TV walls</CardTitle>
          <CardDescription>One wall player drives TV1 Menu Primary, TV2 Menu Secondary, and TV3 Promotions.</CardDescription>
        </CardHeader>
        <CardContent>
          {walls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <PanelsTopLeft className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No 3-TV walls yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create the deli wall above, then pair the Raspberry Pi at /menuboard/wall.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {walls.map((wall) => {
                const isPaired = Boolean(wall.playerTokenIssuedAt) && !wall.playerTokenRevokedAt;
                const generateAction = generateMenuBoardWallPairingCodeAction.bind(null, wall.id);
                const revokeAction = revokeMenuBoardWallPlayerAction.bind(null, wall.id);
                return (
                  <div key={wall.id} className="rounded-2xl border border-border/70 bg-background/40 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{wall.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{wall.organization.name} — {wall.site.name}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${isPaired ? "bg-sky-500/10 text-sky-300" : "bg-zinc-500/10 text-zinc-300"}`}>{isPaired ? "Paired" : "Unpaired"}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {wall.zones.map((zone) => {
                        const label = zone.role === "MENU_PRIMARY" ? "TV1 · Menu" : zone.role === "MENU_SECONDARY" ? "TV2 · Menu" : "TV3 · Promotions";
                        const contentName = zone.menu?.name ?? zone.promotionCampaign?.name ?? "Not assigned";
                        const version = zone.activeMenuPublish?.version ?? zone.activePromotionPublish?.version ?? null;
                        return (
                          <div key={zone.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                            <p className="mt-2 truncate text-sm font-medium">{contentName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{version ? `Published v${version}` : "Not published"}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>Last seen: {wall.lastSeenAt ? formatDate(wall.lastSeenAt) : "Never"}</span>
                      <span>{wall.heartbeats[0]?.playerVersion ?? "No heartbeat"}</span>
                    </div>
                    {canWrite ? <div className="mt-4"><ScreenPairingControl generateAction={generateAction} revokeAction={revokeAction} canRevoke={isPaired} /></div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canWrite ? <MenuBoardScreenForm action={createMenuBoardScreenAction} sites={sites} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Independent screen fleet</CardTitle>
          <CardDescription>Legacy and standalone screens remain supported with their own revocable player credential.</CardDescription>
        </CardHeader>
        <CardContent>
          {screens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Monitor className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No independent screens yet</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {screens.map((screen) => {
                const isPaired = Boolean(screen.playerTokenIssuedAt) && !screen.playerTokenRevokedAt;
                const connectivityState = getMenuBoardConnectivityState({ paired: isPaired, revoked: Boolean(screen.playerTokenRevokedAt), lastSeenAt: screen.lastSeenAt });
                const latestHeartbeat = screen.heartbeats[0] ?? null;
                const expectedPublishVersion = screen.assignment?.activePublish?.version ?? null;
                const displayedPublishVersion = latestHeartbeat?.publishVersion ?? screen.displayedPublishVersion ?? null;
                const isCurrent = isDisplayedPublishCurrent(displayedPublishVersion, expectedPublishVersion);
                const generateAction = generateMenuBoardPairingCodeAction.bind(null, screen.id);
                const revokeAction = revokeMenuBoardPlayerAction.bind(null, screen.id);
                return (
                  <div key={screen.id} className="rounded-2xl border border-border/70 bg-background/40 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="font-semibold">{screen.name}</p><p className="mt-1 text-sm text-muted-foreground">{screen.organization.name} — {screen.site.name}</p></div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">{formatEnumLabel(connectivityState)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Display</p><p className="mt-1">{screen.widthPx}×{screen.heightPx} · {formatEnumLabel(screen.orientation)}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last seen</p><p className="mt-1">{screen.lastSeenAt ? formatDate(screen.lastSeenAt) : "Never"}</p></div>
                    </div>
                    <div className="mt-4 space-y-3 rounded-xl bg-muted/30 p-3 text-sm text-muted-foreground">
                      {screen.assignment?.menu ? <div className="flex flex-wrap items-center justify-between gap-2"><span>Assigned menu: {screen.assignment.menu.name}</span>{expectedPublishVersion !== null ? <span className={isCurrent ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300" : "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300"}>{isCurrent ? "Content current" : "Update pending"}</span> : null}</div> : <span className="flex items-center gap-2"><WifiOff className="h-4 w-4" />No menu assigned yet</span>}
                      <div className="grid gap-2 text-xs sm:grid-cols-3"><div><p className="uppercase tracking-[0.12em] text-muted-foreground/70">Expected</p><p className="mt-1 text-foreground">{expectedPublishVersion !== null ? `v${expectedPublishVersion}` : "—"}</p></div><div><p className="uppercase tracking-[0.12em] text-muted-foreground/70">Displaying</p><p className="mt-1 text-foreground">{displayedPublishVersion !== null ? `v${displayedPublishVersion}` : "—"}</p></div><div><p className="uppercase tracking-[0.12em] text-muted-foreground/70">Player</p><p className="mt-1 truncate text-foreground">{latestHeartbeat?.playerVersion ?? "—"}</p></div></div>
                    </div>
                    {canWrite ? <div className="mt-4"><ScreenPairingControl generateAction={generateAction} revokeAction={revokeAction} canRevoke={isPaired} /></div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
