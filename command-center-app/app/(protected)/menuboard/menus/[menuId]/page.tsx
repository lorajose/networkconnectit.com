import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MenuItemActions,
  MenuItemForm,
  MenuSectionForm,
  QuickPriceForm
} from "@/components/menuboard/menu-editor-forms";
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
import { getMenuById } from "@/lib/menuboard/menus";
import { formatPriceFromCents } from "@/lib/menuboard/money";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";

import {
  createMenuItemAction,
  createMenuSectionAction,
  duplicateMenuItemAction,
  moveMenuItemAction,
  setMenuItemAvailabilityAction,
  updateMenuItemPriceAction
} from "../../menu-actions";

type MenuEditorPageProps = {
  params: {
    menuId: string;
  };
};

export default async function MenuEditorPage({
  params
}: MenuEditorPageProps) {
  const user = await requireRoles(routeAccess.menuBoard);
  const menu = await getMenuById(user, params.menuId);

  if (!menu) {
    notFound();
  }

  const canWrite = canWriteTenantInventory(user.role);
  const sectionAction = createMenuSectionAction.bind(null, menu.id);
  const itemAction = createMenuItemAction.bind(null, menu.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MenuBoard"
        title={menu.name}
        description={`${menu.organization.name} — ${menu.site.name} · ${menu.currency}`}
        breadcrumbs={[
          { label: "Command Center", href: "/dashboard" },
          { label: "MenuBoard", href: "/menuboard" },
          { label: "Menus", href: "/menuboard/menus" },
          { label: menu.name }
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/menuboard/menus">Back to menus</Link>
          </Button>
        }
      />

      {canWrite ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <MenuSectionForm action={sectionAction} />
          <MenuItemForm
            action={itemAction}
            sections={menu.sections.map((section) => ({
              id: section.id,
              name: section.name
            }))}
          />
        </div>
      ) : null}

      <div className="space-y-4">
        {menu.sections.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Add the first section, such as Breakfast, Hot Sandwiches, Drinks, or Specials.
            </CardContent>
          </Card>
        ) : (
          menu.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{section.name}</CardTitle>
                <CardDescription>
                  {section.items.length} item{section.items.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    No products in this section yet.
                  </p>
                ) : (
                  section.items.map((item) => {
                    const priceAction = updateMenuItemPriceAction.bind(
                      null,
                      item.id,
                      menu.id
                    );
                    const availabilityAction =
                      setMenuItemAvailabilityAction.bind(
                        null,
                        item.id,
                        menu.id,
                        !item.isAvailable
                      );
                    const duplicateAction = duplicateMenuItemAction.bind(
                      null,
                      item.id,
                      menu.id
                    );
                    const moveUpAction = moveMenuItemAction.bind(
                      null,
                      item.id,
                      menu.id,
                      "UP"
                    );
                    const moveDownAction = moveMenuItemAction.bind(
                      null,
                      item.id,
                      menu.id,
                      "DOWN"
                    );

                    return (
                      <div
                        key={item.id}
                        className="grid gap-4 rounded-2xl border border-border/70 bg-background/40 p-4 lg:grid-cols-[1.3fr_260px]"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            <span
                              className={
                                item.isAvailable
                                  ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                                  : "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300"
                              }
                            >
                              {item.isAvailable ? "Visible" : "Hidden"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description || "No description"}
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatPriceFromCents(
                              item.priceCents,
                              menu.currency
                            )}
                          </p>

                          {canWrite ? (
                            <div className="mt-3">
                              <MenuItemActions
                                availabilityAction={availabilityAction}
                                duplicateAction={duplicateAction}
                                moveUpAction={moveUpAction}
                                moveDownAction={moveDownAction}
                                isAvailable={item.isAvailable}
                              />
                            </div>
                          ) : null}
                        </div>

                        {canWrite ? (
                          <QuickPriceForm
                            action={priceAction}
                            defaultValue={(item.priceCents / 100).toFixed(2)}
                          />
                        ) : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
