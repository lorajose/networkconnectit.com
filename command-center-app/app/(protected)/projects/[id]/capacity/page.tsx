import Link from "next/link";
import { notFound } from "next/navigation";

import { CapacitySummaryView } from "@/components/capacity/capacity-summary-view";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth";
import { getProjectCapacitySnapshot } from "@/lib/management/capacity";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";

type ProjectCapacityPageProps = {
  params: {
    id: string;
  };
};

export default async function ProjectCapacityPage({
  params
}: ProjectCapacityPageProps) {
  const user = await requireRoles(routeAccess.projects);
  const snapshot = await getProjectCapacitySnapshot(user, params.id);

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
            <Link href={snapshot.project?.href ?? "/projects"}>Installation record</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/projects/${params.id}/topology`}>View topology</Link>
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
