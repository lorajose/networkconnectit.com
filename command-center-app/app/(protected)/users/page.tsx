import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { routeAccess } from "@/lib/rbac";
import { listTenantUsers, type UserAdministrationActor } from "@/lib/security/user-administration";

import { changeUserRoleAction, createUserAction, setUserActiveStateAction } from "./actions";

export default async function UsersPage() {
  const sessionUser = await requireRoles(routeAccess.users);
  const actor: UserAdministrationActor = {
    id: sessionUser.id,
    role: sessionUser.role,
    organizationId: sessionUser.organizationId ?? null
  };

  if (actor.role !== "CLIENT_ADMIN") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Identity & access" title="Users" description="Client user administration is tenant-scoped. Platform administrator workflows remain intentionally separate." />
        <Card>
          <CardHeader>
            <CardTitle>Platform administration boundary</CardTitle>
            <CardDescription>This screen does not expose cross-organization user management. Use the dedicated internal administration workflow for platform roles.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const users = await listTenantUsers(actor);
  const activeCount = users.filter((user) => user.isActive).length;
  const adminCount = users.filter((user) => user.isActive && user.role === "CLIENT_ADMIN").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Identity & access"
        title="Users"
        description="Manage users in your organization. Tenant scope and role boundaries are enforced on the server."
        breadcrumbs={[{ label: "Command Center", href: "/dashboard" }, { label: "Users" }]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardDescription>Total users</CardDescription><CardTitle>{users.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Active users</CardDescription><CardTitle>{activeCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Active client admins</CardDescription><CardTitle>{adminCount}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
          <CardDescription>Create a tenant user with a temporary password of at least 12 characters. Platform roles cannot be assigned here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1.2fr_auto] lg:items-end">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="off" required /></div>
            <div className="space-y-2"><Label htmlFor="role">Role</Label><Select id="role" name="role" defaultValue="VIEWER"><option value="VIEWER">Viewer</option><option value="CLIENT_ADMIN">Client Admin</option></Select></div>
            <div className="space-y-2"><Label htmlFor="temporaryPassword">Temporary password</Label><Input id="temporaryPassword" name="temporaryPassword" type="password" minLength={12} autoComplete="new-password" required /></div>
            <Button type="submit">Add user</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Organization users</CardTitle><CardDescription>Role changes and account state changes revoke stale sessions. The last active client administrator is protected.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 ? <p className="text-sm text-muted-foreground">No users found for this organization.</p> : users.map((user) => (
            <div key={user.id} className="flex flex-col gap-4 rounded-2xl border border-border/70 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><span className="truncate font-medium">{user.email}</span><Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Disabled"}</Badge>{user.id === sessionUser.id ? <Badge variant="outline">You</Badge> : null}</div>
                <p className="text-xs text-muted-foreground">{user.role === "CLIENT_ADMIN" ? "Client Admin" : "Viewer"} · Added {user.createdAt.toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <form action={changeUserRoleAction} className="flex items-end gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <div className="space-y-1"><Label htmlFor={`role-${user.id}`} className="text-xs">Role</Label><Select id={`role-${user.id}`} name="role" defaultValue={user.role} className="min-w-36"><option value="VIEWER">Viewer</option><option value="CLIENT_ADMIN">Client Admin</option></Select></div>
                  <Button type="submit" variant="outline">Save role</Button>
                </form>
                <form action={setUserActiveStateAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="isActive" value={user.isActive ? "false" : "true"} />
                  <Button type="submit" variant={user.isActive ? "outline" : "secondary"}>{user.isActive ? "Disable" : "Reactivate"}</Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
