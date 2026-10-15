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

type MenuFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  sites: SiteOption[];
};

export function MenuForm({ action, sites }: MenuFormProps) {
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
          <CardTitle>Create menu</CardTitle>
          <CardDescription>
            Start a menu for one store. Prices remain draft until the publish workflow is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>

          <input
            type="hidden"
            name="organizationId"
            value={selectedSite?.organizationId ?? ""}
          />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="menu-site">Store / site</Label>
            <Select
              id="menu-site"
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
            <Label htmlFor="menu-name">Menu name</Label>
            <Input
              id="menu-name"
              name="name"
              placeholder="Main Deli Menu"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-currency">Currency</Label>
            <Input
              id="menu-currency"
              name="currency"
              defaultValue="USD"
              maxLength={3}
            />
            <FieldError errors={state.fieldErrors?.currency} />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <SubmitButton label="Create menu" disabled={sites.length === 0} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
