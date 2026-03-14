import Link from "next/link";
import { notFound } from "next/navigation";

import { TopologySummaryView } from "@/components/topology/topology-summary-view";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth";
import { getSiteTopologySnapshot } from "@/lib/management/topology";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";

type SiteTopologyPageProps = {
  params: {
    id: string;
  };
};

export default async function SiteTopologyPage({
  params
}: SiteTopologyPageProps) {
  const user = await requireRoles(routeAccess.sites);
  const snapshot = await getSiteTopologySnapshot(user, params.id);

  if (!snapshot) {
    notFound();
  }

  const canWrite = canWriteTenantInventory(user.role);

  return (
    <TopologySummaryView
      snapshot={snapshot}
      actions={
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href={snapshot.site?.href ?? "/sites"}>Site record</Link>
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
