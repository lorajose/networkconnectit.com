import Link from "next/link";

import { MenuForm } from "@/components/menuboard/menu-form";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth";
import { getMenuBoardScreenOptions } from "@/lib/menuboard/screens";
import { listMenus } from "@/lib/menuboard/menus";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";

import { createMenuAction } from "../menu-actions";

export default async function MenuBoardMenusPage() {
  const user = await requireRoles(routeAccess.menuBoard);
  const [organizations, menus] = await Promise.all([
    getMenuBoardScreenOptions(user),
    listMenus(user)
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
        title="Menus & prices"
        description="Build store menus, sections, products and prices before assigning them to screens."
        breadcrumbs={[
          { label: "Command Center", href: "/dashboard" },
          { label: "MenuBoard", href: "/menuboard" },
          { label: "Menus" }
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/menuboard">Screen fleet</Link>
          </Button>
        }
      />

      {canWrite ? <MenuForm action={createMenuAction} sites={sites} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Menu library</CardTitle>
          <CardDescription>
            Draft menus stay editable until the publish workflow creates a screen-safe version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menus.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No menus yet. Create the first deli menu above.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {menus.map((menu) => (
                <div
                  key={menu.id}
                  className="rounded-2xl border border-border/70 bg-background/40 p-5"
                >
                  <p className="font-semibold">{menu.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {menu.organization.name} — {menu.site.name}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <span>{menu._count.sections} sections</span>
                    <span>{menu._count.items} items</span>
                    <span>{menu._count.assignments} screens</span>
                    <span>{menu._count.publishes} publishes</span>
                  </div>
                  <Button className="mt-4 w-full" variant="outline" asChild>
                    <Link href={`/menuboard/menus/${menu.id}`}>
                      Edit products & prices
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
