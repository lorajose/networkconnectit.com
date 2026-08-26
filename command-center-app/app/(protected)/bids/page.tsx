import { ClipboardList, FileStack, Link2, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { routeAccess } from "@/lib/rbac";

const intakeStages = [
  {
    title: "Bid package",
    description: "Capture bid identity, due date, revision, notes, and the customer/project context.",
    icon: ClipboardList,
  },
  {
    title: "Source documents",
    description: "Classify drawings, specifications, scope, addenda, and vendor/subcontractor quotes.",
    icon: FileStack,
  },
  {
    title: "Estimate linkage",
    description: "Preserve the exact source package that feeds the deterministic estimate and proposal workflow.",
    icon: Link2,
  },
] as const;

export default async function BidsPage() {
  await requireRoles(routeAccess.bids);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Estimating Workspace</h1>
        <p className="max-w-3xl text-muted-foreground">
          Organize the bid package before takeoff and pricing so every estimate can be traced back to the drawings,
          specifications, revisions, and quote evidence that produced it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
            <div>
              <CardTitle>NCI-042 intake foundation</CardTitle>
              <CardDescription>
                Bid records are tenant-scoped and reuse the existing Organization, ProjectInstallation, and Estimate domain.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This first increment establishes the protected workspace, document classifications, revision metadata, and
            persistence boundary. Secure binary upload and the create/edit workflow will be wired in the next NCI-042 increment.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {intakeStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <Card key={stage.title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{stage.title}</CardTitle>
                <CardDescription>{stage.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
