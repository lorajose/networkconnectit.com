import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  Cpu,
  Eye,
  LayoutDashboard,
  MapPinned,
  Settings,
  Users2
} from "lucide-react";

import type { AppRole } from "@/lib/rbac";
import { hasRequiredRole, routeAccess } from "@/lib/rbac";

export type AppNavigationItem = {
  group: "workspace" | "administration";
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  allowedRoles: readonly AppRole[];
};

export const appNavigation: AppNavigationItem[] = [
  {
    group: "workspace",
    title: "Dashboard",
    href: "/dashboard",
    description: "Operational overview and deployment summary.",
    icon: LayoutDashboard,
    allowedRoles: routeAccess.dashboard
  },
  {
    group: "workspace",
    title: "Organizations",
    href: "/organizations",
    description: "Tenant and customer account structure.",
    icon: Building2,
    allowedRoles: routeAccess.organizations
  },
  {
    group: "workspace",
    title: "Sites",
    href: "/sites",
    description: "Location inventory and deployment mapping.",
    icon: MapPinned,
    allowedRoles: routeAccess.sites
  },
  {
    group: "workspace",
    title: "Devices",
    href: "/devices",
    description: "Hardware inventory, status, and health history.",
    icon: Cpu,
    allowedRoles: routeAccess.devices
  },
  {
    group: "workspace",
    title: "Alerts",
    href: "/alerts",
    description: "Operational events and incident triage.",
    icon: Bell,
    allowedRoles: routeAccess.alerts
  },
  {
    group: "workspace",
    title: "Viewer Portal",
    href: "/viewer",
    description: "Read-only client monitoring and summary views.",
    icon: Eye,
    allowedRoles: routeAccess.viewer
  },
  {
    group: "administration",
    title: "Users",
    href: "/users",
    description: "Identity and access placeholders for future delivery.",
    icon: Users2,
    allowedRoles: routeAccess.users
  },
  {
    group: "administration",
    title: "Settings",
    href: "/settings",
    description: "Environment and tenant settings placeholders.",
    icon: Settings,
    allowedRoles: routeAccess.settings
  }
];

export function navigationForRole(role: AppRole) {
  return appNavigation.filter((item) =>
    hasRequiredRole(role, item.allowedRoles)
  );
}
