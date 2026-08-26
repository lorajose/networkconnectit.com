import Link from "next/link";
import { ArrowLeft, Calculator, Send } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { listBomPricing } from "@/lib/contractor-os/takeoff-pricing-repository";
import { getTakeoffWorkspace } from "@/lib/contractor-os/takeoff-repository";
import { routeAccess } from "@/lib/rbac";
import { pushTakeoffToEstimateAction, updateBomPricingAction } from "../../actions";

type Props = { params: { workspaceId: string }; searchParams?: { organizationId?: string } };

export default async function TakeoffPricingPage({ params, searchParams }: Props) {
  const user = await requireRoles(routeAccess.takeoffs);
  const organizationId = user.organizationId || searchParams?.organizationId || "";
  if (!organizationId) notFound();
  const actor = { role: user.role, organizationId: user.organizationId };
  const [workspace, pricing] = await Promise.all([
    getTakeoffWorkspace(actor, params.workspaceId, organizationId),
    listBomPricing(actor, params.workspaceId, organizationId),
  ]);
  if (!workspace) notFound();
  const pricingById = new Map(pricing.map((row) => [row.id, row]));
  const unresolved = pricing.filter((row) => row.unitCostOverride == null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/takeoffs/${workspace.id}?organizationId=${encodeURIComponent(organizationId)}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to takeoff</Link>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">NCI-043 Pricing Handoff</p>
          <h1 className="text-3xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Assign deterministic cost inputs to the approved BOM, then push only those sourced lines into the linked NCI-010 Estimate.</p>
        </div>
        <div className="rounded-2xl border px-4 py-3 text-sm"><p className="font-semibold">{unresolved} unresolved cost{unresolved === 1 ? "" : "s"}</p><p className="text-muted-foreground">{workspace.estimateId ? "Estimate linked" : "Estimate link required"}</p></div>
      </div>

      <Card>
        <CardHeader><Calculator className="h-5 w-5 text-primary" /><CardTitle>Approved BOM pricing</CardTitle><CardDescription>Unit costs are explicit human inputs. The handoff will refuse to price unresolved BOM rows.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {workspace.bomItems.map((item) => {
            const row = pricingById.get(item.id);
            return (
              <form key={item.id} action={updateBomPricingAction} className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
                <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="workspaceId" value={workspace.id} /><input type="hidden" name="bomItemId" value={item.id} />
                <div><p className="text-xs font-medium uppercase tracking-wider text-primary">{item.catalogCode || item.costRuleKey || "Manual cost rule"}</p><h2 className="font-semibold">{item.description}</h2><p className="text-sm text-muted-foreground">Qty {(item.overrideQuantity ?? item.generatedQuantity).toString()} {item.unit}</p></div>
                <div className="space-y-1"><Label htmlFor={`lineType-${item.id}`}>Estimate type</Label><Select id={`lineType-${item.id}`} name="lineType" defaultValue={row?.lineType || "MATERIAL"}><option value="MATERIAL">Material</option><option value="LABOR">Labor</option><option value="EQUIPMENT">Equipment</option><option value="TRAVEL">Travel</option><option value="CONSUMABLE">Consumable</option><option value="OTHER">Other</option></Select></div>
                <div className="space-y-1"><Label htmlFor={`cost-${item.id}`}>Unit cost</Label><Input id={`cost-${item.id}`} name="unitCostOverride" type="number" min="0" step="0.0001" defaultValue={row?.unitCostOverride?.toString() || ""} placeholder="Required" /></div>
                <Button type="submit" variant="outline">Save pricing</Button>
              </form>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><Send className="h-5 w-5 text-primary" /><CardTitle>Push approved BOM to Estimate</CardTitle><CardDescription>Creates an immutable SHA-256 snapshot, replaces only prior lines sourced from this takeoff, and recalculates NCI-010 totals deterministically.</CardDescription></CardHeader>
        <CardContent><form action={pushTakeoffToEstimateAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="workspaceId" value={workspace.id} /><Button type="submit" disabled={!workspace.estimateId || unresolved > 0 || workspace.bomItems.length === 0}>Push to linked Estimate</Button></form></CardContent>
      </Card>
    </div>
  );
}
