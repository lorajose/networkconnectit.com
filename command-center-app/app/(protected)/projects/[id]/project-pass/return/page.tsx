import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectPassReturn } from "@/app/(protected)/projects/[id]/project-pass-return";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getProjectDetail } from "@/lib/management/projects";
import { getSearchParamValue } from "@/lib/management/search-params";
import { routeAccess } from "@/lib/rbac";

type ProjectPassReturnPageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

/**
 * Authenticated Project Pass checkout return surface.
 *
 * Query-string state is presentation-only. The client component must call the
 * server entitlement endpoint before it can display Project Pass as active.
 */
export default async function ProjectPassReturnPage({
  params,
  searchParams = {},
}: ProjectPassReturnPageProps) {
  const user = await requireRoles(routeAccess.projects);
  const project = await getProjectDetail(user, params.id);

  if (!project) {
    notFound();
  }

  const status = getSearchParamValue(searchParams.projectPassStatus);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardDescription>Project Pass</CardDescription>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProjectPassReturn
            status={status}
            organizationId={project.organizationId}
            projectInstallationId={project.id}
            product="CCTV_DIAGRAM_EXPORT"
          />

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/projects/${project.id}`}>Return to project</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/project-pass/return?projectPassStatus=success`}>
                Recheck server access
              </Link>
            </Button>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            Checkout return parameters never grant premium access. Project Pass becomes active only when the authenticated server entitlement check confirms a verified payment for this organization, project, and product.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
