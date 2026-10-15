"use client";

import { useFormState } from "react-dom";

import type { ManagementFormState } from "@/lib/management/form-state";
import { Button } from "@/components/ui/button";

const initialState: ManagementFormState = { status: "idle" };

type SiteOption = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
};

export function MenuBoardWallForm({
  action,
  sites,
}: {
  action: (state: ManagementFormState, payload: FormData) => Promise<ManagementFormState>;
  sites: SiteOption[];
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Add 3-TV wall</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Creates TV1 Menu Primary, TV2 Menu Secondary, and TV3 Promotions for one wall player.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Store / site</span>
          <select name="siteId" required className="h-10 min-w-64 rounded-md border border-input bg-background px-3">
            <option value="">Select site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.organizationName} — {site.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Wall name</span>
          <input name="name" required maxLength={191} placeholder="Deli 3-TV Wall" className="h-10 rounded-md border border-input bg-background px-3" />
        </label>
        <Button type="submit">Create wall</Button>
      </div>
      {state.message ? <p className={`mt-3 text-sm ${state.status === "error" ? "text-rose-300" : "text-muted-foreground"}`}>{state.message}</p> : null}
    </form>
  );
}
