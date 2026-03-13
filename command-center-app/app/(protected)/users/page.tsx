import { ProtectedRoutePlaceholder } from "@/components/protected-route-placeholder";
import { requireRoles } from "@/lib/auth";
import { routeAccess } from "@/lib/rbac";

export default async function UsersPage() {
  const user = await requireRoles(routeAccess.users);

  return (
    <ProtectedRoutePlaceholder
      section="Users"
      title="User management placeholder"
      description="This route is reserved for future internal and client user administration without introducing CRUD scope in Block 2."
      userRole={user.role}
      allowedRoles={routeAccess.users}
      highlights={[
        {
          label: "Scope",
          value: "Identity and access",
          hint: "Future user listings, invites, and role assignments will live here."
        },
        {
          label: "Access",
          value: "Admin roles",
          hint: "Navigation is already role-friendly and hides this route from viewers."
        },
        {
          label: "Status",
          value: "Shell ready",
          hint: "Protected route and layout are in place for Block 3 and later."
        },
        {
          label: "Data source",
          value: "Prisma User model",
          hint: "No create, edit, or invite workflow is implemented yet."
        }
      ]}
      nextSteps={[
        "Add user table, role badges, and organization scoping once CRUD work begins.",
        "Introduce invite or password-reset flows only after the core management scope is approved.",
        "Keep all access changes auditable when this route moves beyond placeholder status."
      ]}
    />
  );
}
