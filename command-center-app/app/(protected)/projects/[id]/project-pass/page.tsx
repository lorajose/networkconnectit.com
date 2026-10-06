import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectPassPurchaseButton } from "@/app/(protected)/projects/[id]/project-pass-purchase-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getProjectDetail } from "@/lib/management/projects";
import { routeAccess } from "@/lib/rbac";

type ProjectPassPageProps = {
  params: { id: string };
};

/**
 * Authenticated Project Pass purchase surface.
 *
 * The browser submits only tenant/project/product intent. Price, currency,
 * return URLs, payment verification and entitlement remain server-owned.
 */
export default async function ProjectPassPage({ params }: ProjectPassPageProps) {
  const user = await requireRoles(routeAccess.projects);
  const project = await getProjectDetail(user, params.id);

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardDescription>Project Pass · Premium project output</CardDescription>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">CCTV Diagram Export</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Start a secure Project Pass checkout for this project. Premium output remains locked until the server records and verifies the payment event for this organization, project, and product.
            </p>
          </div>

          <ProjectPassPurchaseButton
            organizationId={project.organizationId}
            projectInstallationId={project.id}
            product="CCTV_DIAGRAM_EXPORT"
          />

          <div className="rounded-2xl border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground">
            Checkout completion in the browser does not grant access. A successful return is followed by a server-side entitlement check before premium delivery can be enabled.
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}`}>Return to project</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/project-pass/return?projectPassStatus=success`}>
                Check Project Pass access
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
