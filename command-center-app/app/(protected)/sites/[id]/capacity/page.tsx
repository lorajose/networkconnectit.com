import Link from "next/link";
import { notFound } from "next/navigation";

import { CapacitySummaryView } from "@/components/capacity/capacity-summary-view";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth";
import { getSiteCapacitySnapshot } from "@/lib/management/capacity";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";

type SiteCapacityPageProps = {
  params: {
    id: string;
  };
};

export default async function SiteCapacityPage({
  params
}: SiteCapacityPageProps) {
  const user = await requireRoles(routeAccess.sites);
  const snapshot = await getSiteCapacitySnapshot(user, params.id);

  if (!snapshot) {
    notFound();
  }

  const canWrite = canWriteTenantInventory(user.role);

  return (
    <CapacitySummaryView
      snapshot={snapshot}
      actions={
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href={snapshot.site?.href ?? "/sites"}>Site record</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/sites/${params.id}/topology`}>View topology</Link>
          </Button>
          {snapshot.project ? (
            <Button variant="outline" asChild>
              <Link href={snapshot.project.href}>Linked project</Link>
            </Button>
          ) : null}
          {canWrite ? (
            <Button asChild>
              <Link href={`/sites/${params.id}/edit`}>Edit site</Link>
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
