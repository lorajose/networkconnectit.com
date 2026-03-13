"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { stripAppBasePath } from "@/lib/app-paths";
import { navigationForRole, type AppNavigationItem } from "@/lib/navigation";
import type { AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function SidebarNav({ role }: { role: AppRole }) {
  const pathname = stripAppBasePath(usePathname());
  const items = navigationForRole(role);
  const groupedItems = items.reduce<Record<AppNavigationItem["group"], AppNavigationItem[]>>(
    (accumulator, item) => {
      accumulator[item.group].push(item);
      return accumulator;
    },
    {
      workspace: [],
      administration: []
    }
  );

  return (
    <nav className="space-y-5">
      {(["workspace", "administration"] as const).map((group) => {
        if (groupedItems[group].length === 0) {
          return null;
        }

        return (
          <div key={group} className="space-y-2">
            <p className="px-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">
              {group === "workspace" ? "Workspace" : "Administration"}
            </p>
            <div className="space-y-1.5">
              {groupedItems[group].map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-all",
                      isActive
                        ? "border-sky-400/30 bg-sky-400/10 text-foreground shadow-[0_10px_24px_rgba(56,189,248,0.12)]"
                        : "border-transparent bg-background/40 text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 rounded-xl p-2 transition-colors",
                        isActive
                          ? "bg-sky-400/15 text-sky-300"
                          : "bg-accent text-foreground/80 group-hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.title}</span>
                        {isActive ? (
                          <Badge className="hidden sm:inline-flex">Active</Badge>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
