import type { ReactNode } from "react";
import Link from "next/link";
import { Orbit, Shield, Sparkles } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { RuntimeConfigBanner } from "@/components/config/runtime-config-banner";
import { SidebarNav } from "@/components/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AppRole } from "@/lib/rbac";
import { isCommandCenterAdminRole, roleLabels } from "@/lib/rbac";
import { getRuntimeConfigWarnings } from "@/lib/runtime-config";

type AppShellProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role: AppRole;
    organizationId: string | null;
  };
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const runtimeWarnings = isCommandCenterAdminRole(user.role)
    ? getRuntimeConfigWarnings()
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-command-grid bg-[size:28px_28px] opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_58%)]" />
      <div className="relative mx-auto max-w-[1600px] p-4 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[296px_1fr]">
          <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
            <div className="flex h-full flex-col gap-4">
              <Card className="command-surface border-sky-400/15">
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <Link href="/dashboard" className="space-y-3">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          NetworkConnectIT
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Security Command Center
                        </p>
                      </div>
                    </Link>
                    <Badge>{roleLabels[user.role]}</Badge>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">
                      Operations fabric
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Unified visibility for client sites, devices, and infrastructure worldwide.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 border-border/80 bg-card/70">
                <CardContent className="h-full p-4">
                  <SidebarNav role={user.role} />
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-sky-300">
                      <Orbit className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user.name ?? "Authenticated User"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
                        Session scope
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {user.organizationId ? `Org ${user.organizationId}` : "Global access"}
                      </p>
                    </div>
                    <Badge variant="outline">Secure</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          <div className="space-y-6">
            <Card className="command-surface border-border/80">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      Protected workspace
                    </Badge>
                    <Badge variant="outline">{roleLabels[user.role]}</Badge>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      NetworkConnectIT Security Command Center
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      Unified visibility for client sites, devices, and infrastructure worldwide.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
                      Signed in
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {user.email}
                    </p>
                  </div>
                  <SignOutButton />
                </div>
              </CardContent>
            </Card>

            <RuntimeConfigBanner warnings={runtimeWarnings} />

            <main className="space-y-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
