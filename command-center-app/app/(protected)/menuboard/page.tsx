import Link from "next/link";
import { Monitor, WifiOff } from "lucide-react";

import { MenuBoardScreenForm } from "@/components/menuboard/screen-form";
import { ScreenPairingControl } from "@/components/menuboard/screen-pairing-control";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";
import {
  getMenuBoardScreenOptions,
  listMenuBoardScreens
} from "@/lib/menuboard/screens";
import { formatDate, formatEnumLabel } from "@/lib/utils";

import {
  createMenuBoardScreenAction,
  generateMenuBoardPairingCodeAction,
  revokeMenuBoardPlayerAction
} from "./actions";

export default async function MenuBoardPage() {
  const user = await requireRoles(routeAccess.menuBoard);
  const [organizations, screens] = await Promise.all([
    getMenuBoardScreenOptions(user),
    listMenuBoardScreens(user)
  ]);
  const canWrite = canWriteTenantInventory(user.role);
  const sites = organizations.flatMap((organization) =>
    organization.sites.map((site) => ({
      id: site.id,
      name: site.name,
      organizationId: organization.id,
      organizationName: organization.name
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MenuBoard"
        title="Digital menu screens"
        description="Register players, pair Raspberry Pi kiosks, and prepare screens for published deli menus."
        breadcrumbs={[
          { label: "Command Center", href: "/dashboard" },
          { label: "MenuBoard" }
        ]}
        actions={
          <Button asChild>
            <Link href="/menuboard/menus">Manage menus & prices</Link>
          </Button>
        }
      />

      {canWrite ? (
        <MenuBoardScreenForm
          action={createMenuBoardScreenAction}
          sites={sites}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Screen fleet</CardTitle>
          <CardDescription>
            Each screen has its own revocable player credential and can later receive an independent published menu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {screens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Monitor className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No MenuBoard screens yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the first customer screen above, then generate its one-time pairing code.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {screens.map((screen) => {
                const staleHeartbeat =
                  screen.status === "ONLINE" &&
                  (!screen.lastSeenAt ||
                    Date.now() - screen.lastSeenAt.getTime() > 120_000);
                const displayStatus = staleHeartbeat
                  ? "OFFLINE"
                  : screen.status;
                const generateAction =
                  generateMenuBoardPairingCodeAction.bind(null, screen.id);
                const revokeAction =
                  revokeMenuBoardPlayerAction.bind(null, screen.id);
                const isPaired =
                  Boolean(screen.playerTokenIssuedAt) &&
                  !screen.playerTokenRevokedAt;
                const canRevoke = isPaired;

                return (
                  <div
                    key={screen.id}
                    className="rounded-2xl border border-border/70 bg-background/40 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{screen.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {screen.organization.name} — {screen.site.name}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {isPaired ? (
                          <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-300">
                            Paired
                          </span>
                        ) : null}
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">
                          {formatEnumLabel(displayStatus)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Display
                        </p>
                        <p className="mt-1">
                          {screen.widthPx}×{screen.heightPx} ·{" "}
                          {formatEnumLabel(screen.orientation)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Last seen
                        </p>
                        <p className="mt-1">
                          {screen.lastSeenAt
                            ? formatDate(screen.lastSeenAt)
                            : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-muted/30 p-3 text-sm text-muted-foreground">
                      {screen.assignment?.menu ? (
                        <>Assigned menu: {screen.assignment.menu.name}</>
                      ) : (
                        <span className="flex items-center gap-2">
                          <WifiOff className="h-4 w-4" />
                          No menu assigned yet
                        </span>
                      )}
                    </div>

                    {canWrite ? (
                      <div className="mt-4">
                        <ScreenPairingControl
                          generateAction={generateAction}
                          revokeAction={revokeAction}
                          canRevoke={canRevoke}
                        />
                      </div>
                    ) : null}
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
