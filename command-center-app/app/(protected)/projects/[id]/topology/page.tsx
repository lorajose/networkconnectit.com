import Link from "next/link";
import { notFound } from "next/navigation";

import { TopologySummaryView } from "@/components/topology/topology-summary-view";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth";
import { getProjectTopologySnapshot } from "@/lib/management/topology";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";

type ProjectTopologyPageProps = {
  params: {
    id: string;
  };
};

export default async function ProjectTopologyPage({
  params
}: ProjectTopologyPageProps) {
  const user = await requireRoles(routeAccess.projects);
  const snapshot = await getProjectTopologySnapshot(user, params.id);

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
            <Link href={snapshot.project?.href ?? "/projects"}>Installation record</Link>
          </Button>
          {snapshot.site ? (
            <Button variant="outline" asChild>
              <Link href={snapshot.site.href}>Primary site</Link>
            </Button>
          ) : null}
          {canWrite ? (
            <Button asChild>
              <Link href={`/projects/${params.id}/edit`}>Edit installation</Link>
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
