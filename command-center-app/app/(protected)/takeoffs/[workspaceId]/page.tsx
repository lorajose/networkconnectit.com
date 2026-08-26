import Link from "next/link";
import { ArrowLeft, Boxes, Calculator, FileSearch, PencilRuler, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireRoles } from "@/lib/auth";
import { TAKEOFF_CATEGORIES } from "@/lib/contractor-os/takeoff";
import { getTakeoffWorkspace } from "@/lib/contractor-os/takeoff-repository";
import { routeAccess } from "@/lib/rbac";
import {
  addTakeoffItemAction,
  deleteTakeoffItemAction,
  updateBomOverrideAction,
  updateTakeoffItemQuantityAction,
} from "../actions";

type TakeoffDetailProps = {
  params: { workspaceId: string };
  searchParams?: { organizationId?: string };
};

function numberValue(value: { toString(): string } | null) {
  return value == null ? "" : value.toString();
}

export default async function TakeoffDetailPage({ params, searchParams }: TakeoffDetailProps) {
  const user = await requireRoles(routeAccess.takeoffs);
  const organizationId = user.organizationId || searchParams?.organizationId || "";
  if (!organizationId) notFound();

  const actor = { role: user.role, organizationId: user.organizationId };
  const workspace = await getTakeoffWorkspace(actor, params.workspaceId, organizationId);
  if (!workspace) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2"><Link href={`/takeoffs?organizationId=${encodeURIComponent(organizationId)}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to takeoffs</Link><p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Digital Takeoff</p><h1 className="text-3xl font-semibold tracking-tight">{workspace.name}</h1><p className="max-w-3xl text-muted-foreground">{workspace.notes || "Capture drawing counts, preserve source references, and approve the BOM before pricing."}</p></div>
        <div className="flex flex-col items-end gap-3">
          <div className="rounded-2xl border px-4 py-3 text-sm"><p className="font-medium">{workspace.status}</p><p className="text-muted-foreground">{workspace.bidWorkspaceId ? `Bid linked` : "No bid link"}{workspace.estimateId ? " · Estimate linked" : ""}</p></div>
          <Button asChild className="gap-2"><Link href={`/takeoffs/${workspace.id}/pricing?organizationId=${encodeURIComponent(organizationId)}`}><Calculator className="h-4 w-4" />Price BOM &amp; push to Estimate</Link></Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
        <Card><CardHeader><PencilRuler className="h-5 w-5 text-primary" /><CardTitle>Add takeoff item</CardTitle><CardDescription>Counts are manual by default. AI suggestions remain explicitly labeled and always overrideable.</CardDescription></CardHeader><CardContent><form action={addTakeoffItemAction} className="space-y-4"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="workspaceId" value={workspace.id} /><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="category">Category</Label><Select id="category" name="category" defaultValue="STRUCTURED_CABLING">{TAKEOFF_CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</Select></div><div className="space-y-2"><Label htmlFor="source">Source</Label><Select id="source" name="source" defaultValue="MANUAL"><option value="MANUAL">Manual</option><option value="AI_SUGGESTED">AI suggested</option></Select></div></div><div className="space-y-2"><Label htmlFor="description">Description</Label><Input id="description" name="description" placeholder="CAT6 data drop" required /></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="itemCode">Catalog/code</Label><Input id="itemCode" name="itemCode" placeholder="CAT6-DROP" /></div><div className="space-y-2"><Label htmlFor="countedQuantity">Count</Label><Input id="countedQuantity" name="countedQuantity" type="number" min="0" step="0.001" required /></div><div className="space-y-2"><Label htmlFor="unit">Unit</Label><Input id="unit" name="unit" defaultValue="EA" required /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="sheetReference">Drawing / sheet</Label><Input id="sheetReference" name="sheetReference" placeholder="T-201" /></div><div className="space-y-2"><Label htmlFor="drawingRevision">Drawing revision</Label><Input id="drawingRevision" name="drawingRevision" placeholder="Rev 3" /></div></div><div className="space-y-2"><Label htmlFor="overrideQuantity">Immediate override (optional)</Label><Input id="overrideQuantity" name="overrideQuantity" type="number" min="0" step="0.001" /></div><div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" placeholder="Room references, assumptions, symbol notes..." /></div><Button type="submit" className="w-full">Add item and generate BOM input</Button></form></CardContent></Card>

        <Card><CardHeader><FileSearch className="h-5 w-5 text-primary" /><CardTitle>Counted scope</CardTitle><CardDescription>{workspace.items.length} takeoff item{workspace.items.length === 1 ? "" : "s"}. Human quantity override always wins.</CardDescription></CardHeader><CardContent className="space-y-3">{workspace.items.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No counts yet. Add the first drawing item from the form.</div> : workspace.items.map((item) => <div key={item.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-primary">{item.category.replaceAll("_", " ")} · {item.source.replaceAll("_", " ")}</p><h2 className="mt-1 font-semibold">{item.description}</h2><p className="mt-1 text-sm text-muted-foreground">{item.sheetReference || "No sheet"}{item.drawingRevision ? ` · ${item.drawingRevision}` : ""}{item.itemCode ? ` · ${item.itemCode}` : ""}</p></div><div className="text-right text-sm"><p className="font-semibold">{numberValue(item.overrideQuantity) || item.countedQuantity.toString()} {item.unit}</p><p className="text-muted-foreground">Counted {item.countedQuantity.toString()}</p></div></div><div className="mt-4 flex flex-wrap items-end gap-3"><form action={updateTakeoffItemQuantityAction} className="flex items-end gap-2"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="workspaceId" value={workspace.id} /><input type="hidden" name="itemId" value={item.id} /><div className="space-y-1"><Label htmlFor={`override-${item.id}`}>Override qty</Label><Input id={`override-${item.id}`} name="overrideQuantity" type="number" min="0" step="0.001" defaultValue={numberValue(item.overrideQuantity)} className="w-32" /></div><Button type="submit" variant="outline">Apply</Button></form><form action={deleteTakeoffItemAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="workspaceId" value={workspace.id} /><input type="hidden" name="itemId" value={item.id} /><Button type="submit" variant="ghost" className="gap-2"><Trash2 className="h-4 w-4" />Delete</Button></form></div>{item.notes ? <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p> : null}</div>)}</CardContent></Card>
      </div>

      <Card><CardHeader><Boxes className="h-5 w-5 text-primary" /><CardTitle>Editable bill of materials</CardTitle><CardDescription>Generated quantities mirror the approved takeoff count. Apply a final BOM override before NCI-010 pricing.</CardDescription></CardHeader><CardContent className="space-y-3">{workspace.bomItems.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">BOM inputs appear automatically as takeoff items are added.</div> : workspace.bomItems.map((item) => <div key={item.id} className="grid gap-4 rounded-2xl border p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end"><div><p className="text-xs font-medium uppercase tracking-wider text-primary">{item.catalogCode || item.costRuleKey || "Unmapped"}</p><h3 className="font-semibold">{item.description}</h3><p className="text-sm text-muted-foreground">Generated {item.generatedQuantity.toString()} {item.unit}{item.overrideQuantity ? ` · Final override ${item.overrideQuantity.toString()}` : ""}</p></div><form action={updateBomOverrideAction} className="flex items-end gap-2"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="workspaceId" value={workspace.id} /><input type="hidden" name="bomItemId" value={item.id} /><div className="space-y-1"><Label htmlFor={`bom-${item.id}`}>BOM override</Label><Input id={`bom-${item.id}`} name="overrideQuantity" type="number" min="0" step="0.001" defaultValue={numberValue(item.overrideQuantity)} className="w-32" /></div><Button type="submit" variant="outline">Save</Button></form><div className="text-right text-sm"><p className="font-semibold">{numberValue(item.overrideQuantity) || item.generatedQuantity.toString()} {item.unit}</p><p className="text-muted-foreground">Pricing quantity</p></div></div>)}</CardContent></Card>
    </div>
  );
}
