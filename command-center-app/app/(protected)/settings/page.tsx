import { ProtectedRoutePlaceholder } from "@/components/protected-route-placeholder";
import { requireRoles } from "@/lib/auth";
import { routeAccess } from "@/lib/rbac";

export default async function SettingsPage() {
  const user = await requireRoles(routeAccess.settings);

  return (
    <ProtectedRoutePlaceholder
      section="Settings"
      title="Settings placeholder"
      description="This route is reserved for future tenant and environment settings once the management modules are ready."
      userRole={user.role}
      allowedRoles={routeAccess.settings}
      highlights={[
        {
          label: "Scope",
          value: "Environment controls",
          hint: "Future organization defaults, notification preferences, and operational settings."
        },
        {
          label: "Access",
          value: "Admin roles",
          hint: "Read-only viewer users do not see this route in the shared shell."
        },
        {
          label: "Status",
          value: "Placeholder only",
          hint: "No mutable settings surface is exposed in this block."
        },
        {
          label: "Intent",
          value: "Future-safe routing",
          hint: "The nav and middleware are prepared for later feature work."
        }
      ]}
      nextSteps={[
        "Define organization-level settings requirements before exposing forms or persistence.",
        "Separate global admin settings from tenant settings during the CRUD phase.",
        "Preserve build stability by keeping this route placeholder-only for now."
      ]}
    />
  );
}
