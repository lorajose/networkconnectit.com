"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";

import { FieldError } from "@/components/management/field-error";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  initialManagementFormState,
  type ManagementFormState
} from "@/lib/management/form-state";

type SiteOption = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
};

type MenuBoardScreenFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  sites: SiteOption[];
};

export function MenuBoardScreenForm({
  action,
  sites
}: MenuBoardScreenFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const selectedSite = useMemo(
    () => sites.find((site) => site.id === siteId) ?? sites[0],
    [siteId, sites]
  );

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Add screen</CardTitle>
          <CardDescription>
            Register a TV/player endpoint before generating its one-time pairing code.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormMessage state={state} />

          <input
            type="hidden"
            name="organizationId"
            value={selectedSite?.organizationId ?? ""}
          />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="menuboard-site">Store / site</Label>
            <Select
              id="menuboard-site"
              name="siteId"
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.organizationName} — {site.name}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.siteId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="menuboard-name">Screen name</Label>
            <Input
              id="menuboard-name"
              name="name"
              placeholder="Screen 1 — Breakfast"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="menuboard-orientation">Orientation</Label>
            <Select
              id="menuboard-orientation"
              name="orientation"
              defaultValue="LANDSCAPE"
            >
              <option value="LANDSCAPE">Landscape</option>
              <option value="PORTRAIT">Portrait</option>
            </Select>
            <FieldError errors={state.fieldErrors?.orientation} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="menuboard-width">Width</Label>
            <Input
              id="menuboard-width"
              name="widthPx"
              type="number"
              min={320}
              max={7680}
              defaultValue={1920}
            />
            <FieldError errors={state.fieldErrors?.widthPx} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="menuboard-height">Height</Label>
            <Input
              id="menuboard-height"
              name="heightPx"
              type="number"
              min={320}
              max={7680}
              defaultValue={1080}
            />
            <FieldError errors={state.fieldErrors?.heightPx} />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <SubmitButton label="Add screen" disabled={sites.length === 0} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
